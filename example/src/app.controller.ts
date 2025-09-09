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
import { Observable, Subject, startWith, from } from 'rxjs';
import { DatastarService, GetDS, PostDS, SignalsDS } from 'nestjs-datastar';

enum Mode {
  All = 0,
  Active = 1,
  Completed = 2,
}

@Controller()
export class AppController {
  private updates$ = new Subject<MessageEvent>();
  private edit: number | undefined = undefined;
  private mode = Mode.All;
  private todos = [
    { title: 'Learn NestJS', completed: false },
    { title: 'Learn Datastar', completed: false },
    { title: 'Build a Todo App', completed: false },
  ];

  constructor(private readonly DS: DatastarService) {}

  filteredTodos() {
    if (this.mode === Mode.Active) {
      return this.todos.filter((todo) => !todo.completed);
    } else if (this.mode === Mode.Completed) {
      return this.todos.filter((todo) => todo.completed);
    }
    return this.todos;
  }

  updateTodos() {
    return this.DS.patchElementsTemplate('components/todo/todo', {
      todos: this.filteredTodos(),
      edit: this.edit,
      pendingCount: this.pendingCount(),
    });
  }

  updateMode(signals: Record<string, any>) {
    signals = signals || {};
    signals.mode = this.mode;
    return this.DS.patchSignals(JSON.stringify(signals));
  }

  pendingCount() {
    return this.todos.filter((todo) => !todo.completed).length;
  }

  //Todo example /
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
      this.edit = undefined;
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
    this.edit = parseInt(index, 10);
    this.updates$.next(this.updateTodos());
  }

  @Put('cancel')
  @HttpCode(204)
  cancelEdit(): void {
    this.edit = undefined;
    this.updates$.next(this.updateTodos());
  }

  @Put('mode/:mode')
  @HttpCode(204)
  setMode(
    @Param('mode') mode: string,
    @SignalsDS() signals: Record<string, any>,
  ): void {
    this.mode = parseInt(mode, 10);
    this.updates$.next(this.updateMode(signals));
    this.updates$.next(this.updateTodos());
  }

  //Basic example /basic
  @Get('basic')
  @Render('components/basic/index')
  root() {}

  @PostDS('basic/merge')
  updateClient(
    @SignalsDS() signals: Record<string, any>,
  ): Observable<MessageEvent> {
    return from([
      this.DS.patchElementsTemplate('components/basic/merge', {
        word: 'World',
      }),
      this.DS.patchSignals(JSON.stringify({ foo: `${signals.foo} World` })),
      this.DS.executeScript('console.log("Hello World from server!")'),
    ]);
  }
}
