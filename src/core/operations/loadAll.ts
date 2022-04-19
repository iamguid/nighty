import { combineLatest, distinctUntilChanged, from, map, Observable, of, scan, skipWhile, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { commit } from "../store/commit";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";
import { isAddSingleEndAction } from "./addSingle";
import { isLoadBatchEndAction } from "./loadBatch";
import { isLoadPageEndAction } from "./loadPaginatable";
import { isSoftDeleteSingleEndAction } from "./softDeleteSingle";
import { isUpdateSingleEndAction, updateItem } from "./updateSingle";
import { append } from "../store/append";

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

    const dataWithAction$: Observable<[Subject<TItem>[], IBaseAction]> = combineLatest([
        of(initialData),
        actions$,
    ]);

    const reducer: Reducer<Subject<TItem>[], IBaseAction> = (prev, { data, action }) => {
        if (isLoadAllEndAction<TItem>(action)) {
            return commit({ updated: action.payload.items, accessor });
        }

        if (isAddSingleEndAction<TItem>(action)) {
            return append({ target: data, append: [action.payload.updatedItem], accessor });
        }

        return data
    }

    const result$ = dataWithAction$.pipe(
        map(([data, action]) => ({ data, action })),
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
