import { Subject } from "rxjs";
import { IAccessor } from "../Accessor";

export interface IAppendArgs<TItem> {
    target: Subject<TItem>[],
    append: TItem[],
    accessor: IAccessor<TItem>,
}

export const append = <TItem>({
    target,
    append,
    accessor,
}: IAppendArgs<TItem>): Subject<TItem>[] => {
    const result: Subject<TItem>[] = [...target];

    for (const item of append) {
        const currentItemId = accessor.getId(item);
        const currentItem = accessor.get(currentItemId);

        if (currentItem) {
            result.push(currentItem)
        } else {
            throw new Error(`Cannot append, item with id ${currentItemId} does not exists`)
        }
    }

    return result;
}