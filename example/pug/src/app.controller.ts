import { Controller, Get, MessageEvent, Render, Param } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import {
  GetDS,
  DeleteDS,
  PostDS,
  PatchDS,
  SignalsDS,
  DatastarService,
} from 'nestjs-datastar';

@Controller()
export class AppController {
  private readonly todos = [
    { title: 'Learn NestJS', completed: false },
    { title: 'Learn Datastar', completed: false },
    { title: 'Build a Todo App', completed: false },
  ];
  constructor(private readonly DS: DatastarService) {}

  updateTodos() {
    return from([
      this.DS.patchElementsTemplate('todos', { todos: this.todos }),
    ]);
  }

  @Get()
  @Render('index')
  index() {}

  @GetDS('todos')
  getTodos(): Observable<MessageEvent> {
    return this.updateTodos();
  }

  @PatchDS('update/:index')
  updateTodo(
    @Param('index') index: number,
    @SignalsDS() signals: Record<string, any>,
  ): Observable<MessageEvent> {
    if (index < 0) {
      this.todos.push({ title: String(signals?.input), completed: false });
    } else {
      this.todos[index] = { title: String(signals?.input), completed: false };
    }
    return this.updateTodos();
  }

  @DeleteDS('todo/:index')
  deleteTodo(@Param('index') index: number): Observable<MessageEvent> {
    this.todos.splice(index, 1);
    return this.updateTodos();
  }

  @PostDS('toggle/:index')
  toggleTodo(@Param('index') index: number): Observable<MessageEvent> {
    if (index < 0) {
      const allCompleted = this.todos.every((todo) => todo.completed);
      this.todos.forEach((todo) => (todo.completed = !allCompleted));
      return this.updateTodos();
    } else {
      this.todos[index].completed = !this.todos[index].completed;
    }
    return this.updateTodos();
  }
}
