import { type } from "os";
import { combineLatest, from, map, Observable, of, pairwise, scan, skipWhile, Subject } from "rxjs";
import { TodoApi } from "../api/TodoApi";
import { ITodoModel } from "../models/TodoModel";

export type ActionId = string | number | symbol;
export interface IBaseAction<TId extends ActionId = any, TPayload = null> {
  id: TId;
  payload: TPayload;
}

type DataWithAction<TData, TAction extends IBaseAction<any, any>> = { data: TData, action: TAction }

const InitialActionId = Symbol('INITIAL_ACTION')
const LoadingTodoBeginActionId = Symbol('LOADING_TODO_BEGIN_ACTION')
const LoadingTodoEndActionId = Symbol('LOADING_TODO_END_ACTION')
const LoadingTodosBeginActionId = Symbol('LOADING_TODOS_BEGIN_ACTION')
const LoadingTodosEndActionId = Symbol('LOADING_TODOS_END_ACTION')
const UpdateTodoBeginActionId = Symbol('UPDATE_TODO_BEGIN_ACTION');
const UpdateTodoEndActionId = Symbol('UPDATE_TODO_END_ACTION');
const DeleteTodoBeginActionId = Symbol('DELETE_TODO_BEGIN_ACTION');
const DeleteTodoEndActionId = Symbol('DELETE_TODO_END_ACTION');
const AddTodoBeginActionId = Symbol('ADD_TODO_BEGIN_ACTION');
const AddTodoEndActionId = Symbol('ADD_TODO_END_ACTION');

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadingTodoBiginAction = IBaseAction<typeof LoadingTodoBeginActionId, { todoId: string }>
type LoadingTodoEndAction = IBaseAction<typeof LoadingTodoEndActionId, { todo: ITodoModel }>
type LoadingTodosBeginAction = IBaseAction<typeof LoadingTodosBeginActionId>
type LoadingTodosEndAction = IBaseAction<typeof LoadingTodosEndActionId, { todos: ITodoModel[] }>
type UpdateTodoBeginAction = IBaseAction<typeof UpdateTodoBeginActionId, { changedTodo: ITodoModel }>
type UpdateTodoEndAction = IBaseAction<typeof UpdateTodoEndActionId, { updatedTodo: ITodoModel }>
type DeleteTodoBeginAction = IBaseAction<typeof DeleteTodoBeginActionId, { todoId: string }>
type DeleteTodoEndAction = IBaseAction<typeof DeleteTodoEndActionId, { updatedTodo: ITodoModel }>
type AddTodoBeginAction = IBaseAction<typeof AddTodoBeginActionId, { changedTodo: ITodoModel }>
type AddTodoEndAction = IBaseAction<typeof AddTodoEndActionId, { updatedTodo: ITodoModel }>

export class TodoService {
    private todoApi: TodoApi;
    private _actions$: Subject<IBaseAction<any, any>>;

    constructor(todoApi: TodoApi) {
        this.todoApi = todoApi;
        this._actions$ = new Subject();
    }

    public getAllTodos(): Observable<ITodoModel[]> {
        const initial: DataWithAction<ITodoModel[], IBaseAction<any, any>> = {
            data: [],
            action: { id: InitialActionId, payload: null },
        }

        const dataWithAction$ = combineLatest({
            data: of([] as ITodoModel[]),
            action: this._actions$,
        });

        const reducer$ = dataWithAction$.pipe(
            scan((accum, { data, action }) => {
                switch (action.id) {
                    case AddTodoEndActionId:
                        return { data: [...accum.data, (action as AddTodoEndAction).payload.updatedTodo], action }
                    case LoadingTodosEndActionId:
                        return { data: (action as LoadingTodosEndAction).payload.todos, action }
                    case UpdateTodoEndActionId:
                    case DeleteTodoEndActionId:
                        const updatedTodo = (action as UpdateTodoEndAction | DeleteTodoEndAction).payload.updatedTodo;
                        return { data: accum.data.map(d => d.id! === updatedTodo.id! ? updatedTodo : d), action }
                }

                return { data: accum.data, action };
            }, initial),
            pairwise(),
            skipWhile(([prev, next]) => prev.data === next.data),
            map(([prev, next]) => next.data)
        )

        const beginAction: LoadingTodosBeginAction = {
            id: LoadingTodosBeginActionId,
            payload: null,
        }

        this._actions$.next(beginAction);

        from(this.todoApi.getAllTodos())
            .subscribe((todos) => {
                const endAction: LoadingTodosEndAction = {
                    id: LoadingTodosEndActionId,
                    payload: { todos },
                }

                this._actions$.next(endAction);
            })

        return reducer$;
    }

