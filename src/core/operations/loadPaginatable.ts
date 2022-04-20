import { combineLatest, distinctUntilChanged, from, map, Observable, of, scan, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";
import { isAddSingleBeginAction, isAddSingleEndAction } from "./addSingle";
import { commit } from "../store/commit";

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
    topicId: Id,
    accessor: IAccessor<TItem>
    actions$: Subject<IBaseAction>,
    paginator$: Subject<void>,
    itemsPerPage: number,
    request: (itemsPerPage: number, pageToken: string) => Promise<IPaginatorResult<TItem>>,
}

export const loadPaginatable = <TItem>({
    topicId,
    accessor,
    actions$,
    paginator$,
    itemsPerPage,
    request,
}: IPaginatoableArgs<TItem>): Observable<Subject<TItem>[]> => {
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

    const reducer: Reducer<Subject<TItem>[], IBaseAction> = (prev, action) => {
        if (isLoadPageEndAction<TItem>(action)) {
            return [...prev.data, ...commit({ updated: action.payload.items, accessor })];
        }

        if (isAddSingleBeginAction<TItem>(action)) {
            return [];
        }

        if (isAddSingleEndAction<TItem>(action)) {
            paginator$.next();
        }

        return prev.data;
    }

    const reducer$ = actions$.pipe(
        scan(makeScanFromReducer(reducer), initial),
        distinctUntilChanged((prev, next) => prev.data === next.data),
        map(({ data, action }) => data),
    )

    let pageToken = '';

    paginator$.subscribe(() => {
        const beginAction: LoadPageBeginAction = {
            topicId,
            actionId: LoadPageBeginActionId,
            payload: { itemsPerPage, currentPageToken: pageToken }
        }

        actions$.next(beginAction);

        from(request(itemsPerPage, pageToken)).subscribe((result) => {
            pageToken = result.nextPageToken;

            const endAction: LoadPageEndAction<TItem> = {
                topicId,
                actionId: LoadPageEndActionId,
                payload: { items: result.data, nextPageToken: pageToken }
            }

            actions$.next(endAction);
        })
    })

    return reducer$;
}

export const isLoadPageBeginAction = (action: IBaseAction): action is LoadPageBeginAction => {
    return action.actionId === LoadPageBeginActionId
}

export const isLoadPageEndAction = <TItem>(action: IBaseAction): action is LoadPageEndAction<TItem> => {
    return action.actionId === LoadPageEndActionId
}