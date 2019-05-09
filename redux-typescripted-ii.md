# Redux TypeScripted, Part II

Back in November 2018 fellow rangler [Daniel](https://rangle.io/blog/author/daniel-figueiredo-caetano)
wrote a [blog post](https://rangle.io/blog/redux-typescripted/) about the how to get
more type safety out of Redux actions and reducers, with lazy loading added to the mix.
But we can go further and use some of the advanced TypeScript features to not only
get type safety but also remove boilerplate, and this post will show how.

By the end of this post we will have seen how a small utility library for writing boilerplate-free,
typesafe actions and reducers can work. Let us start with the end result, with our
action definitions:

```typescript
// counter.actions.ts
import {
  ActionsUnion,
  ActionTypesUnion,
  action,
  payloadAction,
  optionalPayloadAction,
  readonly
} from '../utils/action.utils';

const counterActions = readonly({
  increment: payloadAction<number>()('[counter] Increment'),
  decrement: optionalPayloadAction<number>()('[counter] Decrement'),
  reset: action('[counter] Reset')
});

export type CounterActions = ActionsUnion<typeof counterActions>;
export type CounterActionTypes = ActionTypesUnion<CounterActions>;

export default counterActions;
```

If you want to go straight to the code go [to the Github repo](https://github.com/mascarenhas/redux-typescripted-ii), but please stick for the explanations below! You can also
play with the code 
[here](https://codesandbox.io/s/github/mascarenhas/redux-typescripted-ii/tree/master/?fontsize=14).

The main idea of the library is that we can define only an object with our
action creators, and all of the type information will be encoded there.
Notice that we do not give an explicit type to `counterActions`, but will rely
on type inference and `typeof`, as its type is **very** precise!

Our library defines three functions to create typesafe, self-describing
action creators, `action`, `payloadAction`, and `optionalPayloadAction`.
Let us see how `action` works first, along with two type definitions that
it relies on:

```typescript
// action.utils.ts
type IsLiteralString<T> = T extends string
  ? (string extends T ? never : T)
  : never;

export type Action<Type, Payload = undefined, Meta = any> = undefined extends Payload
  ? { readonly type: IsLiteralString<Type>; readonly payload?: Payload; readonly meta?: Meta }
  : {
      readonly type: IsLiteralString<Type>;
      readonly payload: Payload;
      readonly meta?: Meta;
    };

export function readonly<T>(object: T): Readonly<T> {
  return object;
}

export function action<Type, Meta = any>(type: IsLiteralString<Type>) {
  return Object.assign(
    (meta?: Meta) => ({ type, meta } as Action<Type, undefined, Meta>),
    readonly({ type })
  );
}
```

The `IsLiteralString` generic type is a way of constraining action types
to be literal strings, while `Action` is a generic action type that works both
for actions that must have a payload and regular actions.

Our `action` function takes the action type and returns an action creator decorated
with a readonly `type` field. This is what lets us back the `'[counter] Reset'`
action type from `counterActions.reset.type`, so there is no need to first
put `''[counter] Reset'` as part of an enumeration, or define a constant for it.
The only place in our code where we are going to see `'[counter] Reset'` is in
the call to `action`!

The `payloadAction` function and `optionalPayloadAction` function are for actions
that have (or may have) a payload. You might have noticed the extra `()` in
`payloadAction<number>()('[counter] Increment')`, which is there to get around
a present limitation of TypeScript where type inference for generic parameters is
all or nothing:

```typescript
// action.utils.ts
export function payloadAction<Payload>() {
  return <Type, Meta = any>(type: IsLiteralString<Type>) =>
    Object.assign(
      (payload: Payload, meta?: Meta) =>
        ({ type, payload, meta } as Action<Type, Payload, Meta>),
      readonly({ type })
    );
}
```

We always want to pass the `Payload` type parameter explicitly, but `Type`
has to be inferred from what was passed as the `type` argument.

Going back to `counter.actions.ts`, notice those type definitions:

```typescript
// counter.actions.ts
export type CounterActions = ActionsUnion<typeof counterActions>;
export type CounterActionTypes = ActionTypesUnion<CounterActions>;
```

They use two of the *utility types* of our little library. The first
one, `ActionsUnion`, turns the type of an object with action creators
into a union of all the different actions they create. In this
case it will be
`Action<'[counter] Increment', number> | Action<'[counter] Decrement', number | undefined> | Action<'[counter] Reset'>`.

This union is useful for the `action` parameter of your reducer, and the `ActionsUnion`
type makes sure that any change that you make to the action creators gets propagated to
this union. But how does it work? Let us peek under the hood:

```typescript
// actions.utils.ts
export type ActionsUnion<Actions> = {
  [A in keyof Actions]:
    Actions[A] extends (...args: any[]) => Action<infer Type, infer Payload, infer Meta>
      ? Action<Type, Payload, Meta> : never
}[keyof Actions];
```

There is a lot to unpack here. The basic idea is to *map* our `Actions` object type of action
creators into an object type of *actions*, then index this object type with all our action
keys to get a union of those actions. We do the first part with the
[mapped type](https://www.typescriptlang.org/docs/handbook/advanced-types.html) between the braces,
then index it with a union of all our action keys.

In our mapping we *destructure* the type of our action creator using a
[conditional type](https://www.typescriptlang.org/docs/handbook/advanced-types.html)
and the `infer` keyword to give names to the parts of the type of our action creator.

We use a different trick to get the action types, using a conditional type
as a way to iterate over the elements of an union type, and pluck the information
that we want out of them:

```typescript
// actions.utils.ts
export type ActionTypesUnion<ActionsUnion> =
  ActionsUnion extends infer A ?
    (A extends { type: infer Type } ? Type : never) : never;
```

The `ActionsUnion extends infer A` seems like it is not
doing anything, but its purpose is to force the compiler to evaluate the generic type parameter
to get to the union we want, and might not be needed in a future version of the TypeScript
compiler.

Notice there is nothing generic about `CounterActions` and `CounterActionTypes`!
Once you pipe the type of `counterActions` through `ActionsUnion` and `ActionTypesUnion`
what comes out of the other side is are regular unions of concrete types, just
like what you would have written by hand.

Stay tuned for our next post in this series, where we will show a nicer way of writing
typesafe reducers, and how to scrap some of the boilerplate out of defining prop types
for connected React components. If you would like to use `actions.utils.ts` in your
projects go ahead, all of the code is MIT licensed!
