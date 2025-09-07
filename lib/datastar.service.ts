import { Inject, Injectable, MessageEvent } from '@nestjs/common';
import { DatastarModuleOptions } from './datastar.module';
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import * as chokidar from 'chokidar';

import {
  DatastarEventOptions,
  DefaultMapping,
  EventType,
  PatchElementsOptions,
  PatchSignalsOptions,
  Jsonifiable,
  ElementPatchMode,
} from './datastar.types';

import {
  DatastarDatalineElements,
  DatastarDatalinePatchMode,
  DatastarDatalineSelector,
  DatastarDatalineSignals,
  DefaultSseRetryDurationMs,
  ElementPatchModes,
} from './datastar.constant';

export type ViewEngine = 'pug' | 'handlebars' | 'hbs';

export type ViewEngineModules = PugLike | HandlebarsLike;

export interface TemplateRenderer {
  compile(template: string): (context: Record<string, unknown>) => string;
}

interface PugLike {
  compile(template: string): (context: Record<string, any>) => string;
}

export class PugRenderer implements TemplateRenderer {
  constructor(private pug: PugLike) {}
  compile(template: string) {
    return this.pug.compile(template);
  }
}

interface HandlebarsLike {
  compile(template: string): (context: Record<string, any>) => string;
}

export class HandlebarsRenderer implements TemplateRenderer {
  constructor(private hbs: HandlebarsLike) {}
  compile(template: string) {
    return this.hbs.compile(template);
  }
}

@Injectable()
export class DatastarService {
  private renderer: TemplateRenderer | null = null;
  private templateCache: Map<string, (context: Record<string, any>) => string> =
    new Map();
  private fileCache: Map<string, string> = new Map();

  constructor(
    @Inject('DATASTAR_OPTIONS') private options: DatastarModuleOptions,
  ) {}

  private async onModuleInit(): Promise<void> {
    await this.loadEngine();
    this.loadTemplates();

    if (this.options.isDevelopment) {
      this.watchTemplates();
    }
  }
  private async loadEngine(): Promise<void> {
    try {
      const mod = (await import(this.options.viewEngine)) as ViewEngineModules;
      switch (this.options.viewEngine) {
        case 'pug':
          this.renderer = new PugRenderer(mod);
          break;
        case 'handlebars':
        case 'hbs':
          this.renderer = new HandlebarsRenderer(mod);
          break;
        default:
          throw new Error(`Unsupported template engine`);
      }
    } catch {
      throw new Error(
        `View engine "${this.options.viewEngine}" not found. Install it with "npm install ${this.options.viewEngine}".`,
      );
    }
  }

  private loadTemplates(): void {
    if (!this.renderer) {
      throw new Error('Renderer not initialized');
    }
    const pattern = path.resolve(process.cwd(), this.options.baseViewDir);
    const files = glob.sync(pattern);
    const root = path.resolve(
      process.cwd(),
      this.options.baseViewDir.split('/**')[0],
    );
    files.forEach((filePath) => {
      const rel = path.relative(root, filePath);
      const key = rel.replace(path.extname(rel), '');
      const templateContent = fs.readFileSync(filePath, 'utf-8');
      const compiledFn = this.renderer!.compile(templateContent);
      this.templateCache.set(key, compiledFn);
      this.fileCache.set(filePath, key);
    });
  }

  private watchTemplates(): void {
    const templateRoot = path.resolve(
      process.cwd(),
      this.options.baseViewDir.split('/**')[0],
    );
    const watcher = chokidar.watch(templateRoot, {
      persistent: true,
      ignoreInitial: true,
    });
    watcher
      .on('change', (filePath) => {
        this.compileAndUpdate(filePath);
      })
      .on('add', (filePath) => {
        this.compileAndUpdate(filePath);
      })
      .on('unlink', (filePath) => {
        const key = this.fileCache.get(filePath);
        if (key) {
          this.templateCache.delete(key);
          this.fileCache.delete(filePath);
        }
      });
  }

  private compileAndUpdate(filePath: string): void {
    if (!this.renderer) return;

    const templateContent = fs.readFileSync(filePath, 'utf-8');
    const compiledFn = this.renderer.compile(templateContent);

    const root = path.resolve(
      process.cwd(),
      this.options.baseViewDir.split('/**')[0],
    );
    const rel = path.relative(root, filePath);
    const key = rel.replace(path.extname(rel), '');

    this.templateCache.set(key, compiledFn);
    this.fileCache.set(filePath, key);
  }

  private render(templateName: string, context: Record<string, any>): string {
    if (!this.renderer) {
      throw new Error('Template renderer not initialized');
    }
    const compiledFn = this.templateCache.get(templateName);
    if (!compiledFn) {
      throw new Error(
        `Template "${templateName}" not found in path: ${this.options.baseViewDir}`,
      );
    }
    return compiledFn(context);
  }

  private send(
    event: EventType,
    dataLines: string[],
    options: DatastarEventOptions,
  ): MessageEvent {
    const { eventId, retryDuration } = options || {};
    return {
      id: eventId,
      type: event,
      data: dataLines.join('\n'),
      retry: retryDuration || DefaultSseRetryDurationMs,
    };
  }

  private validateElementPatchMode(
    mode: string,
  ): asserts mode is ElementPatchMode {
    if (!ElementPatchModes.includes(mode as ElementPatchMode)) {
      throw new Error(
        `Invalid ElementPatchMode: "${mode}". Valid modes are: ${ElementPatchModes.join(', ')}`,
      );
    }
  }

