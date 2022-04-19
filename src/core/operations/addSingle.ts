import { from, Subject } from "rxjs";
import { IBaseAction, Id } from "../IBaseAction";

const AddSingleBeginActionId = Symbol('ADD_SINGLE_BEGIN_ACTION');
const AddSingleEndActionId = Symbol('ADD_SINGLE_END_ACTION');

type AddSingleBeginAction<TItem> = IBaseAction<typeof AddSingleBeginActionId, { changedItem: TItem }>
type AddSingleEndAction<TItem> = IBaseAction<typeof AddSingleEndActionId, { updatedItem: TItem }>

export interface IAddSingleArgs<TItem> {
    topicId: Id,
    changedItem: TItem,
    actions$: Subject<IBaseAction>,
    request: (item: TItem) => Promise<TItem>,
}

export const addSingle = <TItem>({
    topicId,
    changedItem,
    actions$,
    request,
}: IAddSingleArgs<TItem>) => {
    const beginAction: AddSingleBeginAction<TItem> = {
        topicId,
        actionId: AddSingleBeginActionId,
        payload: { changedItem }
    }

    actions$.next(beginAction);

    from(request(changedItem))
        .subscribe((updatedItem) => {
            const endAction: AddSingleEndAction<TItem> = {
                topicId,
                actionId: AddSingleEndActionId,
                payload: { updatedItem }
            }

            actions$.next(endAction);
        })
}

export const isAddSingleBeginAction = <TItem>(action: IBaseAction): action is AddSingleBeginAction<TItem> => {
    return action.actionId === AddSingleBeginActionId
}

export const isAddSingleEndAction = <TItem>(action: IBaseAction): action is AddSingleEndAction<TItem> => {
    return action.actionId === AddSingleEndActionId
}