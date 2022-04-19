import { combineLatest, distinctUntilChanged, from, map, Observable, of, scan, skipWhile, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { update } from "../mutators/update";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";
import { isLoadAllEndAction } from "./loadAll";
import { isLoadBatchEndAction } from "./loadBatch";
import { isLoadPageEndAction } from "./loadPaginatable";
import { isSoftDeleteSingleEndAction } from "./softDeleteSingle";
import { isUpdateSingleEndAction } from "./updateSingle";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadSingleBeginActionId = Symbol('LOAD_SINGLE_BEGIN_ACTION')
export const LoadSingleEndActionId = Symbol('LOAD_SINGLE_END_ACTION')

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadSingleBeginAction = IBaseAction<typeof LoadSingleBeginActionId, { itemId: string }>
type LoadSingleEndAction<TItem> = IBaseAction<typeof LoadSingleEndActionId, { item: TItem }>

export interface ILoadSingleArgs<TItem> {
    topicId: Id,
    accessor: IAccessor<TItem>,
    id: string,
    actions$: Subject<IBaseAction>,
    initialData?: TItem[],
    request: (id: string) => Promise<TItem>,
}

export const loadSingle = <TItem>({
    topicId,
    accessor,
    id,
    actions$,
    initialData = [],
    request,
}: ILoadSingleArgs<TItem>): Observable<DataWithAction<TItem | null, IBaseAction>> => {
    const initial: DataWithAction<TItem[], InitialAction> = {
        data: initialData,
        action: {
            topicId,
            actionId: InitialActionId,
            payload: null
        },
    }

    const dataWithAction$: Observable<[TItem[], IBaseAction]> = combineLatest([
        of(initialData),
        actions$,
    ]);

    const reducer: Reducer<TItem[], IBaseAction> = (prev, { data, action }) => {
        if (isLoadSingleEndAction<TItem>(action)) {
            if (accessor.getId(action.payload.item) === id) {
                return [action.payload.item];
            }
        }

        if (
            isLoadBatchEndAction<TItem>(action) ||
            isLoadAllEndAction<TItem>(action) ||
            isLoadPageEndAction<TItem>(action)
        ) {
            return update(data, action.payload.items, accessor.getId);
        }

        if (
            isUpdateSingleEndAction<TItem>(action) ||
            isSoftDeleteSingleEndAction<TItem>(action)
        ) {
            return update(data, action.payload.updatedItem, accessor.getId);
        }

        return data;
    }

    const result$ = dataWithAction$.pipe(
        map(([data, action]) => ({ data, action })),
        scan(makeScanFromReducer(reducer), initial),
        map(({data, action}) => ({ data: data[0] || null, action })),
        distinctUntilChanged(({ data: prevData }, { data: nextData }) => prevData === nextData),
    )

    const beginAction: LoadSingleBeginAction = {
        topicId,
        actionId: LoadSingleBeginActionId,
        payload: { itemId: id }
    }

    actions$.next(beginAction);

    from(request(id))
        .subscribe((item) => {
            const endAction: LoadSingleEndAction<TItem> = {
                topicId,
                actionId: LoadSingleEndActionId,
                payload: { item }
            }

            actions$.next(endAction);
        })

    return result$;
}

export const isLoadSingleBeginAction = (action: IBaseAction): action is LoadSingleBeginAction => {
    return action.actionId === LoadSingleBeginActionId
}

export const isLoadSingleEndAction = <TItem>(action: IBaseAction): action is LoadSingleEndAction<TItem> => {
    return action.actionId === LoadSingleEndActionId
}