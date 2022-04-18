import { combineLatest, from, map, Observable, of, pairwise, reduce, scan, skipWhile, Subject } from "rxjs";
import { IBaseAction, Id } from "../IBaseAction";
import { DataWithAction, Reducer } from "../Reducer";

export const InitialActionId = Symbol('INITIAL_ACTION')
const LoadAllBeginActionId = Symbol('LOAD_ALL_BEGIN_ACTION')
const LoadAllEndActionId = Symbol('LOAD_ALL_END_ACTION')

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadAllBeginAction = IBaseAction<typeof LoadAllBeginActionId>
type LoadAllEndAction<TItem> = IBaseAction<typeof LoadAllEndActionId, { items: TItem[] }>

export interface ILoadAllArgs<TItem> {
    store: Id,
    actions$: Subject<IBaseAction>,
    initialData?: TItem[],
    request: () => Promise<TItem[]>,
    reducer: Reducer<TItem[], IBaseAction>,
}

export const loadAll = <TItem>({
    store,
    actions$,
    initialData = [],
    request,
    reducer,
}: ILoadAllArgs<TItem>) => {
    const initial: DataWithAction<TItem[], IBaseAction> = {
        data: initialData,
        action: {
            store,
            id: InitialActionId,
            payload: null,
        },
    }

    const dataWithAction$: Observable<[TItem[], IBaseAction]> = combineLatest([
        of(initialData),
        actions$,
    ]);

    const result$ = dataWithAction$.pipe(
        map(([data, action]) => ({ data, action })),
        scan(reducer, initial),
        pairwise(),
        skipWhile(([prev, next]) => prev.data === next.data),
        map(([prev, next]) => next.data),
    )


    const beginAction: LoadAllBeginAction = {
        store,
        id: LoadAllBeginActionId,
        payload: null,
    }

    actions$.next(beginAction);

    from(request())
        .subscribe((items) => {
            const endAction: LoadAllEndAction<TItem> = {
                store,
                id: LoadAllEndActionId,
                payload: { items },
            }

            actions$.next(endAction);
        })

    return result$;
}

export const isLoadAllBeginAction = (action: IBaseAction): action is LoadAllBeginAction => {
    return action.id === LoadAllBeginActionId
}

export const isLoadAllEndAction = <TItem>(action: IBaseAction): action is LoadAllEndAction<TItem> => {
    return action.id === LoadAllEndActionId
}