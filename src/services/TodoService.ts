import { distinctUntilChanged, map, Observable, Subject } from "rxjs";
import { TodoApi } from "../api/TodoApi";
import { ITodoModel } from "../models/TodoModel";
import { IBaseAction } from "../core/IBaseAction";
import { loadSingle } from "../core/operations/loadSingle";
import { addSingle } from "../core/operations/addSingle";
import { softDeleteItem } from "../core/operations/softDeleteSingle";
import { updateItem } from "../core/operations/updateSingle";
import { loadAll } from "../core/operations/loadAll";
import { loadPaginatable } from "../core/operations/loadPaginatable";
import { IAccessor } from "../core/Accessor";
import { DataWithAction } from "../core/Reducer";

const todoStoreId = Symbol('TODO_STORE');

export class TodoService {
    private todoApi: TodoApi;
    private _actions$: Subject<IBaseAction<any, any>>;
    private accessor: IAccessor<ITodoModel>;

    constructor(todoApi: TodoApi) {
        this.todoApi = todoApi;
        this._actions$ = new Subject();

        this.accessor = {
            getId: this.todoIdGetter,
            get: this.todoGetter,
            set: this.todoSetter,
        }
    }

    public getAllTodos(): Observable<DataWithAction<ITodoModel[], IBaseAction>> {
        return loadAll({
            store: todoStoreId,
            accessor: this.accessor,
            actions$: this._actions$,
            request: this.todoApi.getAllTodos,
        })
    }

    public getTodosPaginator(itemsPerPage: number): [Subject<void>, Observable<DataWithAction<ITodoModel[], IBaseAction>>] {
        const paginator$ = new Subject<void>();

        const result$ = loadPaginatable({
            store: todoStoreId,
            accessor: this.accessor,
            actions$: this._actions$,
            paginator$,
            itemsPerPage,
            request: () => Promise.resolve({ data: [], nextPageToken: '' }),
        })

        return [paginator$, result$]
    }

    public getOnlyDoneTodos(): Observable<DataWithAction<ITodoModel[], IBaseAction>> {
        return this.getAllTodos().pipe(
            map(({ data, action }) => ({ data: data.filter(todo => todo.done), action })),
            distinctUntilChanged(({ data: prevData }, { data: nextData }) => prevData === nextData),
        )
    }

    public getTodoById(id: string): Observable<DataWithAction<ITodoModel | null, IBaseAction>> {
        return loadSingle({
            store: todoStoreId,
            accessor: this.accessor,
            id, 
            actions$: this._actions$,
            request: this.todoApi.getTodoById,
        });
    }

    public updateTodo(todo: ITodoModel): void {
        updateItem({
            store: todoStoreId,
            changedItem: todo,
            actions$: this._actions$,
            request: this.todoApi.updateTodo,
        })
    }

    public deleteTodo(id: string): void {
        softDeleteItem({
            store: todoStoreId,
            id,
            actions$: this._actions$,
            request: this.todoApi.deleteTodo,
        })
    }

    public addTodo(todo: ITodoModel): void {
        addSingle({
            store: todoStoreId,
            changedItem: todo,
            actions$: this._actions$,
            request: this.todoApi.createTodo,
        })
    }

    public get actions$(): Observable<IBaseAction> {
        return this._actions$.asObservable();
    }

    private todoIdGetter = (todo: ITodoModel): string => {
        return todo.id!;
    }

    private todoGetter = (id: string): ITodoModel => {
    }

    private todoSetter = (todo: ITodoModel): void => {
    }
}
