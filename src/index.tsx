import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';

// ReactDOM.render(
//   <React.StrictMode>
//     <App />
//   </React.StrictMode>,
//   document.getElementById('root')
// );

import { todoService } from "./ServiceLocator";

todoService.actions$.subscribe(action => console.info('Action fired', action));

const allTodos$ = todoService.getAllTodos();
const onlyDoneTodos$ = todoService.getOnlyDoneTodos();
const firstTodo$ = todoService.getTodoById('1');

allTodos$.subscribe(todos => {
  console.info('allTodos$ updated', todos)

  for (const todo of todos) {
    todo.subscribe(updated => {
      console.info(`allTodos$ -> todo[${updated.id!}] updated`, updated)
    })
  }
});

onlyDoneTodos$.subscribe(todos => {
  console.info('onlyDoneTodos$ updated', todos);

  for (const todo of todos) {
    todo.subscribe(updated => {
      console.info(`onlyDoneTodos$ -> todo[${updated.id!}] updated`, updated)
    })
  }
});

firstTodo$.subscribe(todo => {
  console.info('firstTodo$ updated', todo)

  todo?.subscribe(updated => {
    console.info(`firstTodo$ -> todo[${updated.id}] updated`, updated)
  })
});

todoService.addTodo({ 
  id: '4',
  title: 'Some TODO',
  description: 'Some TODO description',
  done: false,
  deleted: false,
});

todoService.deleteTodo('4');

todoService.updateTodo({
  id: '2',
  title: 'Title',
  description: 'Description',
  done: true,
  deleted: false,
})

todoService.updateTodo({
  id: '1',
  title: 'Title 2',
  description: 'Description 2',
  done: false,
  deleted: false,
})