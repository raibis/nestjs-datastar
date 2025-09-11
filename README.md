# NestJS Datastar

<p align="center" font-size="200px">
<img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
<img width="120" height="120" src="https://data-star.dev/static/images/rocket-512x512.png">
</p>

## Description

`nestjs-datastar` is a **NestJS** module that provides a toolset for integrating **Datastar** with the **Pug** template engine to build reactive web applications.

### NestJS

[NestJS](https://nestjs.com) is a progressive Node.js framework for building efficient, reliable, and scalable server-side applications.

### Datastar

[Datastar](https://data-star.dev) is a lightweight framework for building everything from simple websites to real-time collaborative applications.

Read the [Getting Started Guide »](https://data-star.dev/guide/getting_started)

Latest Datastar client script available in the [Datastar GitHub Repository »](https://github.com/starfederation/datastar)

### Pug

[Pug](https://pugjs.org) is a high-performance template engine for Node.js.

Read the [Getting Started Guide »](https://pugjs.org/api/getting-started.html)

## Quick Start

### Installation

```bash
npm install nestjs-datastar
npm install pug
```

### Configuration

**Options:**

- **`baseViewDir`** — Glob pattern for locating Pug templates (e.g., `views/**/*.pug`).
- **`viewEngine?`** — The template engine to use. Currently, only `pug` is supported. Defaults to `pug`.
- **`isDevelopment?`** — Enables development mode. When enabled, the module watches for template file changes, recompiles them, and reloads automatically. Defaults to `true`.
- **`global?`** — Registers module as global. Defaults to `true`.

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

Here’s a simple example that reads client signals, updates both elements and signals, and executes a script.

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
  constructor(private readonly DS: DatastarService) {}

  // Render the initial HTML from a Pug template
  @Get()
  @Render('index')
  root() {}

  // Handle the @post('/merge') request from the Datastar client
  @PostDS('merge')
  updateClient(
    @SignalsDS() signals: Record<string, any>,
  ): Observable<MessageEvent> {
    return from([
      this.DS.patchElementsTemplate('merge', {
        word: 'World',
      }),
      this.DS.patchSignals(JSON.stringify({ foo: `${signals.foo} World` })),
      this.DS.executeScript('console.log("Hello World from server!")'),
    ]);
  }
}
```

## Examples

See the example projects in the `examples` folder:

- **`http://localhost:3000`** — A simple todo app using Datastar, DaisyUI and Pug.
- **`http://localhost:3000/basic`** — A basic example demonstrating Datastar with Pug.

# Module internals

## Decorators

Use method decorators to enable sending server-sent events (SSE) to clients. The controller method should return an `Observable<MessageEvent>`.

```typescript
export interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}
```

### `@GetDS(route: string)`

Method decorator for mapping Datastar client `@get` actions to specific controller methods.

### `@PostDS(route: string)`

Method decorator for mapping Datastar client `@post` actions to specific controller methods.

### `@PatchDS(route: string)`

Method decorator for mapping Datastar client `@patch` actions to specific controller methods.

### `@PutDS(route: string)`

Method decorator for mapping Datastar client `@put` actions to specific controller methods.

### `@DeleteDS(route: string)`

Method decorator for mapping Datastar client `@delete` actions to specific controller methods.

### `@SignalsDS()`

Controller method parameter decorator for accessing client request signals.

## DatastarService methods

Creates `MessageEvent` objects for sending to clients. All methods—except `patchElementsTemplate`—are taken from the [Datastar TypeScript SDK »](https://github.com/starfederation/datastar-typescript).

### `patchElementsTemplate(template, templateData, options?)`

Renders HTML from a Pug template with the provided data and returns a `MessageEvent`. This is used to patch HTML into the client DOM.

**Parameters:**

- **`template`** — Relative path to the Pug template.  
  For example, if `baseViewDir` is `views/**/*.pug` and the template is located at `views/partials/template.pug`, then the `template` parameter should be `partials/template`.
- **`templateData`** — Data object to pass to the Pug template.
- **`options`** — Optional object with additional settings:
  - **`mode`** — Patch mode. Possible values: `"outer"`, `"inner"`, `"replace"`, `"prepend"`, `"append"`, `"before"`, `"after"`, `"remove"`.
  - **`selector`** — CSS selector for targeting elements (required for some modes).
  - **`useViewTransition`** — Whether to use the View Transition API.

```typescript
datastarService.patchElementsTemplate('template', { name: 'World' });
```

### `patchElements(elements, options?)`

Patches HTML elements into the client DOM.

**Parameters:**

- **`elements`** — HTML string containing the elements to patch.
- **`options`** — Optional configuration:
  - **`mode`** — Patch mode. Possible values: `"outer"`, `"inner"`, `"replace"`, `"prepend"`, `"append"`, `"before"`, `"after"`, `"remove"`.
  - **`selector`** — CSS selector for targeting elements (required for some modes).
  - **`useViewTransition`** — Whether to use the View Transition API.

```typescript
datastarService.patchElements('<div id="myDiv">Updated content</div>');
```

### `removeElements(selector?, elements?, options?)`

Removes elements from the client DOM, either by CSS selector or by an HTML string containing element IDs.

**Parameters:**

- **`selector`** — CSS selector for elements to remove (optional; mutually exclusive with `elements`).
- **`elements`** — HTML string of elements with IDs to remove (optional; required if `selector` is not provided).
- **`options`** — Optional configuration object with the following properties:
  - **`eventId`** — ID of the event to associate with this removal.
  - **`retryDuration`** — Duration to retry the removal if it fails.

```typescript
// Remove by selector
datastarService.removeElements('#feed, #otherid');
// Remove by HTML elements with IDs
datastarService.removeElements(
  undefined,
  '<div id="first"></div><div id="second"></div>',
);
```

### `removeSignals(signalKeys, options?)`

Removes one or more signals from the client signal store.

**Parameters:**

- **`signalKeys`** — The signal key, or an array of keys, to remove.
- **`options`** — Optional configuration object with the following properties:
  - **`onlyIfMissing`** — Remove the signal only if it is missing on the client.
  - **`eventId`** — ID of the event associated with this removal.
  - **`retryDuration`** — Duration to retry the removal if it fails.

```typescript
// Remove a single signal
datastarService.removeSignals('foo');
// Remove multiple signals
datastarService.removeSignals(['foo', 'bar']);
```

### `executeScript(script, options?)`

Executes a script on the client by sending a `<script>` tag via server-sent events (SSE).

**Parameters:**

- **`script`** — The JavaScript code to execute.
- **`options`** — Optional configuration object:
  - **`autoRemove`** — If `true` (default), adds `data-effect="el.remove()"` to the script tag.
  - **`attributes`** — Object containing attributes for the `<script>` tag (preferred).
  - **`eventId`** — ID of the event associated with this script.
  - **`retryDuration`** — Duration to retry execution if it fails.

```typescript
// Execute a simple script
datastarService.executeScript('console.log("Hello from server!")');

// Execute a script and keep it in the DOM
datastarService.executeScript('alert("Persistent!")', { autoRemove: false });

// Execute with custom attributes (object form preferred)
datastarService.executeScript('doSomething()', {
  attributes: { type: 'module', async: 'true' },
});
```

## Development

```bash
npm run build
```
