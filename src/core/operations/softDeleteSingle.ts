import { BehaviorSubject, combineLatest, distinctUntilChanged, from, map, Observable, of, scan, share, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { retryWithDelay } from "../operators/retryWithDelay";
import { DataWithAction, makeScanFromReducer, Reducer } from "../Reducer";
import { commit } from "../store/commit";

const InitialActionId = Symbol('INITIAL_ACTION')
const SoftDeleteSingleBeginActionId = Symbol('SOFT_DELETE_SINGLE_BEGIN_ACTION');
const SoftDeleteSingleSuccessActionId = Symbol('SOFT_DELETE_SINGLE_SUCCESS_ACTION');
const SoftDeleteSingleCommitActionId = Symbol('SOFT_DELETE_SINGLE_COMMIT_ACTION');
const SoftDeleteSingleFailActionId = Symbol('SOFT_DELETE_SINGLE_FAIL_ACTION');

type InitialAction = IBaseAction<typeof InitialActionId>;
type SoftDeleteSingleBeginAction = IBaseAction<typeof SoftDeleteSingleBeginActionId, { itemId: string }>
type SoftDeleteSingleSuccessAction<TItem> = IBaseAction<typeof SoftDeleteSingleSuccessActionId, { updatedItem: TItem }>
type SoftDeleteSingleCommitAction<TItem> = IBaseAction<typeof SoftDeleteSingleCommitActionId, { updatedItem: BehaviorSubject<TItem> }>
type SoftDeleteSingleFailAction<TError> = IBaseAction<typeof SoftDeleteSingleFailActionId, { itemId: string, error: TError }>

export interface ISoftDeleteItemArgs<TItem> {
    topicId: Id,
    accessor: IAccessor<TItem>,
    id: string,
    actions$: Subject<IBaseAction>,
    request: (id: string) => Promise<TItem>,
}

export const softDeleteItem = <TItem>({
    topicId,
    accessor,
    id,
    actions$,
    request,
}: ISoftDeleteItemArgs<TItem>) => {
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
        if (isSoftDeleteSingleSuccessAction<TItem>(action)) {
            const result = commit({ updated: [action.payload.updatedItem], accessor });

            const commitAction: SoftDeleteSingleCommitAction<TItem> = {
                topicId,
                actionId: SoftDeleteSingleCommitActionId,
                payload: { updatedItem: result[0] }
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

    const beginAction: SoftDeleteSingleBeginAction = {
        topicId,
        actionId: SoftDeleteSingleBeginActionId,
        payload: { itemId: id }
    }

    actions$.next(beginAction);

    from(request(id))
        .pipe(retryWithDelay(2000, 3))
        .subscribe({
            next: (updatedItem) => {
                const endAction: SoftDeleteSingleSuccessAction<TItem> = {
                    topicId,
                    actionId: SoftDeleteSingleSuccessActionId,
                    payload: { updatedItem }
                }

                actions$.next(endAction);
            },
            error: (error) => {
                const failAction: SoftDeleteSingleFailAction<typeof error> = {
                    topicId,
                    actionId: SoftDeleteSingleFailActionId,
                    payload: { itemId: id, error }
                }

                actions$.next(failAction);
            }
        })
}

export const isSoftDeleteSingleBeginAction = (action: IBaseAction): action is SoftDeleteSingleBeginAction => {
    return action.actionId === SoftDeleteSingleBeginActionId
}

export const isSoftDeleteSingleSuccessAction = <TItem>(action: IBaseAction): action is SoftDeleteSingleSuccessAction<TItem> => {
    return action.actionId === SoftDeleteSingleSuccessActionId
}

export const isSoftDeleteSingleCommitAction = <TItem>(action: IBaseAction): action is SoftDeleteSingleCommitAction<TItem> => {
    return action.actionId === SoftDeleteSingleCommitActionId
}

export const isSoftDeleteSingleFailAction = <TError>(action: IBaseAction): action is SoftDeleteSingleFailAction<TError> => {
    return action.actionId === SoftDeleteSingleFailActionId
}
