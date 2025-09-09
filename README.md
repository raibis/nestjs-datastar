# NestJS Datastar

<p align="center" font-size="200px">
<img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
<img width="120" height="120" src="https://data-star.dev/static/images/rocket-512x512.png">
</p>

## Description

The `nestjs-datastar` is NestJS module adding toolset for integrating Datastar and template engine Pug for building reactive web applications.

### Datastar

Datastar is a lightweight framework for building everything from simple sites to real-time collaborative web applications.

Read the [Getting Started Guide »](https://data-star.dev/guide/getting_started)

### Pug

Pug is a high-performance template engine.

Read the [Getting Started Guide »](https://pugjs.org/api/getting-started.html)

## Quick Start

### Installation

```bash
npm i nestjs-datastar
npm i pug
```

### Configuration

Options:

`baseViewDir` - Glob pattern for locating Pug templates. (e.g. 'views/\*_/_.pug')

`viewEngine` - Current version support `pug` template engine.

`isDevelopment` - Enable development mode. When enabled module watches for template file changes, compiles and reloads them automatically.

```typescript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DatastarModule } from 'nestjs-datastar';

@Module({
  imports: [
    DatastarModule.forRoot({
      baseViewDir: 'views/**/*.pug',
      viewEngine: 'pug',
      isDevelopment: true,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
```

### Basic Usage

Here's a simple example that reads clients signals, patches elements and signals.

```pug
// views/index.pug
html
    head
        script(type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@main/bundles/datastar.js")
    body
        #toMerge(data-signals-foo="'Hello'" data-on-load="@post('/merge')") Hello
        div(data-text="$foo")
```

```pug
// views/merge.pug
#toMerge Hello #{word}
```

```typescript
// src/app.controller.ts
import { Controller, Get, MessageEvent, Render } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { PostDS, SignalsDS, DatastarService } from 'nestjs-datastar';

@Controller()
export class AppController {
  constructor(private readonly datastarService: DatastarService) {}

  // Rendering initial HTML from Pug template
  @Get()
  @Render('index')
  root() {}

  // Handling @post('/merge') request from Datastar client
  @PostDS('merge')
  updateClient(
    @SignalsDS() signals: Record<string, any>,
  ): Observable<MessageEvent> {
    return from([
      this.datastarService.patchElementsTemplate('merge', {
        word: 'World',
      }),
      this.datastarService.patchSignals(
        JSON.stringify({ foo: `${signals.foo} world` }),
      ),
    ]);
  }
}
```
