import { concatMap, flatMap } from "rxjs";
import { expand, filter, map, Observable, Subject } from "rxjs";
import { TodoApi } from "../api/TodoApi";
import { ITodoModel } from "../models/TodoModel";

export class TodoService {
    private todoApi: TodoApi;
    private todos$: Subject<ITodoModel[]>;

    constructor(todoApi: TodoApi) {
        this.todoApi = todoApi;
        this.todos$ = new Subject();
    }

    public async reloadData() {
        const todos = await this.todoApi.getTodos();
        this.todos$.next(todos);
    }

    public getAllTodos$(): Observable<ITodoModel[]> {
        return this.todos$.asObservable();
    }

    public getOnlyDoneTodos$(): Observable<ITodoModel[]> {
        return this.todos$.pipe(
            map(todos => todos.filter((todo) => todo.done)),
        );
    }

    public getTodoById$(id: string): Observable<ITodoModel> {
        return new Observable(subscriber => {
            subscriber.next();
        })
    }

    public updateTodo$(todo: ITodoModel): Observable<ITodoModel> {
        return new Observable(subscriber => {
            subscriber.next();
        })
    }

    public deleteTodo$(id: string): Observable<ITodoModel> {
        return new Observable(subscriber => {
            subscriber.next();
        })
    }

    public addTodo$(todo: ITodoModel): Observable<ITodoModel> {
        return new Observable(subscriber => {
            subscriber.next();
        })
    }
}
