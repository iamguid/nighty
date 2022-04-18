import { map, Observable, pairwise, skipWhile, Subject } from "rxjs";
import { TodoApi } from "../api/TodoApi";
import { ITodoModel } from "../models/TodoModel";
import { IBaseAction } from "../core/IBaseAction";
import { Reducer } from "../core/Reducer";
import { loadItem } from "../core/operations/loadItem";
import { addItem } from "../core/operations/addItem";
import { softDeleteItem } from "../core/operations/softDeleteItem";
import { updateItem } from "../core/operations/updateItem";
import { loadAll } from "../core/operations/loadAll";

const InitialActionId = Symbol('INITIAL_ACTION')
const LoadTodoBeginActionId = Symbol('LOAD_TODO_BEGIN_ACTION')
const LoadTodoEndActionId = Symbol('LOAD_TODO_END_ACTION')
const LoadTodosBeginActionId = Symbol('LOAD_TODOS_BEGIN_ACTION')
const LoadTodosEndActionId = Symbol('LOAD_TODOS_END_ACTION')
const UpdateTodoBeginActionId = Symbol('UPDATE_TODO_BEGIN_ACTION');
const UpdateTodoEndActionId = Symbol('UPDATE_TODO_END_ACTION');
const DeleteTodoBeginActionId = Symbol('DELETE_TODO_BEGIN_ACTION');
const DeleteTodoEndActionId = Symbol('DELETE_TODO_END_ACTION');
const AddTodoBeginActionId = Symbol('ADD_TODO_BEGIN_ACTION');
const AddTodoEndActionId = Symbol('ADD_TODO_END_ACTION');

type InitialAction = IBaseAction<typeof InitialActionId>
type LoadTodoBiginAction = IBaseAction<typeof LoadTodoBeginActionId, { todoId: string }>
type LoadTodoEndAction = IBaseAction<typeof LoadTodoEndActionId, { todo: ITodoModel }>
type LoadTodosBeginAction = IBaseAction<typeof LoadTodosBeginActionId>
type LoadTodosEndAction = IBaseAction<typeof LoadTodosEndActionId, { todos: ITodoModel[] }>
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
        const initialData: ITodoModel[] = [];
        const initialAction: InitialAction = { id: InitialActionId, payload: null };

        const beginAction: LoadTodosBeginAction = {
            id: LoadTodosBeginActionId,
            payload: null,
        }

        const endAction: (todos: ITodoModel[]) => LoadTodosEndAction = (todos) => {
            return {
                id: LoadTodosEndActionId,
                payload: { todos },
            }
        }

        const reducer: Reducer<ITodoModel[], IBaseAction> = (prev, { data, action }) => {
            switch (action.id) {
                case AddTodoEndActionId:
                    return { data: [...prev.data, (action as AddTodoEndAction).payload.updatedTodo], action }
                case LoadTodosEndActionId:
                    return { data: (action as LoadTodosEndAction).payload.todos, action }
                case UpdateTodoEndActionId:
                case DeleteTodoEndActionId:
                    const updatedTodo = (action as UpdateTodoEndAction | DeleteTodoEndAction).payload.updatedTodo;
                    return { data: prev.data.map(d => d.id! === updatedTodo.id! ? updatedTodo : d), action }
            }

            return { data: prev.data, action };
        }

        return loadAll({
            actions$: this._actions$,
            initialData,
            initialAction,
            beginAction,
            endAction,
            request: this.todoApi.getAllTodos,
            reducer,
        })
    }

    public getOnlyDoneTodos(): Observable<ITodoModel[]> {
        return this.getAllTodos().pipe(
            map(todos => {
                return todos.filter(todo => todo.done)
            }),
            pairwise(),
            skipWhile(([prev, next]) => prev === next),
            map(([prev, next]) => next)
        )
    }

    public getTodoById(id: string): Observable<ITodoModel | null> {
        const initialData = null;
        const initialAction: InitialAction = { id: InitialActionId, payload: null };
        const beginAction: LoadTodoBiginAction = { id: LoadTodoBeginActionId, payload: { todoId: id } };
        const endAction: (todo: ITodoModel) => LoadTodoEndAction = (todo) => {
            return { id: LoadTodoEndActionId, payload: { todo: todo } };
        };

        const reducer: Reducer<ITodoModel | null, IBaseAction> = (prev, { data, action }) => {
            switch (action.id) {
                case LoadTodoEndActionId: {
                    const typedAction = (action as LoadTodoEndAction);
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

            return { data: prev.data, action };
        }

        return loadItem({
            id, 
            actions$: this._actions$,
            initialData,
            initialAction,
            beginAction,
            endAction,
            request: this.todoApi.getTodoById,
            reducer
        });
    }

    public updateTodo(todo: ITodoModel): void {
        const beginAction: UpdateTodoBeginAction = {
            id: UpdateTodoBeginActionId,
            payload: { changedTodo: todo },
        }

        const endAction: (todo: ITodoModel) => UpdateTodoEndAction = (updatedTodo) => {
            return {
                id: UpdateTodoEndActionId,
                payload: { updatedTodo },
            }
        }

        updateItem({
            item: todo,
            actions$: this._actions$,
            beginAction,
            endAction,
            request: this.todoApi.updateTodo,
        })
    }

    public deleteTodo(id: string): void {
        const beginAction: DeleteTodoBeginAction = {
            id: DeleteTodoBeginActionId,
            payload: { todoId: id },
        }

        const endAction: (todo: ITodoModel) => DeleteTodoEndAction = (todo) => {
            return {
                id: DeleteTodoEndActionId,
                payload: { updatedTodo: todo },
            }
        }

        softDeleteItem({
            id,
            actions$: this._actions$,
            beginAction,
            endAction,
            request: this.todoApi.deleteTodo,
        })
    }

    public addTodo(todo: ITodoModel): void {
        const beginAction: AddTodoBeginAction = {
            id: AddTodoBeginActionId,
            payload: { changedTodo: todo },
        }

        const endAction: (todo: ITodoModel) => AddTodoEndAction = (todo) => {
            return {
                id: AddTodoEndActionId,
                payload: { updatedTodo: todo },
            }
        }

        addItem({
            item: todo,
            actions$: this._actions$,
            beginAction,
            endAction,
            request: this.todoApi.createTodo,
        })
    }

    public get actions$(): Observable<IBaseAction> {
        return this._actions$.asObservable();
    }
}
