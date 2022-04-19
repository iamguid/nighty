import { from, Subject } from "rxjs";
import { IBaseAction, Id } from "../IBaseAction";

const SoftDeleteSingleBeginActionId = Symbol('SOFT_DELETE_SINGLE_BEGIN_ACTION');
const SoftDeleteSingleEndActionId = Symbol('SOFT_DELETE_SINGLE_END_ACTION');

type SoftDeleteSingleBeginAction = IBaseAction<typeof SoftDeleteSingleBeginActionId, { itemId: string }>
type SoftDeleteSingleEndAction<TItem> = IBaseAction<typeof SoftDeleteSingleEndActionId, { updatedItem: TItem }>

export interface ISoftDeleteItemArgs<TItem> {
    topicId: Id,
    id: string,
    actions$: Subject<IBaseAction>,
    request: (id: string) => Promise<TItem>,
}

export const softDeleteItem = <TItem>({
    topicId,
    id,
    actions$,
    request,
}: ISoftDeleteItemArgs<TItem>) => {
    const beginAction: SoftDeleteSingleBeginAction = {
        topicId,
        actionId: SoftDeleteSingleBeginActionId,
        payload: { itemId: id }
    }

    actions$.next(beginAction);

    from(request(id))
        .subscribe((updatedItem) => {
            const endAction: SoftDeleteSingleEndAction<TItem> = {
                topicId,
                actionId: SoftDeleteSingleEndActionId,
                payload: { updatedItem }
            }

            actions$.next(endAction);
        })
}

export const isSoftDeleteSingleBeginAction = (action: IBaseAction): action is SoftDeleteSingleBeginAction => {
    return action.actionId === SoftDeleteSingleBeginActionId
}

export const isSoftDeleteSingleEndAction = <TItem>(action: IBaseAction): action is SoftDeleteSingleEndAction<TItem> => {
    return action.actionId === SoftDeleteSingleEndActionId
}