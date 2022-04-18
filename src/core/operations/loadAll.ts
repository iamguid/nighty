import { combineLatest, from, map, Observable, of, pairwise, reduce, scan, skipWhile, Subject } from "rxjs";
import { IBaseAction } from "../IBaseAction";
import { DataWithAction, Reducer } from "../Reducer";

export interface ILoadAllArgs<TItem> {
    actions$: Subject<IBaseAction>,
    initialData: TItem[],
    initialAction: IBaseAction,
    beginAction: (() => IBaseAction) | IBaseAction,
    endAction: ((items: TItem[]) => IBaseAction) | IBaseAction,
    request: () => Promise<TItem[]>,
    reducer: Reducer<TItem[], IBaseAction>,
}

export const loadAll = <TItem>({
    actions$,
    initialData,
    initialAction,
    beginAction,
    endAction,
    request,
    reducer,
}: ILoadAllArgs<TItem>) => {
    const initial: DataWithAction<TItem[], IBaseAction> = {
        data: initialData,
        action: initialAction,
    }

    const dataWithAction$: Observable<DataWithAction<TItem[], IBaseAction>> = combineLatest({
        data: of(initialData),
        action: actions$,
    });

    const reducer$ = dataWithAction$.pipe(
        scan(reducer, initial),
        pairwise(),
        skipWhile(([prev, next]) => prev.data === next.data),
        map(([prev, next]) => next.data),
    )

    if (typeof beginAction === 'function') {
        actions$.next(beginAction());
    } else {
        actions$.next(beginAction);
    }

    from(request())
        .subscribe((items) => {
            if (typeof endAction === 'function') {
                actions$.next(endAction(items));
            } else {
                actions$.next(endAction);
            }
        })

    return reducer$;
}