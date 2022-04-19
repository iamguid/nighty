import { combineLatest, distinctUntilChanged, from, map, Observable, of, scan, skipWhile, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { apply } from "../mutators/apply";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";
import { isAddSingleEndAction } from "./addSingle";
import { isLoadBatchEndAction } from "./loadBatch";
import { isLoadPageEndAction } from "./loadPaginatable";
import { isLoadSingleEndAction } from "./loadSingle";
import { isSoftDeleteSingleEndAction } from "./softDeleteSingle";
import { isUpdateSingleEndAction } from "./updateSingle";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadAllBeginActionId = Symbol('LOAD_ALL_BEGIN_ACTION')
export const LoadAllEndActionId = Symbol('LOAD_ALL_END_ACTION')

export type InitialAction = IBaseAction<typeof InitialActionId>
export type LoadAllBeginAction = IBaseAction<typeof LoadAllBeginActionId>
export type LoadAllEndAction<TItem> = IBaseAction<typeof LoadAllEndActionId, { items: TItem[] }>

export interface ILoadAllArgs<TItem> {
    topicId: Id,
    accessor: IAccessor<TItem>,
    actions$: Subject<IBaseAction>,
    initialData?: TItem[],
    request: () => Promise<TItem[]>,
}

export const loadAll = <TItem>({
    topicId,
    accessor,
    actions$,
    initialData = [],
    request,
}: ILoadAllArgs<TItem>): Observable<DataWithAction<TItem[], IBaseAction>> => {
    const initial: DataWithAction<TItem[], InitialAction> = {
        data: initialData,
        action: {
            topicId,
            actionId: InitialActionId,
            payload: null,
        },
    }

    const dataWithAction$: Observable<[TItem[], IBaseAction]> = combineLatest([
        of(initialData),
        actions$,
    ]);

    const reducer: Reducer<TItem[], IBaseAction> = (prev, { data, action }) => {
        if (isLoadSingleEndAction<TItem>(action)) {
            return apply(data, action.payload.item, accessor.getId);
        }

        if (
            isLoadAllEndAction<TItem>(action) ||
            isLoadBatchEndAction<TItem>(action) || 
            isLoadPageEndAction<TItem>(action)
        ) {
            return apply(data, action.payload.items, accessor.getId);
        }

        if (
            isAddSingleEndAction<TItem>(action) || 
            isUpdateSingleEndAction<TItem>(action) || 
            isSoftDeleteSingleEndAction<TItem>(action)
        ) {
            return apply(data, action.payload.updatedItem, accessor.getId);
        }

        return data
    }

    const result$ = dataWithAction$.pipe(
        map(([data, action]) => ({ data, action })),
        scan(makeScanFromReducer(reducer), initial),
        distinctUntilChanged((prev, next) => prev.data === next.data),
    )

    const beginAction: LoadAllBeginAction = {
        topicId,
        actionId: LoadAllBeginActionId,
        payload: null,
    }

    actions$.next(beginAction);

    from(request())
        .subscribe((items) => {
            const endAction: LoadAllEndAction<TItem> = {
                topicId,
                actionId: LoadAllEndActionId,
                payload: { items },
            }

            actions$.next(endAction);
        })

    return result$;
}

export const isLoadAllBeginAction = (action: IBaseAction): action is LoadAllBeginAction => {
    return action.actionId === LoadAllBeginActionId
}

export const isLoadAllEndAction = <TItem>(action: IBaseAction): action is LoadAllEndAction<TItem> => {
    return action.actionId === LoadAllEndActionId
}
