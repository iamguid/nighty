import { from, Subject } from "rxjs";
import { IBaseAction } from "../IBaseAction";

export interface IAddItemArgs<TItem> {
    item: TItem,
    actions$: Subject<IBaseAction>,
    beginAction: ((item: TItem) => IBaseAction) | IBaseAction,
    endAction: ((item: TItem) => IBaseAction) | IBaseAction,
    request: (item: TItem) => Promise<TItem>,
}

export const addItem = <TItem>({
    item,
    actions$,
    beginAction,
    endAction,
    request,
}: IAddItemArgs<TItem>) => {
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