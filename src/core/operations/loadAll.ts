import { BehaviorSubject, distinctUntilChanged, from, map, Observable, scan, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { commit } from "../store/commit";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";
import { isAddSingleCommitAction } from "./addSingle";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadAllBeginActionId = Symbol('LOAD_ALL_BEGIN_ACTION')
export const LoadAllCompleteActionId = Symbol('LOAD_ALL_COMPLETE_ACTION')
export const LoadAllFailActionId = Symbol('LOAD_ALL_FAIL_ACTION')

export type InitialAction = IBaseAction<typeof InitialActionId>
export type LoadAllBeginAction = IBaseAction<typeof LoadAllBeginActionId>
export type LoadAllCompleteAction<TItem> = IBaseAction<typeof LoadAllCompleteActionId, { items: TItem[] }>
export type LoadAllFailAction<TError> = IBaseAction<typeof LoadAllFailActionId, { error: TError }>

export interface ILoadAllArgs<TItem> {
    topicId: Id,
    accessor: IAccessor<TItem>,
    actions$: Subject<IBaseAction>,
    request: () => Promise<TItem[]>,
}

export const loadAll = <TItem>({
    topicId,
    accessor,
    actions$,
    request,
}: ILoadAllArgs<TItem>): Observable<Observable<TItem>[]> => {
    const initialData: BehaviorSubject<TItem>[] = [];

    const initial: DataWithAction<BehaviorSubject<TItem>[], InitialAction> = {
        data: initialData,
        action: {
            topicId,
            actionId: InitialActionId,
            payload: null,
        },
    }

    const reducer: Reducer<BehaviorSubject<TItem>[], IBaseAction> = (prev, action) => {
        if (isLoadAllCompleteAction<TItem>(action)) {
            return commit({ updated: action.payload.items, accessor });
        }

        if (isAddSingleCommitAction<TItem>(action)) {
            return [ ...prev.data, action.payload.updatedItem ];
        }

        return prev.data
    }

    const result$ = actions$.pipe(
        scan(makeScanFromReducer(reducer), initial),
        distinctUntilChanged((prev, next) => prev.data === next.data),
        map(({ data, action }) => data),
    )

    const beginAction: LoadAllBeginAction = {
        topicId,
        actionId: LoadAllBeginActionId,
        payload: null,
    }

    actions$.next(beginAction);

    from(request())
        .subscribe({
            next: (items) => {
                const endAction: LoadAllCompleteAction<TItem> = {
                    topicId,
                    actionId: LoadAllCompleteActionId,
                    payload: { items },
                }

                actions$.next(endAction);
            },
            error: (error) => {
                const failAction: LoadAllFailAction<typeof error> = {
                    topicId,
                    actionId: LoadAllFailActionId,
                    payload: { error },
                }

                actions$.next(failAction);
            },
        })

    return result$;
}

export const isLoadAllBeginAction = (action: IBaseAction): action is LoadAllBeginAction => {
    return action.actionId === LoadAllBeginActionId
}

export const isLoadAllCompleteAction = <TItem>(action: IBaseAction): action is LoadAllCompleteAction<TItem> => {
    return action.actionId === LoadAllCompleteActionId
}

export const isLoadAllFailAction = <TItem>(action: IBaseAction): action is LoadAllFailAction<TItem> => {
    return action.actionId === LoadAllFailActionId
}
