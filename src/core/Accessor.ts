export type ItemIdGetter<TItem> = (item: TItem) => string;
export type ItemGetter<TItem> = (id: string) => TItem;
export type ItemSetter<TItem> = (item: TItem) => void;

export interface IAccessor<TItem> {
    get: ItemGetter<TItem>,
    set: ItemSetter<TItem>,
    getId: ItemIdGetter<TItem>
}