import { IBaseAction } from "../IBaseAction";
import { Mutator } from "../Mutator";
import { isSoftDeleteSingleEndAction } from "../operations/softDeleteSingle";
import { update } from "./update";

export const whenSoftDeleteSingleEnds = <TItem>(idGetter: (item: TItem) => string): Mutator<TItem[], IBaseAction> => {
    return ({ data, action }) => {
        if (isSoftDeleteSingleEndAction<TItem>(action)) {
            return { data: update(data, action.payload.updatedItem, idGetter), action }
        }

        return { data, action }
    }
}
