import { combineLatest, distinctUntilChanged, from, map, merge, Observable, of, pairwise, reduce, scan, skipWhile, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { append } from "../mutators/append";
import { whenSoftDeleteSingleEnds } from "../mutators/whenSoftDeleteSingleEnds";
import { whenUpdateSingleEnds } from "../mutators/whenUpdateSingleEnds";
import { DataWithAction, mergeReducers, ReduceArray, reducerFromArray, ReducerFunction } from "../Reducer";
import { isAddSingleBeginAction, isAddSingleEndAction } from "./addSingle";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadPageBeginActionId = Symbol('LOAD_PAGE_BEGIN_ACTION')
export const LoadPageEndActionId = Symbol('LOAD_PAGE_END_ACTION')

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadPageBeginAction = IBaseAction<typeof LoadPageBeginActionId, { itemsPerPage: number, currentPageToken: string }>
type LoadPageEndAction<TItem> = IBaseAction<typeof LoadPageEndActionId, { items: TItem[], nextPageToken: string }>

export interface IPaginatorResult<TItem> {
    data: TItem[],
    nextPageToken: string,
}

export interface IPaginatoableArgs<TItem> {
    store: Id,
    accessor: IAccessor<TItem>
    actions$: Subject<IBaseAction>,
    paginator$: Subject<void>,
    itemsPerPage: number,
    initialData?: TItem[],
    request: (itemsPerPage: number, pageToken: string) => Promise<IPaginatorResult<TItem>>,
    reducer?: ReducerFunction<TItem[], IBaseAction> | null,
}

export const loadPaginatable = <TItem>({
    store,
    accessor,
    actions$,
    paginator$,
    itemsPerPage,
    initialData = [],
    request,
    reducer = null,
}: IPaginatoableArgs<TItem>): Observable<DataWithAction<TItem[], IBaseAction>> => {
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

    const paginatorReducer: ReducerFunction<TItem[], IBaseAction> = (prev, { data, action }) => {
        if (isLoadPageEndAction<TItem>(action)) {
            return { data: append(data, action.payload.items), action }
        }

        if (isAddSingleBeginAction<TItem>(action)) {
            return { data: [], action }
        }

        if (isAddSingleEndAction<TItem>(action)) {
            paginator$.next();
        }

        return { data, action };
    }

    const defaultReduceArray: ReduceArray<TItem[], IBaseAction> = [
        whenUpdateSingleEnds(accessor.getId),
        whenSoftDeleteSingleEnds(accessor.getId),
    ]

    const resultReducer = mergeReducers(paginatorReducer, reducerFromArray(defaultReduceArray))

    const reducer$ = dataWithAction$.pipe(
        map(([data, action]) => ({ data, action })),
        scan(reducer || resultReducer, initial),
        distinctUntilChanged((prev, next) => prev.data === next.data),
    )

    let pageToken = '';

    paginator$.subscribe(() => {
        const beginAction: LoadPageBeginAction = {
            store,
            id: LoadPageBeginActionId,
            payload: { itemsPerPage, currentPageToken: pageToken }
        }

        actions$.next(beginAction);

        from(request(itemsPerPage, pageToken)).subscribe((result) => {
            pageToken = result.nextPageToken;

            const endAction: LoadPageEndAction<TItem> = {
                store,
                id: LoadPageEndActionId,
                payload: { items: result.data, nextPageToken: pageToken }
            }

            actions$.next(endAction);
        })
    })

    return reducer$;
}

export const isLoadPageBeginAction = (action: IBaseAction): action is LoadPageBeginAction => {
    return action.id === LoadPageBeginActionId
}

export const isLoadPageEndAction = <TItem>(action: IBaseAction): action is LoadPageEndAction<TItem> => {
    return action.id === LoadPageEndActionId
}