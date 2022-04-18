import { IBaseAction } from "./IBaseAction"

export type DataWithAction<TData, TAction extends IBaseAction> = { data: TData, action: TAction }
export type Reducer<TData, TAction extends IBaseAction> = (prev: DataWithAction<TData, TAction>, next: DataWithAction<TData, TAction>) => DataWithAction<TData, TAction>
