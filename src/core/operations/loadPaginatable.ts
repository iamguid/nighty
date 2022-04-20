import { BehaviorSubject, distinctUntilChanged, from, map, Observable, scan, Subject } from "rxjs";
import { IAccessor } from "../Accessor";
import { IBaseAction, Id } from "../IBaseAction";
import { DataWithAction, Reducer, makeScanFromReducer } from "../Reducer";
import { isAddSingleBeginAction, isAddSingleSuccessAction } from "./addSingle";
import { commit } from "../store/commit";

export const InitialActionId = Symbol('INITIAL_ACTION')
export const LoadPageBeginActionId = Symbol('LOAD_PAGE_BEGIN_ACTION')
export const LoadPageSuccessActionId = Symbol('LOAD_PAGE_SUCCESS_ACTION')
export const LoadPageFailActionId = Symbol('LOAD_PAGE_FAIL_ACTION')

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadPageBeginAction = IBaseAction<typeof LoadPageBeginActionId, { itemsPerPage: number, currentPageToken: string }>
type LoadPageSuccessAction<TItem> = IBaseAction<typeof LoadPageSuccessActionId, { items: TItem[], nextPageToken: string }>
type LoadPageFailAction<TError> = IBaseAction<typeof LoadPageFailActionId, { currentPageToken: string, error: TError }>

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
    const initialData: BehaviorSubject<TItem>[] = [];

    const initial: DataWithAction<BehaviorSubject<TItem>[], InitialAction> = {
        data: initialData,
        action: {
            topicId,
            actionId: InitialActionId,
            payload: null,
        },
    }

    const reducer: Reducer<BehaviorSubject<TItem>[], IBaseAction> = (prev, action) => {
        if (isLoadPageSuccessAction<TItem>(action)) {
            return [...prev.data, ...commit({ updated: action.payload.items, accessor })];
        }

        if (isAddSingleBeginAction<TItem>(action)) {
            return [];
        }

        if (isAddSingleSuccessAction<TItem>(action)) {
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

        from(request(itemsPerPage, pageToken)).subscribe({
            next: (result) => {
                pageToken = result.nextPageToken;

                const endAction: LoadPageSuccessAction<TItem> = {
                    topicId,
                    actionId: LoadPageSuccessActionId,
                    payload: { items: result.data, nextPageToken: pageToken }
                }

                actions$.next(endAction);
            },
            error: (error) => {
                const failAction: LoadPageFailAction<typeof error> = {
                    topicId,
                    actionId: LoadPageFailActionId,
                    payload: { currentPageToken: pageToken, error }
                }

                actions$.next(failAction);
            }
        })
    })

    return reducer$;
}

export const isLoadPageBeginAction = (action: IBaseAction): action is LoadPageBeginAction => {
    return action.actionId === LoadPageBeginActionId
}

export const isLoadPageSuccessAction = <TItem>(action: IBaseAction): action is LoadPageSuccessAction<TItem> => {
    return action.actionId === LoadPageSuccessActionId
}

export const isLoadPageFailAction = <TItem>(action: IBaseAction): action is LoadPageFailAction<TItem> => {
    return action.actionId === LoadPageFailActionId
}