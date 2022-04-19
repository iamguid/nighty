import { IBaseAction } from "./IBaseAction"
import { Mutator } from "./Mutator"

export type DataWithAction<TData, TAction extends IBaseAction> = { data: TData, action: TAction }
export type ReducerFunction<TData, TAction extends IBaseAction> = (prev: DataWithAction<TData, TAction>, next: DataWithAction<TData, TAction>) => DataWithAction<TData, TAction>
export type ReduceArray<TData, TAction extends IBaseAction> = Mutator<TData, TAction>[]

export const mergeReducers = <TData, TAction extends IBaseAction>(
    ...args: ReducerFunction<TData, TAction>[]
): ReducerFunction<TData, TAction> => {
    return args.reduce((accum, fn) => {
        return (prev, next) => {
            const result = accum(prev, next);
            return fn(prev, result)
        };
    }, (prev, next) => next)
}

export const reducerFromArray = <TData, TAction extends IBaseAction>(
    array: ReduceArray<TData, TAction>
): ReducerFunction<TData, TAction> => {
    return (prev, next) => {
        return array.reduce((accum, current) => {
            return current({ data: accum.data, action: next.action })
        }, next)
    }
}
