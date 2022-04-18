export type ActionId = string | number | symbol;

export interface IBaseAction<TId extends ActionId = any, TPayload = any> {
  id: TId;
  payload: TPayload;
}
