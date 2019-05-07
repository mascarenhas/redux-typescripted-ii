import { combineReducers, createStore } from "redux";

import counterReducer from "./counter.reducer";

const rootReducer = combineReducers({
  counter: counterReducer
})

export interface AppState {
  readonly counter: number;
}

export default createStore(rootReducer);
