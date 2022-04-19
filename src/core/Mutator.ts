import { IBaseAction } from "./IBaseAction";
import { DataWithAction } from "./Reducer";

export type Mutator<TData, TAction extends IBaseAction> = (args: DataWithAction<TData, TAction>) => DataWithAction<TData, TAction>;
