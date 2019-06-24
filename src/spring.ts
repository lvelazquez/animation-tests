import { ITouchInfo } from "./gesture";
import { Point } from "./point";
/*
 *  SPRING ANIMATION PoC
 */

export interface ISpringConfig {
  spring: number;
  friction: number;
}

export interface ISpringParams {
  onUpdate?: (motionValue: number) => void;
  onComplete?: () => void;
  onStart?: () => void;
}

class SpringAnimate<T extends Element> {
  private element: T;
  private _config: ISpringConfig;
  // private x: number;
  // private y: number;
  private current: Point = new Point(0, 0);
  private target: Point = new Point(0, 0);
  // private targetX: number;
  // private targetY: number;
  private velocity: Point = new Point(0, 0);
  // private vx: number;
  // private vy: number;
  private requestId: number;
  private anchor: Point = new Point(0, 0);
  // private anchorX: number = 0;
  // private anchorY: number = 0;
  private _isDragging: boolean = false;
  private _isAnimating: boolean = false;
  private tolerance: number = 0.05;
  private initial: Point;
  // private initialX: number = 0;
  // private initialY: number = 0;
  private motionValue: number = 0;
  private _params: ISpringParams;

  constructor(
    element: T,
    _config: ISpringConfig = { spring: 0.1, friction: 0.95 },
    _params: ISpringParams
  ) {
    this.element = element;
    this._config = _config;
    this._params = _params;
  }

  public start(): void {
    this._isAnimating = true;
    this.animate();
  }
  public stop(): void {
    window.cancelAnimationFrame(this.requestId);
  }

  private scale = (
    num: number,
    in_min: number,
    in_max: number,
    out_min: number,
    out_max: number
  ): number => {
    return ((num - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
  };

  public onGesture(touchInfo: ITouchInfo): void {
    const { isDown, xDelta, yDelta }: ITouchInfo = touchInfo;
    this._isDragging = isDown;
    if (isDown) {
      this.target = new Point(xDelta + this.anchor.x, yDelta + this.anchor.y);

      if (!this._isAnimating) {
        this.start();
      }
    } else {
      if (Math.hypot(xDelta, yDelta) > 0) {
        this.initial = this.target.clone();
        if (this._params.onStart) this._params.onStart();
      }
      this.target = this.anchor.clone();
    }
  }

  public translate = (x: number, y: number): void => {
    // transform: translate(x,y)
    this.element.attributeStyleMap.set(
      "transform",
      new CSSTransformValue([new CSSTranslate(CSS.px(x), CSS.px(y))])
    );
  };

  /* 
  - after dragging on a distance of 
  - make bounce over floor and wall but if on screen 1 exit through right
  (some kind of device to hide it from screen 1) make it wrap around the left
  - use throw spring attached like a yo yo
  */

  private animate = (): void => {
    this.requestId = window.requestAnimationFrame(this.animate);
    if (!this._isDragging) {
      this.velocity = this.target
        .subtract(this.current)
        .multiply(this._config.spring)
        .add(this.velocity);
      this.velocity = this.velocity.multiply(this._config.friction);
      this.current = this.velocity.add(this.current);
    } else {
      this.current = this.target.clone();
    }

    if (this.current.distance() < this.tolerance && !this._isDragging) {
      if (this._params.onComplete) this._params.onComplete();
      this._isAnimating = false;
      this.initial = new Point(0, 0);
      window.cancelAnimationFrame(this.requestId);
    } else {
      if (Math.abs(this.initial.distance()) > 0) {
        const motionValue = this.scale(
          Math.abs(this.current.distance()),
          Math.abs(this.initial.distance()),
          Math.abs(this.anchor.distance()),
          0,
          1
        );
        this.motionValue = Math.round(motionValue * 100) / 100;
        if (this._params.onUpdate) this._params.onUpdate(this.motionValue);
      }
    }

    this.translate(this.current.x, this.current.y);
  };
}

export default SpringAnimate;
