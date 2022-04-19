import { combineLatest, distinctUntilChanged, filter, from, map, Observable, of, scan, skipWhile, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { apply } from "../mutators/apply";
import { update } from "../mutators/update";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";
import { isAddSingleEndAction } from "./addSingle";
import { isLoadAllEndAction } from "./loadAll";
import { isLoadPageEndAction } from "./loadPaginatable";
import { isLoadSingleEndAction } from "./loadSingle";
import { isSoftDeleteSingleEndAction } from "./softDeleteSingle";
import { isUpdateSingleEndAction } from "./updateSingle";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadBatchBeginActionId = Symbol('LOAD_BATCH_BEGIN_ACTION')
export const LoadBatchEndActionId = Symbol('LOAD_BATCH_END_ACTION')

export type InitialAction = IBaseAction<typeof InitialActionId>
export type LoadBatchBeginAction = IBaseAction<typeof LoadBatchBeginActionId>
export type LoadBatchEndAction<TItem> = IBaseAction<typeof LoadBatchEndActionId, { items: TItem[] }>

export interface ILoadBatchArgs<TItem> {
    ids: string[],
    topicId: Id,
    accessor: IAccessor<TItem>,
    actions$: Subject<IBaseAction>,
    initialData?: TItem[],
    request: (ids: string[]) => Promise<TItem[]>,
}

export const loadBatch = <TItem>({
    topicId,
    ids,
    accessor,
    actions$,
    initialData = [],
    request,
}: ILoadBatchArgs<TItem>): Observable<DataWithAction<TItem[], IBaseAction>> => {
    const initial: DataWithAction<TItem[], InitialAction> = {
        data: initialData,
        action: {
            topicId: topicId,
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
            return update(data, action.payload.item, accessor.getId);
        }

        if (isLoadBatchEndAction<TItem>(action)) {
            return apply(data, action.payload.items, accessor.getId);
        }

        if (
            isLoadAllEndAction<TItem>(action) ||
            isLoadPageEndAction<TItem>(action)
        ) {
            return update(data, action.payload.items, accessor.getId);
        }

        if (
            isAddSingleEndAction<TItem>(action) || 
            isUpdateSingleEndAction<TItem>(action) || 
            isSoftDeleteSingleEndAction<TItem>(action)
        ) {
            return update(data, action.payload.updatedItem, accessor.getId);
        }

        return data
    }

    const result$ = dataWithAction$.pipe(
        map(([data, action]) => ({ data, action })),
        scan(makeScanFromReducer(reducer), initial),
        distinctUntilChanged((prev, next) => prev.data === next.data),
    )

    const beginAction: LoadBatchBeginAction = {
        topicId,
        actionId: LoadBatchBeginActionId,
        payload: null,
    }

    actions$.next(beginAction);

    from(request(ids))
        .subscribe((items) => {
            const endAction: LoadBatchEndAction<TItem> = {
                topicId,
                actionId: LoadBatchEndActionId,
                payload: { items },
            }

            actions$.next(endAction);
        })

    return result$;
}

export const isLoadBatchBeginAction = (action: IBaseAction): action is LoadBatchBeginAction => {
    return action.actionId === LoadBatchBeginActionId
}

export const isLoadBatchEndAction = <TItem>(action: IBaseAction): action is LoadBatchEndAction<TItem> => {
    return action.actionId === LoadBatchEndActionId
}
