import { BehaviorSubject, distinctUntilChanged, from, map, scan, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { DataWithAction, makeScanFromReducer, Reducer } from "../Reducer";
import { commit } from "../store/commit";

const InitialActionId = Symbol('INITIAL_ACTION')
const UpdateSingleBeginActionId = Symbol('UPDATE_SINGLE_BEGIN_ACTION');
const UpdateSingleCommitActionId = Symbol('UPDATE_SINGLE_COMMIT_ACTION');
const UpdateSingleCompleteActionId = Symbol('UPDATE_SINGLE_COMPLETE_ACTION');
const UpdateSingleFailActionId = Symbol('UPDATE_SINGLE_FAIL_ACTION');

type InitialAction = IBaseAction<typeof InitialActionId>;
type UpdateSingleBeginAction<TItem> = IBaseAction<typeof UpdateSingleBeginActionId, { changedItem: TItem }>;
type UpdateSingleCommitAction<TItem> = IBaseAction<typeof UpdateSingleCommitActionId, { changedItem: BehaviorSubject<TItem> }>;
type UpdateSingleCompleteAction<TItem> = IBaseAction<typeof UpdateSingleCompleteActionId, { updatedItem: TItem }>;
type UpdateSingleFailAction<TItem, TError> = IBaseAction<typeof UpdateSingleFailActionId, { changedItem: TItem, error: TError }>;

export interface IUpdateSingleArgs<TItem> {
    topicId: Id,
    accessor: IAccessor<TItem>,
    changedItem: TItem,
    actions$: Subject<IBaseAction>,
    request: (item: TItem) => Promise<TItem>,
}

export const updateItem = <TItem>({
    topicId,
    accessor,
    changedItem,
    actions$,
    request,
}: IUpdateSingleArgs<TItem>): void => {
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
        if (isUpdateSingleCompleteAction<TItem>(action)) {
            const result = commit({ updated: [action.payload.updatedItem], accessor });

            const commitAction: UpdateSingleCommitAction<TItem> = {
                topicId,
                actionId: UpdateSingleCommitActionId,
                payload: { changedItem: result[0] as BehaviorSubject<TItem> }
            }

            actions$.next(commitAction);

            return result
        }

        return prev.data;
    }

    const result$ = actions$.pipe(
        scan(makeScanFromReducer(reducer), initial),
        map(({ data, action }) => ({ data: data[0] || null, action })),
        distinctUntilChanged(({ data: prevData }, { data: nextData }) => prevData === nextData),
    )

    result$.subscribe();

    const beginAction: UpdateSingleBeginAction<TItem> = {
        topicId,
        actionId: UpdateSingleBeginActionId,
        payload: { changedItem }
    }

    actions$.next(beginAction);

    from(request(changedItem)).subscribe({
        next: (updatedItem) => {
            const completeAction: UpdateSingleCompleteAction<TItem> = {
                topicId,
                actionId: UpdateSingleCompleteActionId,
                payload: { updatedItem }
            }

            actions$.next(completeAction);
        },
        error: (error) => {
            const failAction: UpdateSingleFailAction<TItem, typeof error> = {
                topicId,
                actionId: UpdateSingleFailActionId,
                payload: { changedItem, error }
            }

            actions$.next(failAction);
        }
    })
}

export const isUpdateSingleBeginAction = <TItem>(action: IBaseAction): action is UpdateSingleBeginAction<TItem> => {
    return action.actionId === UpdateSingleBeginActionId
}

export const isUpdateSingleCommitAction = <TItem>(action: IBaseAction): action is UpdateSingleCommitAction<TItem> => {
    return action.actionId === UpdateSingleCommitActionId
}

export const isUpdateSingleCompleteAction = <TItem>(action: IBaseAction): action is UpdateSingleCompleteAction<TItem> => {
    return action.actionId === UpdateSingleCompleteActionId
}

export const isUpdateSingleFailAction = <TItem, TError>(action: IBaseAction): action is UpdateSingleFailAction<TItem, TError> => {
    return action.actionId === UpdateSingleFailActionId
}
