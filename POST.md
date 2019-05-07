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
export type CounterActionTypes = ActionTypesUnion<typeof counterActions>;

export default counterActions;
```

If you want to go straight to the code go [here](https://github.com/mascarenhas/redux-typescripted-ii),
but please stick for the explanations below!

## Typesafe actions without the boilerplate

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
export type CounterActionTypes = ActionTypesUnion<typeof counterActions>;
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
    Actions[A] extends (...args: infer Args) => Action<infer Type, infer Payload, infer Meta>
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

We do a similar trick to get the union of action types, just spread out over two
utility types as the intermediate result might be useful in other contexts:

```typescript
// actions.utils.ts
export type ActionTypes<Actions> = {
  readonly [A in keyof Actions]: Actions[A] extends
   (...args: infer Args) => Action<infer Type, infer Payload, infer Meta>
    ? IsLiteralString<Type>
    : never
};

export type ActionTypesUnion<Actions> = ActionTypes<Actions>[keyof Actions];
```

Notice there is nothing generic about `CounterActions` and `CounterActionTypes`!
Once you pipe the type of `counterActions` through `ActionsUnion` and `ActionTypesUnion`
what comes out of the other side is are regular unions of concrete types, just
like what you would have written by hand.

## Typesafe object reducers

We can use those types in a regular reducer for our counter:

```typescript
function counterReducer(state: CounterState = initialState, action: CounterActions) {
  switch (action.type) {
    case counterActions.decrement.type:
      return state - (action.payload ? action.payload : 1);
    case counterActions.increment.type:
      return state + action.payload;
    case counterActions.reset.type:
      return 0;
    default:
      ensureNever(action);
      return state;
  }
}
```

Notice how we use the type constants embedded in our action creators, and how the type
`CounterActions` let us narrow the payload to the one for that specific action type.

But we can go one step further and define another utility function to create an
*object reducer*, where we have a specific function for each reducer case, keyed
to the reducer type:

```typescript
// counter.reducer.ts
import { createReducer } from '../utils/reducer.utils';
import counterActions from './counter.actions';

export type CounterState = number;

const initialState = 0;

export default createReducer<CounterState, typeof counterActions>(initialState, {
  [counterActions.increment.type]: (state, action) => state + action.payload,
  [counterActions.decrement.type]:
    (state, action) => state - (action.payload ? action.payload : 1),
  [counterActions.reset.type]: () => initialState
});
```

The `createReducer` function provides the same checking that we are handling all
cases that we had in the regular reducer, but now we rely on type inference
to narrow the type of our `action` parameters to the specific action that each case
is handling.

To get the compiler to check that our reducer case object is handling all cases
we use a trick to turn our object type of action creators into an object type
where the keys are action types and the values are actions:

```typescript
// actions.utils.ts
export type ActionTypesToActions<Actions> = {
  readonly [Type in ActionTypesUnion<Actions>]:
    ActionsUnion<Actions> extends infer A ?
      (A extends Action<Type, infer P, infer M> ? Action<Type, P, M> : never) : never
};
```

We get the keys of the object type we are building from `ActionTypesUnion`, but for
the values we *filter* the `ActionsUnion` type using a conditional type. Union types
distribute over a conditional, so a conditional type can act both as `map` and `filter`
for union types. The `ActionsUnion<Actions> extends infer A` seems like it is not
doing anything, but its purpose is to force the compiler to evaluate the generic type
to get to the union we want, and might not be needed in a future version of the TypeScript
compiler.

## Dispatch props

But wait, there is more! We can have yet another utility type so we can get nice
types for the dispatch props of `mapDispatchToProps` out of our action creator object,
so we can also write our connected React components with less boilerplate:

```tsx
// Counter.tsx
import React from 'react';
import { connect, MapStateToProps, MapDispatchToProps } from 'react-redux';

import { AppState } from './store';
import counterActions from './store/counter.actions';
import { ActionProps } from './utils/action.utils';

const mapDispatchToProps: MapDispatchToProps<
  ActionProps<typeof counterActions, 'increment' | 'decrement' | 'reset'>,
  {}
> = {
  increment: counterActions.increment,
  decrement: counterActions.decrement,
  reset: counterActions.reset
};

const mapStateToProps = (state: AppState) => ({ value: state.counter });

type CounterProps = ReturnType<typeof mapStateToProps> & typeof mapDispatchToProps;

const Counter = ({ value, increment, decrement, reset }: CounterProps) => (
  <div>
    <p>{value}</p>
    <button onClick={() => increment(1)}>Increment</button>
    <button onClick={() => decrement()}>Decrement</button>
    <button onClick={() => reset()}>Reset</button>
  </div>
);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Counter);
```

Notice how we have no duplicate declarations, and let the compiler work for us.
All of the props we destructure for use inside `Counter` have the correct types!
The `increment` prop needs a `number` argument for its payload, while this is
optional for `decrement`.

If we go back to our `counter.actions.ts` file and
change the payload type for one of our actions the changes propagate without
having to redeclare anything. Try it! Change `decrement` from `optionalPayloadAction`
to `payloadAction`, and watch the compiler complain that we are not passing
a required numeric argument to the `decrement` prop. Or change the payload type
of `increment` to `string`, and see the compiler complain about the `increment`
prop and about the code for the reducer.

The key here is the `ActionProps` utility type,
which lets us get dispatch props from a subset of our actions:

```typescript
// actions.utils.ts
export type ActionProps<Actions, Picked extends keyof Actions = keyof Actions> = {
  [K in Picked]: Actions[K] extends (...args: infer A) => infer R ?
    (...args: A) => void : never
};
```

This uses all of the tricks with mapped and conditional types that we have seen earlier.
We also use an intersection type to build our `CounterProps` type from those dispatch
props and the state props (the `ReturnType` is a nifty built-in utility type that TypeScript
has which lets us get the return type of a function type).

## Wrapping up

I hope you have enjoyed this ride through the some of the advanced features that
the TypeScript compiler offers, and how we can use them to scrap away the boilerplate
of Redux without sacrificing type-safety or good coding standards.

All of the code [here](https://github.com/mascarenhas/redux-typescripted-ii) is MIT
licensed, so feel free to use `actions.utils.ts` and `reducer.utils.ts` in your code!
I will be releasing those as a library to npm soon, so star the repo if you want to get
updates. Thanks for reading!