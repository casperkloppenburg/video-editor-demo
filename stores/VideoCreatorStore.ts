import { makeAutoObservable, runInAction } from 'mobx';
import { v4 as uuid } from 'uuid';
import { Renderer } from '../renderer/Renderer';
import { RendererState } from '../renderer/RendererState';
import { ElementState } from '../renderer/ElementState';
import { groupBy } from '../utility/groupBy';
import { deepClone } from '../utility/deepClone';

class VideoCreatorStore {
  renderer?: Renderer = undefined;

  state?: RendererState = undefined;

  tracks?: Map<number, ElementState[]> = undefined;

  activeElementIds: string[] = [];

  isLoading = true;

  isPlaying = false;

  time = 0;

  timelineScale = 100;

  isScrubbing = false;

  constructor() {
    makeAutoObservable(this);
  }

  initializeVideoPlayer(htmlElement: HTMLElement) {
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = undefined;
    }

    const renderer = new Renderer(htmlElement, 'interactive', 'YOUR_PUBLIC_TOKEN_HERE');

    this.renderer = renderer;

    renderer.onReady = async () => {
      await renderer.setSource(this.getDefaultSource());
    };

    renderer.onLoad = async () => {
      runInAction(() => (this.isLoading = true));
    };

    renderer.onLoadComplete = async () => {
      runInAction(() => (this.isLoading = false));
    };

    renderer.onPlay = () => {
      runInAction(() => (this.isPlaying = true));
    };

    renderer.onPause = () => {
      runInAction(() => (this.isPlaying = false));
    };

    renderer.onTimeChange = (renderer, time) => {
      if (!this.isScrubbing) {
        runInAction(() => (this.time = time));
      }
    };

    renderer.onActiveElementsChange = (renderer, elementIds) => {
      runInAction(() => (this.activeElementIds = elementIds));
    };

    renderer.onStateChange = (renderer, state) => {
      runInAction(() => {
        this.state = state;
        this.tracks = groupBy(state.elements, (element) => element.track);
      });
    };
  }

  async setTime(time: number): Promise<void> {
    this.time = time;
    await this.renderer?.setTime(time);
  }

  async setActiveElements(...elementIds: string[]): Promise<void> {
    this.activeElementIds = elementIds;
    await this.renderer?.setActiveElements(elementIds);
  }

  getActiveElement(): ElementState | undefined {
    if (!this.renderer || this.activeElementIds.length === 0) {
      return undefined;
    }

    const id = videoCreator.activeElementIds[0];
    return this.renderer.findElement((element) => element.source.id === id, this.state);
  }

  async createElement(elementSource: Record<string, any>): Promise<void> {
    const renderer = this.renderer;
    if (!renderer || !renderer.state) {
      return;
    }

    const source = renderer.getSource();
    const newTrack = Math.max(...renderer.state.elements.map((element) => element.track)) + 1;

    const id = uuid();

    source.elements.push({
      id,
      track: newTrack,
      ...elementSource,
    });

    await renderer.setSource(source, true);

    await this.setActiveElements(id);
  }

  async deleteElement(elementId: string): Promise<void> {
    const renderer = this.renderer;
    if (!renderer || !renderer.state) {
      return;
    }

    // Clone the current renderer state
    const state = deepClone(renderer.state);

    // Remove the element
    state.elements = state.elements.filter((element) => element.source.id !== elementId);

    // Set source by the mutated state
    await renderer.setSource(renderer.getSource(state), true);
  }

  async rearrangeTracks(track: number, direction: 'up' | 'down'): Promise<void> {
    const renderer = this.renderer;
    if (!renderer || !renderer.state) {
      return;
    }

    // The track number to swap with
    const targetTrack = direction === 'up' ? track + 1 : track - 1;
    if (targetTrack < 1) {
      return;
    }

    // Elements at provided track
    const elementsCurrentTrack = renderer.state.elements.filter((element) => element.track === track);
    if (elementsCurrentTrack.length === 0) {
      return;
    }

    // Clone the current renderer state
    const state = deepClone(renderer.state);

    // Swap track numbers
    for (const element of state.elements) {
      if (element.track === track) {
        element.source.track = targetTrack;
      } else if (element.track === targetTrack) {
        element.source.track = track;
      }
    }

    // Set source by the mutated state
    await renderer.setSource(renderer.getSource(state), true);
  }

  async finishVideo(): Promise<any> {
    const renderer = this.renderer;
    if (!renderer) {
      return;
    }

    const response = await fetch('/api/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: renderer.getSource(),
      }),
    });

    return await response.json();
  }

  getDefaultSource() {
    return {
      output_format: 'mp4',
      width: 1080,
      height: 1080,
      elements: [
        {
          id: '062c5fa2-b9d1-4ebd-a8df-3f85f0d4ce89',
          type: 'image',
          track: 1,
          duration: 6.85,
          clip: true,
          animations: [
            {
              easing: 'linear',
              type: 'scale',
              fade: false,
              scope: 'element',
              end_scale: '150%',
              start_scale: '100%',
            },
          ],
          source:
            'https://creatomate-static.s3.amazonaws.com/video-creator-js/eberhard-grossgasteiger-y2azHvupCVo-unsplash.jpg',
        },
        {
          id: '46103952-a528-465c-be32-58a5678c929d',
          type: 'shape',
          track: 2,
          duration: 6.85,
          y: '79.7102%',
          width: '100%',
          height: '40.5796%',
          x_anchor: '50%',
          y_anchor: '50%',
          fill_color: [
            {
              offset: '0%',
              color: 'rgba(0,0,0,0)',
            },
            {
              offset: '100%',
              color: 'rgba(0,0,0,0.7)',
            },
          ],
          fill_mode: 'linear',
          path: 'M 0 0 L 100 0 L 100 100 L 0 100 L 0 0 Z',
        },
        {
          id: '54f16c97-bcb1-4cab-9c64-3b763bcc4b89',
          name: 'Text-1',
          type: 'text',
          track: 3,
          time: 0,
          duration: 6.85,
          dynamic: true,
          y: '72.5428%',
          width: '163.1503%',
          height: '73.2647%',
          x_scale: '50%',
          y_scale: '50%',
          y_alignment: '100%',
          fill_color: '#ffffff',
          animations: [
            {
              time: 'start',
              duration: 3,
              easing: 'quadratic-out',
              type: 'text-appear',
              split: 'word',
            },
          ],
          text: 'Duis eget ex nec ipsum semper tempus nec vitae ante.',
          font_weight: '800',
          line_height: '87%',
        },
      ],
    };
  }
}

export const videoCreator = new VideoCreatorStore();
