import { BehaviorSubject, distinctUntilChanged, from, map, Observable, scan, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";
import { commit } from "../store/commit";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadSingleBeginActionId = Symbol('LOAD_SINGLE_BEGIN_ACTION')
export const LoadSingleCompleteActionId = Symbol('LOAD_SINGLE_COMPLETE_ACTION')
export const LoadSingleFailActionId = Symbol('LOAD_SINGLE_FAIL_ACTION')

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadSingleBeginAction = IBaseAction<typeof LoadSingleBeginActionId, { itemId: string }>
type LoadSingleCompleteAction<TItem> = IBaseAction<typeof LoadSingleCompleteActionId, { item: TItem }>
type LoadSingleFailAction<TError> = IBaseAction<typeof LoadSingleFailActionId, { itemId: string, error: TError }>

export interface ILoadSingleArgs<TItem> {
    topicId: Id,
    accessor: IAccessor<TItem>,
    id: string,
    actions$: Subject<IBaseAction>,
    request: (id: string) => Promise<TItem>,
}

export const loadSingle = <TItem>({
    topicId,
    accessor,
    id,
    actions$,
    request,
}: ILoadSingleArgs<TItem>): Observable<BehaviorSubject<TItem> | null> => {
    const initialData: BehaviorSubject<TItem>[] = [];

    const initial: DataWithAction<BehaviorSubject<TItem>[], InitialAction> = {
        data: initialData,
        action: {
            topicId,
            actionId: InitialActionId,
            payload: null
        },
    }

    const reducer: Reducer<BehaviorSubject<TItem>[], IBaseAction> = (prev, action) => {
        if (isLoadSingleCompleteAction<TItem>(action) && action.topicId === topicId) {
            return commit({ updated: [action.payload.item], accessor });
        }

        return prev.data;
    }

    const result$ = actions$.pipe(
        scan(makeScanFromReducer(reducer), initial),
        distinctUntilChanged(({ data: prevData }, { data: nextData }) => prevData === nextData),
        map(({ data, action }) => data),
        map(data => data[0] || null),
    )

    const beginAction: LoadSingleBeginAction = {
        topicId,
        actionId: LoadSingleBeginActionId,
        payload: { itemId: id }
    }

    actions$.next(beginAction);

    from(request(id))
        .subscribe({
            next: (item) => {
                const endAction: LoadSingleCompleteAction<TItem> = {
                    topicId,
                    actionId: LoadSingleCompleteActionId,
                    payload: { item }
                }

                actions$.next(endAction);
            },
            error: (error) => {
                const failAction: LoadSingleFailAction<typeof error> = {
                    topicId,
                    actionId: LoadSingleFailActionId,
                    payload: { itemId: id, error }
                }

                actions$.next(failAction);
            }
        })

    return result$;
}

export const isLoadSingleBeginAction = (action: IBaseAction): action is LoadSingleBeginAction => {
    return action.actionId === LoadSingleBeginActionId
}

export const isLoadSingleCompleteAction = <TItem>(action: IBaseAction): action is LoadSingleCompleteAction<TItem> => {
    return action.actionId === LoadSingleCompleteActionId
}

export const isLoadSingleFailAction = <TItem>(action: IBaseAction): action is LoadSingleFailAction<TItem> => {
    return action.actionId === LoadSingleCompleteActionId
}