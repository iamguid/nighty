import { combineLatest, distinctUntilChanged, from, map, Observable, of, scan, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { whenLoadManyEnds } from "../mutators/whenLoadManyEnds";
import { whenLoadSingleSingleEnds } from "../mutators/whenLoadSingleEnds";
import { whenSoftDeleteSingleEnds } from "../mutators/whenSoftDeleteSingleEnds";
import { whenUpdateSingleEnds } from "../mutators/whenUpdateSingleEnds";
import { DataWithAction, ReduceArray, reducerFromArray, ReducerFunction } from "../Reducer";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadSingleBeginActionId = Symbol('LOAD_SINGLE_BEGIN_ACTION')
export const LoadSingleEndActionId = Symbol('LOAD_SINGLE_END_ACTION')

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadSingleBeginAction = IBaseAction<typeof LoadSingleBeginActionId, { itemId: string }>
type LoadSingleEndAction<TItem> = IBaseAction<typeof LoadSingleEndActionId, { item: TItem }>

export interface ILoadSingleArgs<TItem> {
    store: Id,
    accessor: IAccessor<TItem>,
    id: string,
    actions$: Subject<IBaseAction>,
    initialData?: TItem[],
    request: (id: string) => Promise<TItem>,
    reducer?: ReducerFunction<TItem[], IBaseAction> | null,
}

export const loadSingle = <TItem>({
    store,
    accessor,
    id,
    actions$,
    initialData = [],
    request,
    reducer = null,
}: ILoadSingleArgs<TItem>): Observable<DataWithAction<TItem | null, IBaseAction>> => {
    const initial: DataWithAction<TItem[], InitialAction> = {
        data: initialData,
        action: {
            store,
            id: InitialActionId,
            payload: null
        },
    }

    const dataWithAction$: Observable<[TItem[], IBaseAction]> = combineLatest([
        of(initialData),
        actions$,
    ]);

    const defaultReduceArray: ReduceArray<TItem[], IBaseAction> = [
        whenLoadManyEnds(accessor.getId),
        whenLoadSingleSingleEnds(accessor.getId),
        whenUpdateSingleEnds(accessor.getId),
        whenSoftDeleteSingleEnds(accessor.getId),
    ];

    const result$ = dataWithAction$.pipe(
        map(([data, action]) => ({ data, action })),
        scan(reducer || reducerFromArray(defaultReduceArray), initial),
        map(({data, action}) => ({ data: data[0] || null, action })),
        distinctUntilChanged(({ data: prevData }, { data: nextData }) => prevData === nextData)
    )

    const beginAction: LoadSingleBeginAction = {
        store,
        id: LoadSingleBeginActionId,
        payload: { itemId: id }
    }

    actions$.next(beginAction);

    from(request(id))
        .subscribe((item) => {
            const endAction: LoadSingleEndAction<TItem> = {
                store,
                id: LoadSingleEndActionId,
                payload: { item }
            }

            actions$.next(endAction);
        })

    return result$;
}

export const isLoadSingleBeginAction = (action: IBaseAction): action is LoadSingleBeginAction => {
    return action.id === LoadSingleBeginActionId
}

export const isLoadSingleEndAction = <TItem>(action: IBaseAction): action is LoadSingleEndAction<TItem> => {
    return action.id === LoadSingleEndActionId
}