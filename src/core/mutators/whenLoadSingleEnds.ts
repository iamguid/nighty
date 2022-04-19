import { IBaseAction } from "../IBaseAction";
import { Mutator } from "../Mutator";
import { isLoadSingleEndAction } from "../operations/loadSingle";

export const whenLoadSingleEnds = <TItem>(
    idGetter: (item: TItem) => string
): Mutator<TItem[], IBaseAction> => {
    return ({ data, action }) => {
        if (isLoadSingleEndAction<TItem>(action)) {
            const actionItemId = idGetter(action.payload.item);
            const currentItemIndex = data.findIndex(d => idGetter(d) === actionItemId);

            if (currentItemIndex) {
                return { data: data.map((d, i) => i === currentItemIndex ? action.payload.item : d), action }
            } else {
                return { data: [...data, action.payload.item], action }
            }
        }

        return { data, action }
    }
}
