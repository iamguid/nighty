import { BehaviorSubject, combineLatest, distinctUntilChanged, from, map, Observable, of, scan, share, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { retryWithDelay } from "../operators/retryWithDelay";
import { DataWithAction, makeScanFromReducer, Reducer } from "../Reducer";
import { commit } from "../store/commit";

const InitialActionId = Symbol('INITIAL_ACTION')
const HardDeleteSingleBeginActionId = Symbol('HARD_DELETE_SINGLE_BEGIN_ACTION');
const HardDeleteSingleSuccessActionId = Symbol('HARD_DELETE_SINGLE_SUCCESS_ACTION');
const HardDeleteSingleCommitActionId = Symbol('HARD_DELETE_SINGLE_COMMIT_ACTION');
const HardDeleteSingleFailActionId = Symbol('HARD_DELETE_SINGLE_FAIL_ACTION');

type InitialAction = IBaseAction<typeof InitialActionId>;
type HardDeleteSingleBeginAction = IBaseAction<typeof HardDeleteSingleBeginActionId, { itemId: string }>
type HardDeleteSingleSuccessAction = IBaseAction<typeof HardDeleteSingleSuccessActionId, { itemId: string }>
type HardDeleteSingleCommitAction = IBaseAction<typeof HardDeleteSingleCommitActionId, { itemId: string }>
type HardDeleteSingleFailAction<TError> = IBaseAction<typeof HardDeleteSingleFailActionId, { itemId: string, error: TError }>

export interface IHardDeleteItemArgs<TItem> {
    topicId: Id,
    accessor: IAccessor<TItem>,
    id: string,
    actions$: Subject<IBaseAction>,
    request: (id: string) => Promise<void>,
}

export const hardDeleteItem = <TItem>({
    topicId,
    accessor,
    id,
    actions$,
    request,
}: IHardDeleteItemArgs<TItem>) => {
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
        if (isHardDeleteSingleSuccessAction(action) && topicId === action.topicId) {
            const result = commit({ updated: [], deleted: [action.payload.itemId], accessor });

            const commitAction: HardDeleteSingleCommitAction = {
                topicId,
                actionId: HardDeleteSingleCommitActionId,
                payload: { itemId: action.payload.itemId }
            }

            actions$.next(commitAction);

            return result
        }

        return prev.data;
    }

    const result$ = actions$.pipe(
        scan(makeScanFromReducer(reducer), initial),
        map(({ action }) => ({ data: null, action })),
        distinctUntilChanged(({ data: prevData }, { data: nextData }) => prevData === nextData),
        map(({ data, action }) => data)
    )

    result$.subscribe();

    const beginAction: HardDeleteSingleBeginAction = {
        topicId,
        actionId: HardDeleteSingleBeginActionId,
        payload: { itemId: id }
    }

    actions$.next(beginAction);

    from(request(id))
        .pipe(retryWithDelay(2000, 3))
        .subscribe({
            next: () => {
                const endAction: HardDeleteSingleSuccessAction = {
                    topicId,
                    actionId: HardDeleteSingleSuccessActionId,
                    payload: { itemId: id }
                }

                actions$.next(endAction);
            },
            error: (error) => {
                const failAction: HardDeleteSingleFailAction<typeof error> = {
                    topicId,
                    actionId: HardDeleteSingleFailActionId,
                    payload: { itemId: id, error }
                }

                actions$.next(failAction);
            }
        })
}

export const isHardDeleteSingleBeginAction = (action: IBaseAction): action is HardDeleteSingleBeginAction => {
    return action.actionId === HardDeleteSingleBeginActionId
}

export const isHardDeleteSingleSuccessAction = (action: IBaseAction): action is HardDeleteSingleSuccessAction => {
    return action.actionId === HardDeleteSingleSuccessActionId
}

export const isHardDeleteSingleCommitAction = (action: IBaseAction): action is HardDeleteSingleCommitAction => {
    return action.actionId === HardDeleteSingleCommitActionId
}

export const isHardDeleteSingleFailAction = <TError>(action: IBaseAction): action is HardDeleteSingleFailAction<TError> => {
    return action.actionId === HardDeleteSingleFailActionId
}
