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
