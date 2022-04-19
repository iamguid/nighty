import { IBaseAction } from "../IBaseAction";
import { Mutator } from "../Mutator";
import { isUpdateSingleEndAction } from "../operations/updateSingle";
import { update } from "./update";

export const whenUpdateSingleEnds = <TItem>(idGetter: (item: TItem) => string): Mutator<TItem[], IBaseAction> => {
    return ({ data, action }) => {
        if (isUpdateSingleEndAction<TItem>(action)) {
            return { data: update(data, action.payload.updatedItem, idGetter), action }
        }

        return { data, action }
    }
}
