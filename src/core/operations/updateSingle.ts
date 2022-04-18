import { from, Subject } from "rxjs";
import { IBaseAction, Id } from "../IBaseAction";

const UpdateSingleBeginActionId = Symbol('UPDATE_SINGLE_BEGIN_ACTION');
const UpdateSingleEndActionId = Symbol('UPDATE_SINGLE_END_ACTION');

type UpdateSingleBeginAction<TItem> = IBaseAction<typeof UpdateSingleBeginActionId, { changedItem: TItem }>
type UpdateSingleEndAction<TItem> = IBaseAction<typeof UpdateSingleEndActionId, { updatedItem: TItem }>

export interface IUpdateSingleArgs<TItem> {
    store: Id,
    changedItem: TItem,
    actions$: Subject<IBaseAction>,
    request: (item: TItem) => Promise<TItem>,
}

export const updateItem = <TItem>({
    store,
    changedItem,
    actions$,
    request,
}: IUpdateSingleArgs<TItem>) => {
    const beginAction: UpdateSingleBeginAction<TItem> = {
        store,
        id: UpdateSingleBeginActionId,
        payload: { changedItem }
    }

    actions$.next(beginAction);

    from(request(changedItem))
        .subscribe((updatedItem) => {
            const endAction: UpdateSingleEndAction<TItem> = {
                store,
                id: UpdateSingleEndActionId,
                payload: { updatedItem }
            }

            actions$.next(endAction);
        })
}

export const isUpdateSingleBeginAction = <TItem>(action: IBaseAction): action is UpdateSingleBeginAction<TItem> => {
    return action.id === UpdateSingleBeginActionId
}

export const isUpdateSingleEndAction = <TItem>(action: IBaseAction): action is UpdateSingleEndAction<TItem> => {
    return action.id === UpdateSingleEndActionId
}