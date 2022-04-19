import { Observable } from "rxjs";

export type ItemIdGetter<TItem> = (item: TItem) => string;
export type ItemGetter<TItem> = (id: string) => Observable<TItem> | null;
export type ItemSetter<TItem> = (id: string, item: Observable<TItem>) => void;

export interface IAccessor<TItem> {
    get: ItemGetter<TItem>,
    set: ItemSetter<TItem>,
    getId: ItemIdGetter<TItem>
}