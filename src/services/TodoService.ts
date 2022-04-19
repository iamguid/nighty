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
    private store: Map<string, Subject<ITodoModel>> = new Map(); // key - todoId
    private _actions$: Subject<IBaseAction<any, any>> = new Subject();
    private accessor: IAccessor<ITodoModel>;

    constructor(todoApi: TodoApi) {
        this.todoApi = todoApi;

        this.accessor = {
            getId: this.todoIdGetter,
            get: this.todoGetter,
            set: this.todoSetter,
            delete: this.todoDeleter,
        }
    }

    public getAllTodos(): Observable<Observable<ITodoModel>[]> {
        return loadAll({
            topicId: Symbol('getAllTodos'),
            accessor: this.accessor,
            actions$: this._actions$,
            request: this.todoApi.getAllTodos,
        })
    }

    public getTodosPaginator(itemsPerPage: number): [Subject<void>, Observable<Observable<ITodoModel>[]>] {
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

    // public getOnlyDoneTodos(): Observable<Observable<ITodoModel>[]> {
    //     return this.getAllTodos().pipe(
    //         map(data => data.filter(todo => todo)),
    //         distinctUntilChanged(({ data: prevData }, { data: nextData }) => prevData === nextData),
    //     )
    // }

    public getTodoById(id: string): Observable<Observable<ITodoModel> | null> {
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
            accessor: this.accessor,
            changedItem: todo,
            actions$: this._actions$,
            request: this.todoApi.updateTodo,
        })
    }

    public deleteTodo(id: string): void {
        softDeleteItem({
            topicId: Symbol('deleteTodo'),
            accessor: this.accessor,
            id,
            actions$: this._actions$,
            request: this.todoApi.deleteTodo,
        })
    }

    public addTodo(todo: ITodoModel): void {
        addSingle({
            topicId: Symbol('addTodo'),
            accessor: this.accessor,
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

    private todoGetter = (id: string): Subject<ITodoModel> | null => {
        return this.store.get(id) || null;
    }

    private todoSetter = (id: string, todo: Subject<ITodoModel>): void => {
        this.store.set(id, todo);
    }

    private todoDeleter = (id: string): void => {
        this.store.delete(id);
    }
}
