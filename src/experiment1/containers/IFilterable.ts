import { FilterBuilder } from '@src/utils/filter/builder';

export type FilterPredicate<TData> = (data: TData) => boolean;

export interface IServerFilterable {
  /**
   * В ServerFilterable нужно вызывать метод changeFilter каждый раз при изменении фильтра.
   *
   * При серверной фильтрации нужно отправить запрос и обновить данные,
   * поэтому метод changeFilter нужно вызывать каждый раз при изменении значений фильтра.
   *
   * Работает это следующим образом:
   * 1) Меняются какие-то значения фильтра, допустим это computed поля
   * 2) После каждого изменения фильтра формируется новое условие фильтрации, используя FilterBuilder
   * 3) Вызывается метод changeFilter с новым фильтром
   * 4) Сформированное условие преобразуется в cel выражение
   * 5) Происходит reload данных, cel выражение подставляется в запрос
   */
  changeFilter(filter: FilterBuilder | null): Promise<void>;
}

export interface IClientFilterable<TData> {
  /**
   * В ClientFilterable достаточно задать ссылку на предикат.
   *
   * Благодаря mobx, при изменении computed полей используемых в предикате произойдет перерисовка,
   * поэтому changeFilter нужно задать всего 1 раз, указав ссылку на предикат.
   *
   * Работает это следующим образом:
   * 1) В классе ClientPaginator объявлено computed поле "data", которое в свою очередь вызывает метод dataTransformer
   * 2) dataTransformer использует внутри метод filter, который является ссылкой на предикат
   * 3) При вызове метода filter все поля, которые в нем используются, привязываются к computed полю "data",
   * поэтому и происходит перерисовка
   */
  changeFilter(filter: FilterPredicate<TData> | null): void;
}
