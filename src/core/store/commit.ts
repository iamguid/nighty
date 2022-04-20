import { BehaviorSubject, Subject } from "rxjs";
import { IAccessor } from "../Accessor";

export interface ICommitArgs<TItem> {
    updated: TItem[], 
    deleted?: TItem[] | string[],
    accessor: IAccessor<TItem>
}

export const commit = <TItem>({
    updated,
    deleted = [],
    accessor,
}: ICommitArgs<TItem>): BehaviorSubject<TItem>[] => {
    const result: BehaviorSubject<TItem>[] = [];

    for (const item of updated) {
        const itemId = accessor.getId(item);
        const currentSubject = accessor.get(itemId);

        if (currentSubject) {
            currentSubject.next(item)
            result.push(currentSubject);
        } else {
            const newSubject = new BehaviorSubject(item);
            accessor.set(itemId, newSubject);
            result.push(newSubject);
        }
    }

    for (const item of deleted) {
        const itemId = typeof item === 'string' ? item : accessor.getId(item);
        const currentSubject = accessor.get(itemId);

        if (currentSubject) {
            currentSubject.complete();
        }

        accessor.delete(itemId);
    }

    return result;
}