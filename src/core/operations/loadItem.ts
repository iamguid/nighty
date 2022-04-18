import { combineLatest, from, map, Observable, of, pairwise, reduce, scan, skipWhile, Subject } from "rxjs";
import { IBaseAction } from "../IBaseAction";
import { DataWithAction, Reducer } from "../Reducer";

export interface ILoadItemArgs<TItem> {
    id: string,
    actions$: Subject<IBaseAction>,
    initialData: TItem | null,
    initialAction: IBaseAction,
    beginAction: (() => IBaseAction) | IBaseAction,
    endAction: ((item: TItem) => IBaseAction) | IBaseAction,
    request: (id: string) => Promise<TItem>,
    reducer: Reducer<TItem | null, IBaseAction>,
}

export const loadItem = <TItem>({
    id,
    actions$,
    initialData,
    initialAction,
    beginAction,
    endAction,
    request,
    reducer,
}: ILoadItemArgs<TItem>) => {
    const initial: DataWithAction<TItem | null, IBaseAction> = {
        data: initialData,
        action: initialAction,
    }

    const dataWithAction$: Observable<DataWithAction<TItem | null, IBaseAction>> = combineLatest({
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

    from(request(id))
        .subscribe((item) => {
            if (typeof endAction === 'function') {
                actions$.next(endAction(item));
            } else {
                actions$.next(endAction);
            }
        })

    return reducer$;
}