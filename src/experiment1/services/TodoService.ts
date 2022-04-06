import { ITodoModel } from "../models/TodoModel";

export class TodoService {
    private todos: Map<string, ITodoModel> = new Map();

    constructor(todos: ITodoModel[]) {
        todos.forEach((todo) => {
            this.todos.set(todo.id, todo);
        });
    }

    public getTodoById(id: string): Promise<ITodoModel> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(this.todos.get(id)!);
            }, 1000);
        });
    }

    public getTodos(): Promise<ITodoModel[]> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(Array.from(this.todos.values()));
            }, 1000);
        });
    }

    public updateTodo(todo: ITodoModel): Promise<ITodoModel> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.todos.set(todo.id, todo);
                resolve(todo);
            }, 1000);
        });
    }

    public createTodo(todo: ITodoModel): Promise<ITodoModel> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.todos.set(todo.id, todo);
                resolve(todo);
            }, 1000);
        });
    }

    public deleteTodo(id: string) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                this.todos.delete(id);
                resolve(undefined);
            }, 1000);
        });
    }
}
