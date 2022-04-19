import { combineLatest, distinctUntilChanged, from, map, Observable, of, scan, share, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { DataWithAction, makeScanFromReducer, Reducer } from "../Reducer";
import { commit } from "../store/commit";

const InitialActionId = Symbol('INITIAL_ACTION')
const AddSingleBeginActionId = Symbol('ADD_SINGLE_BEGIN_ACTION');
const AddSingleEndActionId = Symbol('ADD_SINGLE_END_ACTION');

type InitialAction = IBaseAction<typeof InitialActionId>;
type AddSingleBeginAction<TItem> = IBaseAction<typeof AddSingleBeginActionId, { changedItem: TItem }>
type AddSingleEndAction<TItem> = IBaseAction<typeof AddSingleEndActionId, { updatedItem: TItem }>

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
        if (isAddSingleEndAction<TItem>(action)) {
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

    const beginAction: AddSingleBeginAction<TItem> = {
        topicId,
        actionId: AddSingleBeginActionId,
        payload: { changedItem }
    }

    actions$.next(beginAction);

    from(request(changedItem))
        .subscribe((updatedItem) => {
            const endAction: AddSingleEndAction<TItem> = {
                topicId,
                actionId: AddSingleEndActionId,
                payload: { updatedItem }
            }

            actions$.next(endAction);
        })
}

export const isAddSingleBeginAction = <TItem>(action: IBaseAction): action is AddSingleBeginAction<TItem> => {
    return action.actionId === AddSingleBeginActionId
}

export const isAddSingleEndAction = <TItem>(action: IBaseAction): action is AddSingleEndAction<TItem> => {
    return action.actionId === AddSingleEndActionId
}