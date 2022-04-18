import { EventEmitter } from './core/EventEmitter';
import { ITodoModel } from './models/TodoModel';
import { TodoApi } from './api/TodoApi';
import { TodoService } from './services/TodoService';

const initialTodos: ITodoModel[] = [
    { id: '2', title: 'Core library', description: 'Make core library', done: false },
    { id: '1', title: 'Examples', description: 'Make some jxjs examples', done: false },
];

export const eventsEmitter = new EventEmitter(); 
export const todoApi = new TodoApi(initialTodos);
export const todoService = new TodoService(todoApi);
