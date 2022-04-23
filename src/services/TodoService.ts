import { BehaviorSubject, distinctUntilChanged, map, Observable, Subject, tap } from "rxjs";
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
import { hardDeleteItem } from "../core/operations/hardDeleteSingle";

export class TodoService {
    private todoApi: TodoApi;
    private store: Map<string, WeakRef<BehaviorSubject<ITodoModel>>> = new Map(); // key - todoId
    private pollerTimerId: number | null = null;
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

    public startPoll() {
        if (this.pollerTimerId === null) {
            this.pollerTimerId = window.setInterval(this.poll, 3000)
        }
    }

    public stopPoll() {
        if (this.pollerTimerId !== null) {
            clearInterval(this.pollerTimerId);
            this.pollerTimerId = null;
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

    public getOnlyDoneTodos(): Observable<Observable<ITodoModel>[]> {
        return this.getAllTodos().pipe(
            map(data => data.filter(todo => (todo as BehaviorSubject<ITodoModel>).value.done)),
            distinctUntilChanged(),
        )
    }

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

    public softDeleteTodo(id: string): void {
        softDeleteItem({
            topicId: Symbol('softDeleteTodo'),
            accessor: this.accessor,
            id,
            actions$: this._actions$,
            request: this.todoApi.softDeleteTodo,
        })
    }

    public hardDeleteTodo(id: string): void {
        hardDeleteItem({
            topicId: Symbol('hardDeleteTodo'),
            accessor: this.accessor,
            id,
            actions$: this._actions$,
            request: this.todoApi.hardDeleteTodo,
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

    private todoGetter = (id: string): BehaviorSubject<ITodoModel> | null => {
        return this.store.get(id)?.deref() || null;
    }

    private todoSetter = (id: string, todo: BehaviorSubject<ITodoModel>): void => {
        const weakRef = new WeakRef(todo);
        this.store.set(id, weakRef);
    }

    private todoDeleter = (id: string): void => {
        this.store.delete(id);
    }

    private poll = async () => {
        const todosIds: string[] = [];

        for (const wrappedTodo of Array.from(this.store.values())) {
            const todo = wrappedTodo.deref();

            if (todo) {
                todosIds.push(todo.value.id!)
            }
        }

        const todos = await this.todoApi.getTodosByIds(todosIds);

        for (const todo of todos) {
            const wrappedTodo = this.store.get(todo.id!)?.deref();

            if (wrappedTodo) {
                wrappedTodo.next(todo);
            }
        }
    }
}