    public getOnlyDoneTodos(): Observable<ITodoModel[]> {
        return this.getAllTodos().pipe(
            map(todos => {
                return todos.filter(todo => todo.done)
            })
        )
    }

    public getTodoById(id: string): Observable<ITodoModel | null> {
        const initial: DataWithAction<ITodoModel | null, IBaseAction<any, any>> = {
            data: null,
            action: { id: InitialActionId, payload: null },
        }

        const dataWithAction$: Observable<DataWithAction<ITodoModel | null, IBaseAction<any, any>>> = combineLatest({
            data: of(null),
            action: this._actions$,
        });

        const reducer$ = dataWithAction$.pipe(
            scan((accum, { data, action }) => {
                switch (action.id) {
                    case LoadingTodoEndActionId: {
                        const typedAction = (action as LoadingTodoEndAction);
                        if (typedAction.payload.todo.id! === id) {
                            return { data: action.payload.todo, action }
                        }
                    }
                        break;
                    case UpdateTodoEndActionId:
                    case DeleteTodoEndActionId: {
                        const typedAction = (action as UpdateTodoEndAction | DeleteTodoEndAction);
                        if (typedAction.payload.updatedTodo.id! === id) {
                            const updatedTodo = typedAction.payload.updatedTodo;
                            return { data: updatedTodo, action }
                        }
                    }
                        break;
                }

                return { data: accum.data, action };
            }, initial),

            map(({ data, action }) => {
                return data;
            })
        )

        const beginAction: LoadingTodoBiginAction = {
            id: LoadingTodoBeginActionId,
            payload: { todoId: id },
        }

        this._actions$.next(beginAction);

        from(this.todoApi.getTodoById(id))
            .subscribe((todo) => {
                const endAction: LoadingTodoEndAction = {
                    id: LoadingTodoEndActionId,
                    payload: { todo },
                }

                this._actions$.next(endAction);
            })

        return reducer$;
    }

    public updateTodo(todo: ITodoModel): void {
        const beginAction: UpdateTodoBeginAction = {
            id: UpdateTodoBeginActionId,
            payload: { changedTodo: todo },
        }

        this._actions$.next(beginAction);

        from(this.todoApi.updateTodo(todo))
            .subscribe((updatedTodo) => {
                const endAction: UpdateTodoEndAction = {
                    id: UpdateTodoEndActionId,
                    payload: { updatedTodo },
                }

                this._actions$.next(endAction);
            })
    }

    public deleteTodo(id: string): void {
        const beginAction: DeleteTodoBeginAction = {
            id: DeleteTodoBeginActionId,
            payload: { todoId: id },
        }

        this._actions$.next(beginAction);

        from(this.todoApi.deleteTodo(id))
            .subscribe((updatedTodo) => {
                const endAction: DeleteTodoEndAction = {
                    id: DeleteTodoEndActionId,
                    payload: { updatedTodo },
                }

                this._actions$.next(endAction);
            })
    }

    public addTodo(todo: ITodoModel): void {
        const beginAction: AddTodoBeginAction = {
            id: AddTodoBeginActionId,
            payload: { changedTodo: todo },
        }

        this._actions$.next(beginAction);

        from(this.todoApi.createTodo(todo))
            .subscribe((updatedTodo) => {
                const endAction: AddTodoEndAction = {
                    id: AddTodoEndActionId,
                    payload: { updatedTodo },
                }

                this._actions$.next(endAction);
            })
    }

    public get actions$(): Observable<IBaseAction> {
        return this._actions$.asObservable();
    }
}
