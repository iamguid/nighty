export type DataTransformer<TData> = (data: TData[]) => TData[];

export interface IPaginator<TData> {
  readonly rawData: TData[];
  readonly data: TData[];
  readonly isLoading: boolean;
  readonly isInitialDataLoaded: boolean;

  setRowsPerPage(count: number): Promise<void>;
  getRowsPerPage(): number;
  loadNextPage(): Promise<void>;
  hasNextPage(): boolean;
  reload(): Promise<void>;
}
