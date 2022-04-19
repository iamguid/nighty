import { IBaseAction } from "./IBaseAction"

export type DataWithAction<TData, TAction extends IBaseAction> = { data: TData, action: TAction }
export type Reducer<TData, TAction extends IBaseAction> = (prev: DataWithAction<TData, TAction>, next: DataWithAction<TData, TAction>) => TData

export const mergeReducers = <TData, TAction extends IBaseAction>(
    ...args: Reducer<TData, TAction>[]
): Reducer<TData, TAction> => {
    return args.reduce((accum, fn) => {
        return (prev, next) => {
            const result = accum(prev, next);
            return fn(prev, { data: result, action: next.action })
        };
    }, (prev, next) => next.data)
}

export type ScanReducer<TData, TAction extends IBaseAction> = (prev: DataWithAction<TData, TAction>, next: DataWithAction<TData, TAction>) => DataWithAction<TData, TAction>;

export const makeScanFromReducer = <TData, TAction extends IBaseAction>(reducer: Reducer<TData, TAction>): ScanReducer<TData, TAction> => {
    return (prev, next) => {
        const data = reducer(prev, next);
        return { data, action: next.action }
    }
}