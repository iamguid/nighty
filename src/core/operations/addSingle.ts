import { BehaviorSubject, combineLatest, distinctUntilChanged, from, map, Observable, of, scan, share, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { DataWithAction, makeScanFromReducer, Reducer } from "../Reducer";
import { commit } from "../store/commit";

const InitialActionId = Symbol('INITIAL_ACTION')
const AddSingleBeginActionId = Symbol('ADD_SINGLE_BEGIN_ACTION');
const AddSingleSuccessActionId = Symbol('ADD_SINGLE_SUCCESS_ACTION');
const AddSingleCommitActionId = Symbol('ADD_SINGLE_COMMIT_ACTION');
const AddSingleFailActionId = Symbol('ADD_SINGLE_FAIL_ACTION');

type InitialAction = IBaseAction<typeof InitialActionId>;
type AddSingleBeginAction<TItem> = IBaseAction<typeof AddSingleBeginActionId, { changedItem: TItem }>
type AddSingleSuccessAction<TItem> = IBaseAction<typeof AddSingleSuccessActionId, { updatedItem: TItem }>
type AddSingleCommitAction<TItem> = IBaseAction<typeof AddSingleCommitActionId, { updatedItem: BehaviorSubject<TItem> }>
type AddSingleFailAction<TItem, TError> = IBaseAction<typeof AddSingleFailActionId, { changedItem: TItem, error: TError }>

export interface IAddSingleArgs<TItem> {
    topicId: Id,
    accessor: IAccessor<TItem>,
    changedItem: TItem,
    actions$: Subject<IBaseAction>,
    request: (item: TItem) => Promise<TItem>,
}

export const addSingle = <TItem>({
    topicId,
    accessor,
    changedItem,
    actions$,
    request,
}: IAddSingleArgs<TItem>) => {
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
        if (isAddSingleSuccessAction<TItem>(action)) {
            const result = commit({ updated: [action.payload.updatedItem], accessor });

            const commitAction: AddSingleCommitAction<TItem> = {
                topicId,
                actionId: AddSingleCommitActionId,
                payload: { updatedItem: result[0] }
            }

            actions$.next(commitAction);

            return result;
        }

        return prev.data;
    }

    const result$ = actions$.pipe(
        scan(makeScanFromReducer(reducer), initial),
        map(({ data, action }) => ({ data: data[0] || null, action })),
        distinctUntilChanged(({ data: prevData }, { data: nextData }) => prevData === nextData),
    )

    result$.subscribe();

    const beginAction: AddSingleBeginAction<TItem> = {
        topicId,
        actionId: AddSingleBeginActionId,
        payload: { changedItem }
    }

    actions$.next(beginAction);

    from(request(changedItem))
        .subscribe({
            next: (updatedItem) => {
                const completeAction: AddSingleSuccessAction<TItem> = {
                    topicId,
                    actionId: AddSingleSuccessActionId,
                    payload: { updatedItem }
                }

                actions$.next(completeAction);
            },
            error: (error) => {
                const failAction: AddSingleFailAction<TItem, typeof error> = {
                    topicId,
                    actionId: AddSingleFailActionId,
                    payload: { changedItem, error }
                }

                actions$.next(failAction);
            }
        })
}

export const isAddSingleBeginAction = <TItem>(action: IBaseAction): action is AddSingleBeginAction<TItem> => {
    return action.actionId === AddSingleBeginActionId
}

export const isAddSingleSuccessAction = <TItem>(action: IBaseAction): action is AddSingleSuccessAction<TItem> => {
    return action.actionId === AddSingleSuccessActionId
}

export const isAddSingleCommitAction = <TItem>(action: IBaseAction): action is AddSingleCommitAction<TItem> => {
    return action.actionId === AddSingleCommitActionId
}

export const isAddSingleFailAction = <TItem, TError>(action: IBaseAction): action is AddSingleFailAction<TItem, TError> => {
    return action.actionId === AddSingleFailActionId
}