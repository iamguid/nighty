import { combineLatest, distinctUntilChanged, from, map, Observable, of, pairwise, reduce, scan, skipWhile, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { append } from "../mutators/append";
import { update } from "../mutators/update";
import { DataWithAction, Reducer } from "../Reducer";
import { isAddSingleEndAction } from "./addSingle";
import { isSoftDeleteSingleEndAction } from "./softDeleteSingle";
import { isUpdateSingleEndAction } from "./updateSingle";

export const InitialActionId = Symbol('INITIAL_ACTION')
const LoadAllBeginActionId = Symbol('LOAD_ALL_BEGIN_ACTION')
const LoadAllEndActionId = Symbol('LOAD_ALL_END_ACTION')

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadAllBeginAction = IBaseAction<typeof LoadAllBeginActionId>
type LoadAllEndAction<TItem> = IBaseAction<typeof LoadAllEndActionId, { items: TItem[] }>

export interface ILoadAllArgs<TItem> {
    store: Id,
    accessor: IAccessor<TItem>,
    actions$: Subject<IBaseAction>,
    initialData?: TItem[],
    request: () => Promise<TItem[]>,
    reducer?: Reducer<TItem[], IBaseAction> | null,
}

export const loadAll = <TItem>({
    store,
    accessor,
    actions$,
    initialData = [],
    request,
    reducer = null,
}: ILoadAllArgs<TItem>): Observable<DataWithAction<TItem[], IBaseAction>> => {
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

    const defaultReducer: Reducer<TItem[], IBaseAction> = (prev, { data, action }) => {
        if (isAddSingleEndAction<TItem>(action)) {
            return { data: append(data, action.payload.updatedItem), action }
        }

        if (isLoadAllEndAction<TItem>(action)) {
            return { data: action.payload.items, action }
        }

        if (isUpdateSingleEndAction<TItem>(action) || isSoftDeleteSingleEndAction<TItem>(action)) {
            return { data: update(data, action.payload.updatedItem, accessor.getId), action }
        }

        return { data, action };
    }

    const result$ = dataWithAction$.pipe(
        map(([data, action]) => ({ data, action })),
        scan(reducer || defaultReducer, initial),
        distinctUntilChanged((prev, next) => prev.data === next.data),
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