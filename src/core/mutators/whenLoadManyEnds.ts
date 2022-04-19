import { IBaseAction } from "../IBaseAction";
import { Mutator } from "../Mutator";
import { isLoadManyEndAction } from "../operations/loadMany";

export const whenLoadManyEnds = <TItem>(
    idGetter: (item: TItem) => string
): Mutator<TItem[], IBaseAction> => {
    return ({ data, action }) => {
        if (isLoadManyEndAction<TItem>(action)) {
            // TODO: Implement
            return { data, action }
        }

        return { data, action }
    }
}
