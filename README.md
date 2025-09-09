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

#### Latest Datastar client script

[Datastar github repo »](https://data-star.dev/guide/getting_started)

### Pug

Pug is a high-performance template engine.

Read the [Getting Started Guide »](https://github.com/starfederation/datastar)

## Quick Start

### Installation

```bash
npm i nestjs-datastar
npm i pug
```

### Configuration

Options:

`baseViewDir` - Glob pattern for locating pug templates. (e.g. 'views/\*_/_.pug')

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
  constructor(private readonly DS: DatastarService) {}

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

See example projects in the `examples` folder.

- `localhost:3000` - Simple todo app with Datastar and Pug.
- `localhost:3000/basic` - Basic example with Datastar and Pug.

Details in the README file.

## Module internals

### Decorators

#### Datastar backend actions

Use thease methods to enable posibility send server-sent events to clients. Controller method should return `Observable<MessageEvent>`.

```typescript
export interface MessageEvent {
  data: string | object;
  id?: string;
  type?: string;
  retry?: number;
}
```

##### `@GetDS(route: string)`

Decorator for mapping clients datastar `@get` backend action to specific controller methods.

##### `@PostDS(route: string)`

Decorator for mapping clients datastar `@post` backend actions to specific controller methods.

##### `@PatchDS(route: string)`

Decorator for mapping clients datastar `@patch` backend actions to specific controller methods.

##### `@PutDS(route: string)`

Decorator for mapping clients datastar `@put` backend actions to specific controller methods.

##### `@DeleteDS(route: string)`

Decorator for mapping clients datastar `@delete` backend actions to specific controller methods.

#### Datastar signals

##### `@SignalsDS()`

Controller method parameter decorator for reading client request signals.

### DatastarService methods

Creates `MessageEvent` objects for sending to clients. All methods except `patchElementsTemplate` are taken from [Datastar TypeScript SDK »](https://github.com/starfederation/datastar-typescript)

#### `patchElementsTemplate(template, templateData, options?)`

Renders html from pug template with provided data and returns `MessageEvent`. Used to patch html into the client DOM.

**Parameters:**

- `template` - relative path to pug template. Eg if `baseViewDir` is `views/**/*.pug` and template is located at `views/partials/template.pug` then `template` parameter should be `partials/template`.
- `templateData` - data object for pug template.
- `options` - optional object with additional options.
  - `options.replace?: boolean` - when true, replaces element instead of merging. Default is false (merging).

**Options:**

- `mode`: Patch mode - "outer", "inner", "replace", "prepend", "append", "before", "after", "remove"
- `selector`: CSS selector for targeting elements (required for some modes)
- `useViewTransition`: Whether to use View Transition API

**Example:**

```javascript
datastarService.patchElementsTemplate('template', { name: 'World' });
```

#### `patchElements(elements, options?)`

Patches HTML elements into the client DOM.

**Parameters:**

- `elements`: HTML string containing elements to patch
- `options`: Optional configuration object with `mode` and `selector`

**Options:**

- `mode`: Patch mode - "outer", "inner", "replace", "prepend", "append", "before", "after", "remove"
- `selector`: CSS selector for targeting elements (required for some modes)
- `useViewTransition`: Whether to use View Transition API

**Example:**

```javascript
datastarService.patchElements('<div id="myDiv">Updated content</div>');
```

#### `removeElements(selector?, elements?, options?)`

Removes elements from the client DOM by selector or by HTML string with IDs.

**Parameters:**

- `selector`: CSS selector for elements to remove (optional; mutually exclusive with elements)
- `elements`: HTML string of elements with IDs to remove (optional; required if selector is not provided)
- `options`: Optional configuration object with `eventId`, `retryDuration`

**Examples:**

```javascript
// Remove by selector
datastarService.removeElements('#feed, #otherid');
// Remove by HTML elements with IDs
datastarService.removeElements(
  undefined,
  '<div id="first"></div><div id="second"></div>',
);
```

#### `removeSignals(signalKeys, options?)`

Removes one or more signals from the client signal store.

**Parameters:**

- `signalKeys`: The signal key or array of keys to remove
- `options`: Optional configuration object with `onlyIfMissing`, `eventId`, `retryDuration`

**Examples:**

```javascript
// Remove a single signal
datastarService.removeSignals('foo');
// Remove multiple signals
datastarService.removeSignals(['foo', 'bar']);
```

#### `executeScript(script, options?)`

Executes a script on the client by sending a `<script>` tag via SSE.

**Parameters:**

- `script`: The JavaScript code to execute
- `options`: Optional configuration object:
  - `autoRemove`: If true (default), adds data-effect="el.remove()" to the script tag
  - `attributes`: Object of script tag attributes (preferred)
  - `eventId`, `retryDuration`

**Examples:**

```javascript
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
