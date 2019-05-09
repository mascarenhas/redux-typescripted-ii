# Redux TypeScripted, Part III

In our [last post](redux-typescripted-ii.md) of this series we saw how to
write typesafe Redux actions without the boilerplate, keeping our action
modules nice and [DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself).
In this post, we will see how we can extend that to reducers, and to React
connected components.

As in the last post, you can get the full source code 
[on the Github repo](https://github.com/mascarenhas/redux-typescripted-ii),
and also play with it
[here](https://codesandbox.io/s/github/mascarenhas/redux-typescripted-ii/tree/master/?fontsize=14).

Jogging your memory, we have a `counter.actions.ts` that defines our action creators
in an `counterActions` object and then uses the *utility types* in `actions.utils.ts`
to generate a `CounterActions` type with the union of all the action types we have defined.

We can easily use `counterActions` and `CounterActions` to define a regular, switch-based reducer:

```typescript
// counter.reducer.ts
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
import counterActions, { CounterActions } from './counter.actions';

export type CounterState = number;

const initialState = 0;

export default createReducer<CounterState, CounterActions>(initialState, {
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
export type ActionTypesToActions<ActionsUnion> = {
  readonly [Type in ActionTypesUnion<ActionsUnion>]:
    ActionsUnion extends infer A ?
      (A extends Action<Type, infer P, infer M> ? Action<Type, P, M> : never) : never
};
```

We get the keys of the object type we are building from `ActionTypesUnion`, but for
the values we *filter* the `ActionsUnion` type using a conditional type. using the
same trick that we used in the previous post for `ActionTypesUnion`.

What if we don't want to handle the full set of `CounterActions` in our
reducer, or want to handle other actions too? In the first case, just pick
the action types you want or omit the ones you do not want, like this:

```typescript
// pick only the reset and increment actions
type ReducerActions = PickActions<CounterActions,
  typeof counterActions.reset.type | typeof counterActions.increment.type>;
// pick all except reset and increment actions
type ReducerActions = OmitActions<CounterActions,
  typeof counterActions.reset.type | typeof counterActions.increment.type>;
```

In the second case, just make a union of whatever action types you want, and
`createReducer` you make the compiler guarantee that you are handling all of them
in your reducer cases.

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

I hope you have enjoyed this ride through the some of the advanced features that
the TypeScript compiler offers, and how we can use them to scrap away the boilerplate
of Redux without sacrificing type-safety or good coding standards.

All of the code [here](https://github.com/mascarenhas/redux-typescripted-ii) is MIT
licensed, so feel free to use `actions.utils.ts` and `reducer.utils.ts` in your code!
I will be releasing those as a library to npm soon, so star the repo if you want to get
updates. Thanks for reading!