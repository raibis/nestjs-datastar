import {
  DatastarDatalineElements,
  DatastarDatalinePatchMode,
  DatastarDatalineOnlyIfMissing,
  DatastarDatalineSelector,
  DatastarDatalineSignals,
  DatastarDatalineUseViewTransition,
  DefaultElementPatchMode,
  DefaultElementsUseViewTransitions,
  DefaultPatchSignalsOnlyIfMissing,
  EventTypes,
  ElementPatchModes,
} from './datastar.constant';

// Simple Jsonifiable type definition to replace npm:type-fest dependency
export type Jsonifiable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Jsonifiable[]
  | { [key: string]: Jsonifiable };

export type ElementPatchMode = (typeof ElementPatchModes)[number];

export type EventType = (typeof EventTypes)[number];

export interface DatastarEventOptions {
  eventId?: string;
  retryDuration?: number;
}

export interface ElementOptions extends DatastarEventOptions {
  [DatastarDatalineUseViewTransition]?: boolean;
}

export interface PatchElementsOptions extends ElementOptions {
  [DatastarDatalinePatchMode]?: ElementPatchMode;
  [DatastarDatalineSelector]?: string;
}

export interface patchElementsEvent {
  event: 'datastar-patch-elements';
  options: PatchElementsOptions;
  [DatastarDatalineElements]: string;
}

export interface PatchSignalsOptions extends DatastarEventOptions {
  [DatastarDatalineOnlyIfMissing]?: boolean;
}

export interface patchSignalsEvent {
  event: 'datastar-patch-signals';
  options: PatchSignalsOptions;
  [DatastarDatalineSignals]: Record<string, Jsonifiable>;
}

export type DatastarEvent = patchElementsEvent | patchSignalsEvent;

export const DefaultMapping = {
  [DatastarDatalinePatchMode]: DefaultElementPatchMode,
  [DatastarDatalineUseViewTransition]: DefaultElementsUseViewTransitions,
  [DatastarDatalineOnlyIfMissing]: DefaultPatchSignalsOnlyIfMissing,
} as const;
