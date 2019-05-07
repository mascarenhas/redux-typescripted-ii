import React from 'react';
import { connect, MapDispatchToProps } from 'react-redux';

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
