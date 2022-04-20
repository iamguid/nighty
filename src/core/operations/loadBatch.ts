import { BehaviorSubject, distinctUntilChanged, from, map, Observable, scan, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { commit } from "../store/commit";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadBatchBeginActionId = Symbol('LOAD_BATCH_BEGIN_ACTION')
export const LoadBatchCompleteActionId = Symbol('LOAD_BATCH_COMPLETE_ACTION')
export const LoadBatchFailActionId = Symbol('LOAD_BATCH_FAIL_ACTION')

export type InitialAction = IBaseAction<typeof InitialActionId>
export type LoadBatchBeginAction = IBaseAction<typeof LoadBatchBeginActionId>
export type LoadBatchCompleteAction<TItem> = IBaseAction<typeof LoadBatchCompleteActionId, { items: TItem[] }>
export type LoadBatchFailAction<TError> = IBaseAction<typeof LoadBatchFailActionId, { error: TError }>

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
}: ILoadBatchArgs<TItem>): Observable<BehaviorSubject<TItem>[]> => {
    const initialData: BehaviorSubject<TItem>[] = [];

    const initial: DataWithAction<BehaviorSubject<TItem>[], InitialAction> = {
        data: initialData,
        action: {
            topicId: topicId,
            actionId: InitialActionId,
            payload: null,
        },
    }

    const reducer: Reducer<BehaviorSubject<TItem>[], IBaseAction> = (prev, action) => {
        if (isLoadBatchCompleteAction<TItem>(action) && action.topicId === topicId) {
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
        .subscribe({
            next: (items) => {
                const endAction: LoadBatchCompleteAction<TItem> = {
                    topicId,
                    actionId: LoadBatchCompleteActionId,
                    payload: { items },
                }

                actions$.next(endAction);
            },
            error: (error) => {
                const failAction: LoadBatchFailAction<typeof error> = {
                    topicId,
                    actionId: LoadBatchFailActionId,
                    payload: { error },
                }

                actions$.next(failAction);
            }
        })

    return result$;
}

export const isLoadBatchBeginAction = (action: IBaseAction): action is LoadBatchBeginAction => {
    return action.actionId === LoadBatchBeginActionId
}

export const isLoadBatchCompleteAction = <TItem>(action: IBaseAction): action is LoadBatchCompleteAction<TItem> => {
    return action.actionId === LoadBatchCompleteActionId
}

export const isLoadBatchFailAction = <TItem>(action: IBaseAction): action is LoadBatchFailAction<TItem> => {
    return action.actionId === LoadBatchFailActionId
}