  private validateRequired(
    value: string | undefined,
    paramName: string,
  ): asserts value is string {
    if (!value || value.trim() === '') {
      throw new Error(`${paramName} is required and cannot be empty`);
    }
  }

  private hasDefaultValue(key: string, val: unknown): boolean {
    if (key in DefaultMapping) {
      return val === (DefaultMapping as Record<string, unknown>)[key];
    }
    return false;
  }

  private eachNewlineIsADataLine(prefix: string, data: string) {
    return data.split('\n').map((line) => {
      return `${prefix} ${line}`;
    });
  }

  private eachOptionIsADataLine(
    options: Record<string, Jsonifiable>,
  ): string[] {
    return Object.keys(options)
      .filter((key) => {
        return !this.hasDefaultValue(key, options[key]);
      })
      .flatMap((key) => {
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        return this.eachNewlineIsADataLine(key, options[key]!.toString());
      });
  }

  public patchElements(
    elements: string,
    options?: PatchElementsOptions,
  ): MessageEvent {
    const { eventId, retryDuration, ...renderOptions } =
      options || ({} as Partial<PatchElementsOptions>);
    // Validate patch mode if provided
    const patchMode = (renderOptions as Record<string, unknown>)[
      DatastarDatalinePatchMode
    ] as string;
    if (patchMode) {
      this.validateElementPatchMode(patchMode);
    }
    // Check if we're in remove mode with a selector
    const selector = (renderOptions as Record<string, unknown>)[
      DatastarDatalineSelector
    ] as string;
    const isRemoveWithSelector = patchMode === 'remove' && selector;
    // Validate required parameters - elements only required when not removing with selector
    if (!isRemoveWithSelector) {
      this.validateRequired(elements, 'elements');
    }
    // Per spec: If no selector specified, elements must have IDs (this validation would be complex
    // and is better handled client-side, but we ensure elements is not empty)
    if (!selector && patchMode === 'remove') {
      // For remove mode, elements parameter may be omitted when selector is supplied
      // but since we have no selector, we need elements with IDs
      if (!elements || elements.trim() === '') {
        throw new Error(
          'For remove mode without selector, elements parameter with IDs is required',
        );
      }
    }
    // Build data lines - skip elements data line if empty in remove mode with selector
    const dataLines = this.eachOptionIsADataLine(renderOptions);
    if (!isRemoveWithSelector || elements.trim() !== '') {
      dataLines.push(
        ...this.eachNewlineIsADataLine(DatastarDatalineElements, elements),
      );
    }
    return this.send('datastar-patch-elements', dataLines, {
      eventId,
      retryDuration,
    });
  }

  public patchElementsTemplate(
    template: string,
    templateData: Record<string, any>,
    options?: PatchElementsOptions,
  ): MessageEvent {
    const elements = this.render(template, templateData);
    return this.patchElements(elements, options);
  }

  public patchSignals(
    signals: string,
    options?: PatchSignalsOptions,
  ): MessageEvent {
    // Validate required parameters
    this.validateRequired(signals, 'signals');
    const { eventId, retryDuration, ...eventOptions } =
      options || ({} as Partial<PatchSignalsOptions>);
    const dataLines = this.eachOptionIsADataLine(eventOptions).concat(
      this.eachNewlineIsADataLine(DatastarDatalineSignals, signals),
    );
    return this.send('datastar-patch-signals', dataLines, {
      eventId,
      retryDuration,
    });
  }

  public executeScript(
    script: string,
    options?: {
      autoRemove?: boolean;
      attributes?: string[] | Record<string, string>;
      eventId?: string;
      retryDuration?: number;
    },
  ): MessageEvent {
    const {
      autoRemove = true,
      attributes = {},
      eventId,
      retryDuration,
    } = options || {};
    let attrString = '';
    // Handle attributes as object (preferred by test)
    if (
      attributes &&
      typeof attributes === 'object' &&
      !Array.isArray(attributes)
    ) {
      attrString = Object.entries(attributes)
        .map(([k, v]) => ` ${k}="${v}"`)
        .join('');
    } else if (Array.isArray(attributes)) {
      attrString = attributes.length > 0 ? ' ' + attributes.join(' ') : '';
    }
    // Only add data-effect if autoRemove is true
    if (autoRemove) {
      attrString += ' data-effect="el.remove()"';
    }
    const scriptTag = `<script${attrString}>${script}</script>`;
    const dataLines = [
      ...this.eachNewlineIsADataLine('mode', 'append'),
      ...this.eachNewlineIsADataLine('selector', 'body'),
      ...this.eachNewlineIsADataLine('elements', scriptTag),
    ];
    return this.send('datastar-patch-elements', dataLines, {
      eventId,
      retryDuration,
    });
  }

  public removeElements(
    selector?: string,
    elements?: string,
    options?: {
      eventId?: string;
      retryDuration?: number;
    },
  ): MessageEvent {
    // If selector is not provided, elements must be present and non-empty
    if (!selector && (!elements || elements.trim() === '')) {
      throw new Error(
        'Either selector or elements (with IDs) must be provided to remove elements.',
      );
    }
    return this.patchElements(elements ?? '', {
      selector,
      mode: 'remove',
      eventId: options?.eventId,
      retryDuration: options?.retryDuration,
    });
  }

  public removeSignals(
    signalKeys: string | string[],
    options?: {
      onlyIfMissing?: boolean;
      eventId?: string;
      retryDuration?: number;
    },
  ): MessageEvent {
    const keys = Array.isArray(signalKeys) ? signalKeys : [signalKeys];
    const patch: Record<string, null> = {};
    for (const key of keys) {
      patch[key] = null;
    }
    return this.patchSignals(JSON.stringify(patch), options);
  }
}
