import { from, Subject } from "rxjs";
import { IBaseAction } from "../IBaseAction";

export interface IoftDeleteItemArgs<TItem> {
    id: string,
    actions$: Subject<IBaseAction>,
    beginAction: ((id: string) => IBaseAction) | IBaseAction,
    endAction: ((item: TItem) => IBaseAction) | IBaseAction,
    request: (id: string) => Promise<TItem>,
}

export const softDeleteItem = <TItem>({
    id,
    actions$,
    beginAction,
    endAction,
    request,
}: IoftDeleteItemArgs<TItem>) => {
    if (typeof beginAction === 'function') {
        actions$.next(beginAction(id));
    } else {
        actions$.next(beginAction);
    }

    from(request(id))
        .subscribe((updatedItem) => {
            if (typeof endAction === 'function') {
                actions$.next(endAction(updatedItem));
            } else {
                actions$.next(endAction);
            }
        })
}