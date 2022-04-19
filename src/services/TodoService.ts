import { distinctUntilChanged, map, Observable, Subject } from "rxjs";
import { TodoApi } from "../api/TodoApi";
import { ITodoModel } from "../models/TodoModel";
import { IBaseAction } from "../core/IBaseAction";
import { loadSingle } from "../core/operations/loadSingle";
import { addSingle } from "../core/operations/addSingle";
import { softDeleteItem } from "../core/operations/softDeleteSingle";
import { updateItem } from "../core/operations/updateSingle";
import { loadAll as loadAll } from "../core/operations/loadAll";
import { loadPaginatable } from "../core/operations/loadPaginatable";
import { IAccessor } from "../core/Accessor";
import { DataWithAction } from "../core/Reducer";

export class TodoService {
    private todoApi: TodoApi;
    private store: Map<string, Observable<ITodoModel>> = new Map(); // key - todoId
    private _actions$: Subject<IBaseAction<any, any>> = new Subject();
    private accessor: IAccessor<ITodoModel>;

    constructor(todoApi: TodoApi) {
        this.todoApi = todoApi;

        this.accessor = {
            getId: this.todoIdGetter,
            get: this.todoGetter,
            set: this.todoSetter,
        }
    }

    public getAllTodos(): Observable<DataWithAction<ITodoModel[], IBaseAction>> {
        return loadAll({
            topicId: Symbol('getAllTodos'),
            accessor: this.accessor,
            actions$: this._actions$,
            request: this.todoApi.getAllTodos,
        })
    }

    public getTodosPaginator(itemsPerPage: number): [Subject<void>, Observable<DataWithAction<ITodoModel[], IBaseAction>>] {
        const paginator$ = new Subject<void>();

        const result$ = loadPaginatable({
            topicId: Symbol('getTodosPaginator'),
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
            topicId: Symbol('getTodoById'),
            accessor: this.accessor,
            id, 
            actions$: this._actions$,
            request: this.todoApi.getTodoById,
        });
    }

    public updateTodo(todo: ITodoModel): void {
        updateItem({
            topicId: Symbol('updateTodo'),
            changedItem: todo,
            actions$: this._actions$,
            request: this.todoApi.updateTodo,
        })
    }

    public deleteTodo(id: string): void {
        softDeleteItem({
            topicId: Symbol('deleteTodo'),
            id,
            actions$: this._actions$,
            request: this.todoApi.deleteTodo,
        })
    }

    public addTodo(todo: ITodoModel): void {
        addSingle({
            topicId: Symbol('addTodo'),
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

    private todoGetter = (id: string): Observable<ITodoModel> | null => {
        return this.store.get(id) || null;
    }

    private todoSetter = (id: string, todo: Observable<ITodoModel>): void => {
        this.store.set(id, todo);
    }
}
