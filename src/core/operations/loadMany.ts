import { combineLatest, distinctUntilChanged, from, map, Observable, of, pairwise, reduce, scan, skipWhile, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { whenLoadManyEnds } from "../mutators/whenLoadManyEnds";
import { whenLoadSingleEnds } from "../mutators/whenLoadSingleEnds";
import { whenSoftDeleteSingleEnds } from "../mutators/whenSoftDeleteSingleEnds";
import { whenUpdateSingleEnds } from "../mutators/whenUpdateSingleEnds";
import { DataWithAction, ReduceArray, reducerFromArray, ReducerFunction } from "../Reducer";

export const InitialActionId = Symbol('INITIAL_ACTION')
const LoadManyBeginActionId = Symbol('LOAD_MANY_BEGIN_ACTION')
const LoadManyEndActionId = Symbol('LOAD_MANY_END_ACTION')

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadManyBeginAction = IBaseAction<typeof LoadManyBeginActionId>
type LoadManyEndAction<TItem> = IBaseAction<typeof LoadManyEndActionId, { items: TItem[] }>

export interface ILoadAllArgs<TItem> {
    store: Id,
    accessor: IAccessor<TItem>,
    actions$: Subject<IBaseAction>,
    initialData?: TItem[],
    request: () => Promise<TItem[]>,
    reducer?: ReducerFunction<TItem[], IBaseAction> | null,
}

export const loadMany = <TItem>({
    store,
    accessor,
    actions$,
    initialData = [],
    request,
    reducer = null,
}: ILoadAllArgs<TItem>): Observable<DataWithAction<TItem[], IBaseAction>> => {
    const initial: DataWithAction<TItem[], InitialAction> = {
        data: initialData,
        action: {
            store,
            id: InitialActionId,
            payload: null,
        },
    }

    const dataWithAction$: Observable<[TItem[], IBaseAction]> = combineLatest([
        of(initialData),
        actions$,
    ]);

    const defaultReduceArray: ReduceArray<TItem[], IBaseAction> = [
        whenLoadManyEnds(accessor.getId),
        whenLoadSingleEnds(accessor.getId),
        whenUpdateSingleEnds(accessor.getId),
        whenSoftDeleteSingleEnds(accessor.getId),
    ];

    const result$ = dataWithAction$.pipe(
        map(([data, action]) => ({ data, action })),
        scan(reducer || reducerFromArray(defaultReduceArray), initial),
        distinctUntilChanged((prev, next) => prev.data === next.data),
    )

    const beginAction: LoadManyBeginAction = {
        store,
        id: LoadManyBeginActionId,
        payload: null,
    }

    actions$.next(beginAction);

    from(request())
        .subscribe((items) => {
            const endAction: LoadManyEndAction<TItem> = {
                store,
                id: LoadManyEndActionId,
                payload: { items },
            }

            actions$.next(endAction);
        })

    return result$;
}

export const isLoadManyBeginAction = (action: IBaseAction): action is LoadManyBeginAction => {
    return action.id === LoadManyBeginActionId
}

export const isLoadManyEndAction = <TItem>(action: IBaseAction): action is LoadManyEndAction<TItem> => {
    return action.id === LoadManyEndActionId
}