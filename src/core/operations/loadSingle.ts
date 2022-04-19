import { combineLatest, distinctUntilChanged, from, map, Observable, of, scan, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";
import { commit } from "../store/commit";

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
    request: (id: string) => Promise<TItem>,
}

export const loadSingle = <TItem>({
    topicId,
    accessor,
    id,
    actions$,
    request,
}: ILoadSingleArgs<TItem>): Observable<Subject<TItem> | null> => {
    const initialData: Subject<TItem>[] = [];

    const initial: DataWithAction<Subject<TItem>[], InitialAction> = {
        data: initialData,
        action: {
            topicId,
            actionId: InitialActionId,
            payload: null
        },
    }

    const dataWithAction$: Observable<[Subject<TItem>[], IBaseAction]> = combineLatest([
        of(initialData),
        actions$,
    ]);

    const reducer: Reducer<Subject<TItem>[], IBaseAction> = (prev, { data, action }) => {
        if (isLoadSingleEndAction<TItem>(action) && action.topicId === topicId) {
            return commit({ updated: [action.payload.item], accessor });
        }

        return data;
    }

    const result$ = dataWithAction$.pipe(
        map(([data, action]) => ({ data, action })),
        scan(makeScanFromReducer(reducer), initial),
        distinctUntilChanged(({ data: prevData }, { data: nextData }) => prevData === nextData),
        map(({ data, action }) => data),
        map(data => data[0] || null),
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