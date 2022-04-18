import { EventEmitter } from './core/EventEmitter';
import { ITodoModel } from './models/TodoModel';
import { TodoApi } from './api/TodoApi';
import { TodoService } from './services/TodoService';

const initialTodos: ITodoModel[] = [
    { id: '1', title: 'Skretch idea', description: 'Skretch idea', deleted: false, done: true },
    { id: '2', title: 'Core library', description: 'Make core library', deleted: false, done: false },
    { id: '3', title: 'Examples', description: 'Make some examples', deleted: false, done: false },
];

export const eventsEmitter = new EventEmitter(); 
export const todoApi = new TodoApi(initialTodos);
export const todoService = new TodoService(todoApi);
