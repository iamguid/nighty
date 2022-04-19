import { combineLatest, distinctUntilChanged, from, map, Observable, of, pairwise, reduce, scan, skipWhile, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { update } from "../mutators/update";
import { DataWithAction, Reducer } from "../Reducer";
import { isSoftDeleteSingleEndAction } from "./softDeleteSingle";
import { isUpdateSingleEndAction } from "./updateSingle";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadSingleBeginActionId = Symbol('LOAD_SINGLE_BEGIN_ACTION')
export const LoadSingleEndActionId = Symbol('LOAD_SINGLE_END_ACTION')

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadSingleBeginAction = IBaseAction<typeof LoadSingleBeginActionId, { itemId: string }>
type LoadSingleEndAction<TItem> = IBaseAction<typeof LoadSingleEndActionId, { item: TItem }>

export interface ILoadSingleArgs<TItem> {
    store: Id,
    accessor: IAccessor<TItem>,
    id: string,
    actions$: Subject<IBaseAction>,
    initialData?: TItem[],
    request: (id: string) => Promise<TItem>,
    reducer?: Reducer<TItem[], IBaseAction> | null,
}

export const loadSingle = <TItem>({
    store,
    accessor,
    id,
    actions$,
    initialData = [],
    request,
    reducer = null,
}: ILoadSingleArgs<TItem>): Observable<DataWithAction<TItem | null, IBaseAction>> => {
    const initial: DataWithAction<TItem[], InitialAction> = {
        data: initialData,
        action: {
            store,
            id: InitialActionId,
            payload: null
        },
    }

    const dataWithAction$: Observable<[TItem[], IBaseAction]> = combineLatest([
        of(initialData),
        actions$,
    ]);

    const defaultReducer: Reducer<TItem[], IBaseAction> = (prev, { data, action }) => {
        if (isLoadSingleEndAction<TItem>(action)) {
            if (accessor.getId(action.payload.item) === id) {
                return { data: update(data, action.payload.item, accessor.getId), action }
            }
        }

        if (isUpdateSingleEndAction<TItem>(action) || isSoftDeleteSingleEndAction<TItem>(action)) {
            if (accessor.getId(action.payload.updatedItem) === id) {
                return { data: update(data, action.payload.updatedItem, accessor.getId), action }
            }
        }

        return { data, action };
    }

    const result$ = dataWithAction$.pipe(
        map(([data, action]) => ({ data, action })),
        scan(reducer || defaultReducer, initial),
        map(({data, action}) => ({ data: data[0] || null, action })),
        distinctUntilChanged(({ data: prevData }, { data: nextData }) => prevData === nextData)
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