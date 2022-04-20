import { distinctUntilChanged, from, map, Observable, scan, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { commit } from "../store/commit";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";

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
    request: (ids: string[]) => Promise<TItem[]>,
}

export const loadBatch = <TItem>({
    topicId,
    ids,
    accessor,
    actions$,
    request,
}: ILoadBatchArgs<TItem>): Observable<Subject<TItem>[]> => {
    const initialData: Subject<TItem>[] = [];

    const initial: DataWithAction<Subject<TItem>[], InitialAction> = {
        data: initialData,
        action: {
            topicId: topicId,
            actionId: InitialActionId,
            payload: null,
        },
    }

    const reducer: Reducer<Subject<TItem>[], IBaseAction> = (prev, action) => {
        if (isLoadBatchEndAction<TItem>(action) && action.topicId === topicId) {
            return commit({ updated: action.payload.items, accessor });
        }

        return prev.data
    }

    const result$ = actions$.pipe(
        scan(makeScanFromReducer(reducer), initial),
        distinctUntilChanged((prev, next) => prev.data === next.data),
        map(({ data, action }) => data),
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
