import { BehaviorSubject, combineLatest, distinctUntilChanged, from, map, Observable, of, scan, share, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { DataWithAction, makeScanFromReducer, Reducer } from "../Reducer";
import { commit } from "../store/commit";

const InitialActionId = Symbol('INITIAL_ACTION')
const UpdateSingleBeginActionId = Symbol('UPDATE_SINGLE_BEGIN_ACTION');
const UpdateSingleEndActionId = Symbol('UPDATE_SINGLE_END_ACTION');

type InitialAction = IBaseAction<typeof InitialActionId>;
type UpdateSingleBeginAction<TItem> = IBaseAction<typeof UpdateSingleBeginActionId, { changedItem: TItem }>;
type UpdateSingleEndAction<TItem> = IBaseAction<typeof UpdateSingleEndActionId, { updatedItem: TItem }>;

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
    const initialData: Subject<TItem>[] = [];

    const initial: DataWithAction<Subject<TItem>[], InitialAction> = {
        data: initialData,
        action: {
            topicId: topicId,
            actionId: InitialActionId,
            payload: null,
        },
    }

    const dataWithAction$: Observable<[Subject<TItem>[], IBaseAction]> = combineLatest([
        of(initialData),
        actions$,
    ]);

    const reducer: Reducer<Subject<TItem>[], IBaseAction> = (prev, { data, action }) => {
        if (isUpdateSingleEndAction<TItem>(action)) {
            return commit({ updated: [action.payload.updatedItem], accessor })
        }

        return data;
    }

    const result$ = dataWithAction$.pipe(
        share(),
        map(([ data, action ]) => ({ data, action })),
        scan(makeScanFromReducer(reducer), initial),
        map(({ data, action }) => ({ data: data[0] || null, action })),
        distinctUntilChanged(({ data: prevData }, { data: nextData }) => prevData === nextData),
    )

    const beginAction: UpdateSingleBeginAction<TItem> = {
        topicId,
        actionId: UpdateSingleBeginActionId,
        payload: { changedItem }
    }

    actions$.next(beginAction);

    from(request(changedItem))
        .subscribe((updatedItem) => {
            const endAction: UpdateSingleEndAction<TItem> = {
                topicId,
                actionId: UpdateSingleEndActionId,
                payload: { updatedItem }
            }

            actions$.next(endAction);
        })
}

export const isUpdateSingleBeginAction = <TItem>(action: IBaseAction): action is UpdateSingleBeginAction<TItem> => {
    return action.actionId === UpdateSingleBeginActionId
}

export const isUpdateSingleEndAction = <TItem>(action: IBaseAction): action is UpdateSingleEndAction<TItem> => {
    return action.actionId === UpdateSingleEndActionId
}