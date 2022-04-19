import { combineLatest, distinctUntilChanged, from, map, Observable, of, scan, share, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { DataWithAction, makeScanFromReducer, Reducer } from "../Reducer";
import { commit } from "../store/commit";

const InitialActionId = Symbol('INITIAL_ACTION')
const SoftDeleteSingleBeginActionId = Symbol('SOFT_DELETE_SINGLE_BEGIN_ACTION');
const SoftDeleteSingleEndActionId = Symbol('SOFT_DELETE_SINGLE_END_ACTION');

type InitialAction = IBaseAction<typeof InitialActionId>;
type SoftDeleteSingleBeginAction = IBaseAction<typeof SoftDeleteSingleBeginActionId, { itemId: string }>
type SoftDeleteSingleEndAction<TItem> = IBaseAction<typeof SoftDeleteSingleEndActionId, { updatedItem: TItem }>

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
        if (isSoftDeleteSingleEndAction<TItem>(action)) {
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

    const beginAction: SoftDeleteSingleBeginAction = {
        topicId,
        actionId: SoftDeleteSingleBeginActionId,
        payload: { itemId: id }
    }

    actions$.next(beginAction);

    from(request(id))
        .subscribe((updatedItem) => {
            const endAction: SoftDeleteSingleEndAction<TItem> = {
                topicId,
                actionId: SoftDeleteSingleEndActionId,
                payload: { updatedItem }
            }

            actions$.next(endAction);
        })
}

export const isSoftDeleteSingleBeginAction = (action: IBaseAction): action is SoftDeleteSingleBeginAction => {
    return action.actionId === SoftDeleteSingleBeginActionId
}

export const isSoftDeleteSingleEndAction = <TItem>(action: IBaseAction): action is SoftDeleteSingleEndAction<TItem> => {
    return action.actionId === SoftDeleteSingleEndActionId
}