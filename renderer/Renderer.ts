import { v4 as uuid } from 'uuid';
import { RendererState } from './RendererState';
import { ElementState } from './ElementState';

export class Renderer {
  onReady?: (renderer: Renderer) => void;

  onLoad?: (renderer: Renderer) => void;

  onLoadComplete?: (renderer: Renderer) => void;

  onPlay?: (renderer: Renderer) => void;

  onPause?: (renderer: Renderer) => void;

  onError?: (renderer: Renderer, error: string) => void;

  onTimeChange?: (renderer: Renderer, time: number) => void;

  onActiveElementsChange?: (renderer: Renderer, elementIds: string[]) => void;

  onStateChange?: (renderer: Renderer, state: RendererState) => void;

  state?: RendererState;

  private readonly _iframe: HTMLIFrameElement;

  private _pendingPromises: Record<string, { resolve: (value: any) => void; reject: (reason: any) => void }> = {};

  constructor(public element: HTMLElement, mode: 'player' | 'interactive', publicToken: string) {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '100%');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('allow', 'autoplay');
    iframe.setAttribute('src', `https://creatomate.com/embed?mode=${mode}&token=${publicToken}`);
    iframe.style.border = 'none';
    iframe.style.display = 'none';

    element.innerHTML = '';
    element.append(iframe);

    window.addEventListener('message', this._handleMessage);

    this._iframe = iframe;
  }

  dispose() {
    window.removeEventListener('message', this._handleMessage);

    this._iframe.parentNode?.removeChild(this._iframe);
    this._iframe.setAttribute('src', '');
  }

  async loadTemplate(templateId: string): Promise<void> {
    const state = await this._sendCommand({ message: 'setTemplate', templateId }).catch((error) => {
      throw new Error(`Failed to load template: ${error.message}`);
    });

    // Show iframe
    this._iframe.style.display = '';

    return state;
  }

  async setSource(source: Record<string, any>, createUndoPoint = false): Promise<void> {
    const state = await this._sendCommand({ message: 'setSource', source, createUndoPoint }).catch((error) => {
      throw new Error(`Failed to set source: ${error.message}`);
    });

    // Show iframe
    this._iframe.style.display = '';

    return state;
  }

  getSource(
    state: { source: Record<string, any>; elements?: ElementState[] } | undefined = this.state,
  ): Record<string, any> {
    if (!state) {
      return {};
    } else if (state.elements) {
      return {
        ...state.source,
        elements: state.elements.map((element) => this.getSource(element)),
      };
    } else {
      return state.source;
    }
  }

  getElements(
    state: { source: Record<string, any>; elements?: ElementState[] } | undefined = this.state,
  ): ElementState[] {
    const elements = [];
    if (state) {
      if (state.source.type) {
        elements.push(state as ElementState);
      }

      if (Array.isArray(state.elements)) {
        for (const nestedElement of state.elements) {
          elements.push(...this.getElements(nestedElement));
        }
      }
    }
    return elements;
  }

  findElement(
    predicate: (element: ElementState) => boolean,
    state: { source: Record<string, any>; elements?: ElementState[] } | undefined = this.state,
  ): ElementState | undefined {
    if (state?.elements) {
      for (const element of state.elements) {
        if (predicate(element)) {
          return element;
        }

        if (element.elements) {
          const foundNestedElement = this.findElement(predicate, element);
          if (foundNestedElement) {
            return foundNestedElement;
          }
        }
      }
    }
    return undefined;
  }

  async setModifications(modifications: Record<string, any>): Promise<void> {
    return await this._sendCommand({ message: 'setModifications', modifications }).catch((error) => {
      throw new Error(`Failed to set modifications: ${error.message}`);
    });
  }

  async applyModifications(modifications: Record<string, any>): Promise<void> {
    return this._sendCommand({ message: 'applyModifications', modifications }).catch((error) => {
      throw new Error(`Failed to apply modifications: ${error.message}`);
    });
  }

  async undo(): Promise<void> {
    return this._sendCommand({ message: 'undo' }).catch((error) => {
      throw new Error(`Failed to undo: ${error.message}`);
    });
  }

  async redo(): Promise<void> {
    return this._sendCommand({ message: 'redo' }).catch((error) => {
      throw new Error(`Failed to redo: ${error.message}`);
    });
  }

  async setActiveElements(elementIds: string[]): Promise<void> {
    await this._sendCommand({ message: 'setActiveElements', elementIds }).catch((error) => {
      throw new Error(`Failed to set active elements: ${error.message}`);
    });
  }

  async setTime(time: number): Promise<void> {
    return this._sendCommand({ message: 'setTime', time }).catch((error) => {
      throw new Error(`Failed set time: ${error.message}`);
    });
  }

  async play(): Promise<void> {
    return this._sendCommand({ message: 'play' }).catch((error) => {
      throw new Error(`Failed to play: ${error.message}`);
    });
  }

  async pause(): Promise<void> {
    return this._sendCommand({ message: 'pause' }).catch((error) => {
      throw new Error(`Failed to pause: ${error.message}`);
    });
  }

  private _sendCommand(message: Record<string, any>): Promise<any> {
    const id = uuid();
    this._iframe.contentWindow?.postMessage({ id, ...JSON.parse(JSON.stringify(message)) }, '*');

    // Create pending promise
    return new Promise((resolve, reject) => (this._pendingPromises[id] = { resolve, reject }));
  }

  // Defined as arrow function to make it bound to this instance when used with window.addEventListener above.
  private _handleMessage = (e: MessageEvent<any>) => {
    if (!e.data || typeof e.data !== 'object') {
      return;
    }

    const { id, message, error, ...args } = e.data;

    if (id) {
      // Resolve pending promise
      const pendingPromise = this._pendingPromises[id];
      if (pendingPromise) {
        if (error) {
          pendingPromise.reject(new Error(error));
        } else {
          pendingPromise.resolve(args);
        }

        // Clean up
        delete this._pendingPromises[id];
      }
    } else {
      switch (message) {
        case 'onReady':
          if (this.onReady) {
            this.onReady(this);
          }
          break;

        case 'onLoad':
          if (this.onLoad) {
            this.onLoad(this);
          }
          break;

        case 'onLoadComplete':
          if (this.onLoadComplete) {
            this.onLoadComplete(this);
          }
          break;

        case 'onPlay':
          if (this.onPlay) {
            this.onPlay(this);
          }
          break;

        case 'onPause':
          if (this.onPause) {
            this.onPause(this);
          }
          break;

        case 'onError':
          if (this.onError) {
            this.onError(this, args.error);
          }
          break;

        case 'onTimeChange':
          if (this.onTimeChange) {
            this.onTimeChange(this, args.time);
          }
          break;

        case 'onActiveElementsChange':
          if (this.onActiveElementsChange) {
            this.onActiveElementsChange(this, args.elementIds);
          }
          break;

        case 'onStateChange':
          this.state = args.state;
          if (this.onStateChange) {
            this.onStateChange(this, args.state);
          }
          break;
      }
    }
  };
}
