export type Id = string | number | symbol;

export interface IBaseAction<TActionId extends Id = any, TPayload = any> {
  store: Id
  id: TActionId;
  payload: TPayload;
}
