import { ITodoModel } from "../models/TodoModel";

export class TodoApi {
    private todos: Map<string, ITodoModel> = new Map();

    constructor(todos: ITodoModel[]) {
        todos.forEach((todo) => {
            this.todos.set(todo.id!, todo);
        });
    }

    public getTodoById = (id: string): Promise<ITodoModel> => {
        console.log('[TODO_API] getTodoById request', id)
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(this.todos.get(id)!);
                console.log('[TODO_API] response', id)
            }, 1000);
        });
    }

    public getAllTodos = (): Promise<ITodoModel[]> => {
        console.log('[TODO_API] getAllTodos request')
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(Array.from(this.todos.values()));
                console.log('[TODO_API] getAllTodos response')
            }, 1000);
        });
    }

    public updateTodo = (todo: ITodoModel): Promise<ITodoModel> => {
        console.log('[TODO_API] updateTodo request', todo);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.todos.set(todo.id!, todo);
                resolve(todo);
                console.log('[TODO_API] updateTodo response', todo);
            }, 1000);
        });
    }

    public createTodo = (todo: ITodoModel): Promise<ITodoModel> => {
        console.log('[TODO_API] createTodo request', todo);
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.todos.set(todo.id!, todo);
                resolve(todo);
                console.log('[TODO_API] createTodo response', todo);
            }, 1000);
        });
    }

    public deleteTodo = (id: string): Promise<ITodoModel> => {
        console.log('[TODO_API] deleteTodo request', id);

        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const deletedTodo = this.todos.get(id);
                deletedTodo!.deleted = true;
                resolve(deletedTodo!);
                console.log('[TODO_API] deleteTodo response', deletedTodo);
            }, 1000);
        });
    }
}
