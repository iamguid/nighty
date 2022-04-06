export enum SortDirection {
  ASC,
  DESC,
}

export interface IClientSortable<TColumnsEnum> {
  changeSort(column: TColumnsEnum, dir: SortDirection): void;
}
