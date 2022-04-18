import { combineLatest, from, map, Observable, of, pairwise, reduce, scan, skipWhile, Subject } from "rxjs";
import { IBaseAction, Id } from "../IBaseAction";
import { DataWithAction, Reducer } from "../Reducer";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadSingleBeginActionId = Symbol('LOAD_SINGLE_BEGIN_ACTION')
export const LoadSingleEndActionId = Symbol('LOAD_SINGLE_END_ACTION')

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadSingleBeginAction = IBaseAction<typeof LoadSingleBeginActionId, { itemId: string }>
type LoadSingleEndAction<TItem> = IBaseAction<typeof LoadSingleEndActionId, { item: TItem }>

export interface ILoadSingleArgs<TItem> {
    store: Id,
    id: string,
    actions$: Subject<IBaseAction>,
    initialData?: TItem | null,
    request: (id: string) => Promise<TItem>,
    reducer: Reducer<TItem | null, IBaseAction>,
}

export const loadSingle = <TItem>({
    store,
    id,
    actions$,
    initialData = null,
    request,
    reducer,
}: ILoadSingleArgs<TItem>) => {
    const initial: DataWithAction<TItem | null, InitialAction> = {
        data: initialData,
        action: {
            store,
            id: InitialActionId,
            payload: null
        },
    }

    const dataWithAction$: Observable<[TItem | null, IBaseAction]> = combineLatest([
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

    const beginAction: LoadSingleBeginAction = {
        store,
        id: LoadSingleBeginActionId,
        payload: { itemId: id }
    }

    actions$.next(beginAction);

    from(request(id))
        .subscribe((item) => {
            const endAction: LoadSingleEndAction<TItem> = {
                store,
                id: LoadSingleEndActionId,
                payload: { item }
            }

            actions$.next(endAction);
        })

    return result$;
}

export const isLoadSingleBeginAction = (action: IBaseAction): action is LoadSingleBeginAction => {
    return action.id === LoadSingleBeginActionId
}

export const isLoadSingleEndAction = <TItem>(action: IBaseAction): action is LoadSingleEndAction<TItem> => {
    return action.id === LoadSingleEndActionId
}