import {
  ActionsUnion,
  ActionTypesUnion,
  ActionTypesToActions
} from './action.utils';

type ReducerCase<State, Actions> = (state: State, action: ActionsUnion<Actions>) => State

export type ObjectReducer<State, Actions> = {
  readonly [A in ActionTypesUnion<Actions>]: (
    state: State,
    action: ActionTypesToActions<Actions>[A]
  ) => State
};

export function createReducer<State, Actions>(
  initialState: State,
  cases: ObjectReducer<State, Actions>
) {
  return (state: State = initialState, action: ActionsUnion<Actions>) => {
    const indexCases = cases as unknown as { [type: string]: ReducerCase<State, Actions> | undefined };
    const reducerCase = indexCases[(action as { readonly type: string }).type];
    if (reducerCase !== undefined) {
      return reducerCase(state, action);
    } else {
      return initialState;
    }
  };
}
