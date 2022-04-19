import { Subject } from "rxjs";

export type ItemIdGetter<TItem> = (item: TItem) => string;
export type ItemGetter<TItem> = (id: string) => Subject<TItem> | null;
export type ItemSetter<TItem> = (id: string, item: Subject<TItem>) => void;
export type ItemDeleter = (id: string) => void;

export interface IAccessor<TItem> {
    getId: ItemIdGetter<TItem>,
    get: ItemGetter<TItem>,
    set: ItemSetter<TItem>,
    delete: ItemDeleter,
}