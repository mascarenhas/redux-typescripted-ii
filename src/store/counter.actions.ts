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