import {
  ActionsUnion,
  ActionTypesUnion,
  ActionTypesToActions
} from './action.utils';

type ReducerCase<State, ActionsUnion> = (state: State, action: ActionsUnion) => State

export type ObjectReducer<State, ActionsUnion> = {
  readonly [A in ActionTypesUnion<ActionsUnion>]: (
    state: State,
    action: ActionTypesToActions<ActionsUnion>[A]
  ) => State
};

export function createReducer<State, ActionsUnion extends { readonly type: string }>(
  initialState: State,
  cases: ObjectReducer<State, ActionsUnion>
) {
  return (state: State = initialState, action: ActionsUnion) => {
    const indexCases = cases as unknown as { [type: string]: ReducerCase<State, ActionsUnion> | undefined };
    const reducerCase = indexCases[action.type];
    if (reducerCase !== undefined) {
      return reducerCase(state, action);
    } else {
      return initialState;
    }
  };
}
