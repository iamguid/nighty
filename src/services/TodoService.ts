import { map, Observable, pairwise, skipWhile, Subject } from "rxjs";
import { TodoApi } from "../api/TodoApi";
import { ITodoModel } from "../models/TodoModel";
import { IBaseAction } from "../core/IBaseAction";
import { Reducer } from "../core/Reducer";
import { isLoadSingleEndAction, loadSingle } from "../core/operations/loadSingle";
import { addSingle, isAddSingleEndAction } from "../core/operations/addSingle";
import { isSoftDeleteSingleEndAction, softDeleteItem } from "../core/operations/softDeleteSingle";
import { isUpdateSingleEndAction, updateItem } from "../core/operations/updateSingle";
import { isLoadAllEndAction, loadAll } from "../core/operations/loadAll";

const todoStoreId = Symbol('TODO_STORE');

export class TodoService {
    private todoApi: TodoApi;
    private _actions$: Subject<IBaseAction<any, any>>;

    constructor(todoApi: TodoApi) {
        this.todoApi = todoApi;
        this._actions$ = new Subject();
    }

    public getAllTodos(): Observable<ITodoModel[]> {
        const reducer: Reducer<ITodoModel[], IBaseAction> = (prev, { data, action }) => {
            if (isAddSingleEndAction<ITodoModel>(action)) {
                return { data: [...prev.data, action.payload.updatedItem], action }
            }

            if (isLoadAllEndAction<ITodoModel>(action)) {
                return { data: action.payload.items, action }
            }

            if (isUpdateSingleEndAction<ITodoModel>(action) || isSoftDeleteSingleEndAction<ITodoModel>(action)) {
                const updatedTodo = action.payload.updatedItem;
                return { data: prev.data.map(d => d.id! === updatedTodo.id! ? updatedTodo : d), action }
            }

            return { data: prev.data, action };
        }

        return loadAll({
            store: todoStoreId,
            actions$: this._actions$,
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
        const reducer: Reducer<ITodoModel | null, IBaseAction> = (prev, { data, action }) => {
            if (isLoadSingleEndAction<ITodoModel>(action)) {
                if (action.payload.item.id! === id) {
                    return { data: action.payload.item, action }
                }
            }

            if (isUpdateSingleEndAction<ITodoModel>(action) || isSoftDeleteSingleEndAction<ITodoModel>(action)) {
                if (action.payload.updatedItem.id! === id) {
                    return { data: action.payload.updatedItem, action }
                }
            }

            return { data: prev.data, action };
        }

        return loadSingle({
            store: todoStoreId,
            id, 
            actions$: this._actions$,
            request: this.todoApi.getTodoById,
            reducer
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
}
