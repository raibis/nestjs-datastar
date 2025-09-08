import {
  Controller,
  Get,
  MessageEvent,
  Render,
  Param,
  HttpCode,
  Delete,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { Observable, Subject, startWith } from 'rxjs';
import { GetDS, SignalsDS, DatastarService } from 'nestjs-datastar';

@Controller()
export class AppController {
  private updates$ = new Subject<MessageEvent>();

  private readonly todos = [
    { title: 'Learn NestJS', completed: false },
    { title: 'Learn Datastar', completed: false },
    { title: 'Build a Todo App', completed: false },
  ];
  constructor(private readonly DS: DatastarService) {}

  updateTodos(edit?: number) {
    return this.DS.patchElementsTemplate('components/todo/todo', {
      todos: this.todos,
      edit,
    });
  }

  @Get()
  @Render('layouts/base')
  index() {}

  @GetDS('updates')
  getTodos(): Observable<MessageEvent> {
    return this.updates$.pipe(startWith(this.updateTodos()));
  }

  @Patch('update/:index')
  @HttpCode(204)
  updateTodo(
    @Param('index') index: number,
    @SignalsDS() signals: Record<string, any>,
  ): void {
    if (index < 0) {
      this.todos.push({ title: String(signals?.input), completed: false });
    } else {
      this.todos[index] = { title: String(signals?.input), completed: false };
    }
    this.updates$.next(this.updateTodos());
  }

  @Delete('todo/:index')
  @HttpCode(204)
  deleteTodo(@Param('index') index: number): void {
    this.todos.splice(index, 1);
    this.updates$.next(this.updateTodos());
  }

  @Post('toggle/:index')
  @HttpCode(204)
  toggleTodo(@Param('index') index: number): void {
    if (index < 0) {
      const allCompleted = this.todos.every((todo) => todo.completed);
      this.todos.forEach((todo) => (todo.completed = !allCompleted));
    } else {
      this.todos[index].completed = !this.todos[index].completed;
    }
    this.updates$.next(this.updateTodos());
  }

  @Get('todo/:index')
  @HttpCode(204)
  editTodo(@Param('index') index: string): void {
    this.updates$.next(this.updateTodos(Number(index)));
  }

  @Put('cancel')
  @HttpCode(204)
  cancelEdit(): void {
    this.updates$.next(this.updateTodos());
  }
}
