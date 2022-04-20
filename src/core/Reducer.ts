import { IBaseAction } from "./IBaseAction"

export type DataWithAction<TData, TAction extends IBaseAction> = { data: TData, action: TAction }
export type Reducer<TData, TAction extends IBaseAction> = (prev: DataWithAction<TData, TAction>, action: TAction) => TData

export const mergeReducers = <TData, TAction extends IBaseAction>(
    ...args: Reducer<TData, TAction>[]
): Reducer<TData, TAction> => {
    return args.reduce((accum, fn) => {
        return (prev, action) => {
            const result = accum(prev, action);
            return fn({ data: result, action }, action)
        };
    }, (prev, action) => prev.data)
}

export type ScanReducer<TData, TAction extends IBaseAction> = (prev: DataWithAction<TData, TAction>, action: TAction) => DataWithAction<TData, TAction>;

export const makeScanFromReducer = <TData, TAction extends IBaseAction>(reducer: Reducer<TData, TAction>): ScanReducer<TData, TAction> => {
    return (prev, action) => {
        const data = reducer(prev, action);
        return { data, action }
    }
}