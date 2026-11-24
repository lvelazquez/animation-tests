import { ITouchInfo } from "./gesture";
import { Point } from "./point";

/** Spring animation proof of concept: an element is pulled back to its anchor. */

export interface ISpringConfig {
  /** Pull towards the target per frame (0..1). Higher is stiffer. */
  spring: number;
  /** Velocity retained per frame (0..1). Lower damps faster. */
  friction: number;
}

export interface ISpringParams {
  onUpdate?: (motionValue: number) => void;
  onComplete?: () => void;
  onStart?: () => void;
}

export interface ISpringState {
  current: Point;
  velocity: Point;
}

/** Distance from the anchor under which the spring is considered at rest. */
export const REST_TOLERANCE = 0.05;

/** Default tuning, shared by the app and the spring class. */
export const DEFAULT_SPRING_CONFIG: ISpringConfig = {
  spring: 0.2,
  friction: 0.95
};

/** Advance the spring one frame. Pure: returns a new state. */
export function stepSpring(
  state: ISpringState,
  target: Point,
  config: ISpringConfig
): ISpringState {
  const velocity = target
    .subtract(state.current)
    .multiply(config.spring)
    .add(state.velocity)
    .multiply(config.friction);
  return { velocity, current: state.current.add(velocity) };
}

/** Linearly map `num` from [inMin, inMax] to [outMin, outMax]. */
export const scale = (
  num: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number => ((num - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

class SpringAnimate<T extends HTMLElement> {
  private element: T;
  private _config: ISpringConfig;
  private params: ISpringParams;
  private state: ISpringState = {
    current: new Point(0, 0),
    velocity: new Point(0, 0)
  };
  private target: Point = new Point(0, 0);
  private readonly anchor: Point = new Point(0, 0);
  private initial: Point = new Point(0, 0);
  private requestId = 0;
  private isDragging = false;
  private isAnimating = false;
  private isPaused = false;
  private reducedMotion = false;

  constructor(
    element: T,
    config: ISpringConfig = DEFAULT_SPRING_CONFIG,
    params: ISpringParams = {}
  ) {
    this.element = element;
    this._config = config;
    this.params = params;
  }

  public set config(config: ISpringConfig) {
    this._config = config;
  }

  /** When true the element snaps back to its anchor instead of oscillating. */
  public setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  public get paused(): boolean {
    return this.isPaused;
  }

  public start(): void {
    if (this.isAnimating || this.isPaused) return;
    this.isAnimating = true;
    this.animate();
  }

  public stop(): void {
    window.cancelAnimationFrame(this.requestId);
    this.isAnimating = false;
  }

  /** Freeze the element in place; input is ignored until resumed. */
  public pause(): void {
    this.isPaused = true;
    this.stop();
  }

  public resume(): void {
    this.isPaused = false;
    this.start();
  }

  /** Return the element to its anchor immediately. */
  public reset(): void {
    this.stop();
    this.isDragging = false;
    this.state = { current: this.anchor.clone(), velocity: new Point(0, 0) };
    this.target = this.anchor.clone();
    this.translate(0, 0);
    if (!this.isPaused) this.start();
  }

  public onGesture(touchInfo: ITouchInfo): void {
    if (this.isPaused) return;
    const { isDown, xDelta, yDelta } = touchInfo;
    this.isDragging = isDown;
    if (isDown) {
      this.target = new Point(xDelta + this.anchor.x, yDelta + this.anchor.y);
      this.start();
    } else {
      if (Math.hypot(xDelta, yDelta) > 0) {
        this.initial = this.target.clone();
        this.params.onStart?.();
      }
      this.release();
    }
  }

  /** Pull the element to an offset from its anchor (keyboard input). */
  public pullTo(x: number, y: number): void {
    if (this.isPaused) return;
    this.isDragging = true;
    this.target = new Point(x + this.anchor.x, y + this.anchor.y);
    this.start();
  }

  /** Let go of the element so the spring returns it to its anchor. */
  public release(): void {
    if (this.isPaused) return;
    if (this.isDragging && this.target.distance() > 0) {
      this.initial = this.target.clone();
      this.params.onStart?.();
    }
    this.isDragging = false;
    this.target = this.anchor.clone();
    if (this.reducedMotion) {
      this.state = { current: this.anchor.clone(), velocity: new Point(0, 0) };
    }
    this.start();
  }

  private translate(x: number, y: number): void {
    this.element.style.transform = `translate(${x}px, ${y}px)`;
  }

  private animate = (): void => {
    this.requestId = window.requestAnimationFrame(this.animate);
    if (this.isDragging) {
      this.state = { ...this.state, current: this.target.clone() };
    } else {
      this.state = stepSpring(this.state, this.target, this._config);
    }

    const { current } = this.state;
    if (current.distance() < REST_TOLERANCE && !this.isDragging) {
      this.state = { current: this.anchor.clone(), velocity: new Point(0, 0) };
      this.params.onComplete?.();
      this.stop();
      this.initial = new Point(0, 0);
    } else if (this.initial.distance() > 0) {
      const motionValue = scale(
        current.distance(),
        this.initial.distance(),
        this.anchor.distance(),
        0,
        1
      );
      this.params.onUpdate?.(Math.round(motionValue * 100) / 100);
    }

    this.translate(this.state.current.x, this.state.current.y);
  };
}

export default SpringAnimate;
