import { from, Subject } from "rxjs";
import { IBaseAction } from "../IBaseAction";

export interface IUpdateItemArgs<TItem> {
    item: TItem,
    actions$: Subject<IBaseAction>,
    beginAction: ((item: TItem) => IBaseAction) | IBaseAction,
    endAction: ((item: TItem) => IBaseAction) | IBaseAction,
    request: (item: TItem) => Promise<TItem>,
}

export const updateItem = <TItem>({
    item,
    actions$,
    beginAction,
    endAction,
    request,
}: IUpdateItemArgs<TItem>) => {
    if (typeof beginAction === 'function') {
        actions$.next(beginAction(item));
    } else {
        actions$.next(beginAction);
    }

    from(request(item))
        .subscribe((updatedItem) => {
            if (typeof endAction === 'function') {
                actions$.next(endAction(updatedItem));
            } else {
                actions$.next(endAction);
            }
        })
}