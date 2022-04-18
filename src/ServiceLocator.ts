import { TodoApi } from './api/TodoApi';
import { EventEmitter } from './core/EventEmitter';
import { ITodoModel } from './models/TodoModel';

const initialTodos: ITodoModel[] = [
    { id: '2', title: 'Core library', description: 'Make core library' },
    { id: '1', title: 'Examples', description: 'Make some jxjs examples' },
];

export const eventsEmitter = new EventEmitter(); 
export const todoApi = new TodoApi(initialTodos);
