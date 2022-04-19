export type Id = string | number | symbol;

export interface IBaseAction<TActionId extends Id = any, TPayload = any> {
  topicId: Id
  actionId: TActionId;
  payload: TPayload;
}
