import { distinctUntilChanged, from, map, Observable, scan, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { commit } from "../store/commit";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";
import { isAddSingleCommitAction } from "./addSingle";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadAllBeginActionId = Symbol('LOAD_ALL_BEGIN_ACTION')
export const LoadAllEndActionId = Symbol('LOAD_ALL_END_ACTION')

export type InitialAction = IBaseAction<typeof InitialActionId>
export type LoadAllBeginAction = IBaseAction<typeof LoadAllBeginActionId>
export type LoadAllEndAction<TItem> = IBaseAction<typeof LoadAllEndActionId, { items: TItem[] }>

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
    const initialData: Subject<TItem>[] = [];

    const initial: DataWithAction<Subject<TItem>[], InitialAction> = {
        data: initialData,
        action: {
            topicId,
            actionId: InitialActionId,
            payload: null,
        },
    }

    const reducer: Reducer<Subject<TItem>[], IBaseAction> = (prev, action) => {
        if (isLoadAllEndAction<TItem>(action)) {
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
        .subscribe((items) => {
            const endAction: LoadAllEndAction<TItem> = {
                topicId,
                actionId: LoadAllEndActionId,
                payload: { items },
            }

            actions$.next(endAction);
        })

    return result$;
}

export const isLoadAllBeginAction = (action: IBaseAction): action is LoadAllBeginAction => {
    return action.actionId === LoadAllBeginActionId
}

export const isLoadAllEndAction = <TItem>(action: IBaseAction): action is LoadAllEndAction<TItem> => {
    return action.actionId === LoadAllEndActionId
}
