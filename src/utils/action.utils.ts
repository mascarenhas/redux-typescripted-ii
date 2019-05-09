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

export function payloadAction<Payload>() {
  return <Type, Meta = any>(type: IsLiteralString<Type>) =>
    Object.assign(
      (payload: Payload, meta?: Meta) => 
        ({ type, payload, meta } as Action<Type, Payload, Meta>),
      readonly({ type })
    );
}

export function optionalPayloadAction<Payload>() {
  return <Type, Meta = any>(type: IsLiteralString<Type>) =>
    Object.assign(
      (payload?: Payload, meta?: Meta) => {
        if (payload === undefined && meta === undefined) {
          return { type } as Action<Type, Payload | undefined, Meta>;          
        } else if (payload === undefined) {
          return { type, meta } as Action<Type, Payload | undefined, Meta>;          
        } else if (meta === undefined) {
          return { type, payload } as Action<Type, Payload | undefined, Meta>;          
        } else {
          return { type, payload, meta } as Action<Type, Payload | undefined, Meta>;          
        }
      },
      readonly({ type })
    );
}

export type ActionsUnion<Actions> = {
  [A in keyof Actions]: Actions[A] extends (...args: any[]) => Action<infer Type, infer Payload, infer Meta>
    ? Action<Type, Payload, Meta>
    : never
}[keyof Actions];

export type ActionTypes<Actions> = {
  readonly [A in keyof Actions]: Actions[A] extends
   (...args: any[]) => { type: infer Type }
    ? IsLiteralString<Type>
    : never
};

export type ActionTypesUnion<ActionsUnion> = 
  ActionsUnion extends infer A ? 
    (A extends { type: infer Type } ? Type : never) : never;

export type ActionTypesToActions<ActionsUnion> = {
  readonly [Type in ActionTypesUnion<ActionsUnion>]: 
    ActionsUnion extends infer A ?
      (A extends Action<Type, infer P, infer M> ? Action<Type, P, M> : never) : never
};

export type ActionProps<Actions, Picked extends keyof Actions = keyof Actions> = {
  [K in Picked]: Actions[K] extends (...args: infer A) => infer R ?
    (...args: A) => void : never
};

export const ensureNever = (action: never) => action;

export type PickActions<ActionsUnion, ActionTypes extends string> =
  ActionsUnion extends infer A ?
    (A extends { type: infer Type } ? (Type extends ActionTypes ? A : never) : never) : never;

export type OmitActions<ActionsUnion, ActionTypes extends string> =
  ActionsUnion extends infer A ?
    (A extends { type: infer Type } ? (Type extends ActionTypes ? never : A) : never) : never;