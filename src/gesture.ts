// tslint:disable: unified-signatures
/* tslint:disable: member-ordering */
/* tslint:disable: prefer-for-of */
// tslint:disable: no-bitwise */

const emulatedTouchId: number = -1000;
const emulatedTouchForce: number = 1;

// Positions are all in Page coordinates
export interface ITouchInfo {
  /**
   * Indicates whether the finger or mouse button is currently down.
   */
  isDown: boolean;
  id: number;
  x: number;
  y: number;
  xInitial: number;
  yInitial: number;
  xDelta: number;
  yDelta: number;
  xVelocity: number;
  yVelocity: number;
  force: number;
  lastUpdateTime: number;
  updated: boolean;
}

interface ITouchEvent {
  touch: Touch;
  timeStamp: number;
  touchInContact: boolean;
}

function isITouchEvent(object: any): object is ITouchEvent {
  return (
    "touch" in object && "timeStamp" in object && "touchInContact" in object
  );
}

interface IGestureListenerInfo {
  listener?: (touchInfo: ITouchInfo) => void;
  touch: boolean;
  mouse: boolean;
}

enum InputType {
  Mouse = "Mouse",
  Touch = "Touch"
}

type InputEvents =
  | "mousedown"
  | "mouseup"
  | "mousemove"
  | "touchstart"
  | "touchmove"
  | "touchend"
  | "touchcancel";
type InputEventListener = <K extends InputEvents>(
  e: HTMLElementEventMap[K]
) => void;
type InputTarget = Window | HTMLElement | null;

interface InputListenerData {
  eventName: string;
  listener: InputEventListener;
}

interface InputState {
  isDragActive: boolean;
  isInputHooked: boolean;
}

interface InputConfiguration {
  inputState: InputState;
  dragStartListener: InputListenerData;
  draggingListeners: InputListenerData[];
}

export class GestureInputHandler {
  constructor(private _target: InputTarget = window) {
    this._inputTypeConfigurations = new Map<InputType, InputConfiguration>();
    this._activeTouches = new Map<number, ITouchInfo>();
    this.configureInputTypeMaps();

    // These have to be bound because we can't use arrow functions for these
    // two methods due to the way Typescript method overloads work.
    this.addTouchInfo = this.addTouchInfo.bind(this);
    this.updateTouchInfo = this.updateTouchInfo.bind(this);
  }

  private readonly _activeTouches: Map<number, ITouchInfo>;
  private readonly _inputTypeConfigurations: Map<InputType, InputConfiguration>;

  //#region Input Type Configurations

  private configureInputTypeMaps = (): void => {
    this._inputTypeConfigurations.set(InputType.Mouse, {
      inputState: {
        isDragActive: false,
        isInputHooked: false
      },
      dragStartListener: {
        eventName: "mousedown",
        listener: this.onMouseDown
      },
      draggingListeners: [
        {
          eventName: "mousemove",
          listener: this.onMouseMove
        },
        {
          eventName: "mouseup",
          listener: this.onMouseUp
        }
      ]
    });

    this._inputTypeConfigurations.set(InputType.Touch, {
      inputState: {
        isDragActive: false,
        isInputHooked: false
      },
      dragStartListener: {
        eventName: "touchstart",
        listener: this.onTouchStart
      },
      draggingListeners: [
        {
          eventName: "touchmove",
          listener: this.onTouchMove
        },
        {
          eventName: "touchend",
          listener: this.onTouchStop
        },
        {
          eventName: "touchcancel",
          listener: this.onTouchStop
        }
      ]
    });
  };

  /**
   * Returns a value indicating if any input configurations match the given predicate.
   */
  private anyInputConfigs = (
    configPredicate: (config: InputConfiguration) => boolean
  ): boolean => {
    for (const configuration of this._inputTypeConfigurations.values()) {
      if (configPredicate(configuration)) {
        return true;
      }
    }
    return false;
  };

  //#endregion

  //#region Target Property

  /**
   * Get or set the target to hook events to.
   */
  public get target(): InputTarget {
    return this._target;
  }
  public set target(value: InputTarget) {
    if (this._target !== value) {
      this.setDragStartHookState(InputType.Mouse, false);
      this.setDragStartHookState(InputType.Touch, false);
      this.unhookFrame(true);
      this._target = value;
      if (this._target !== null) {
        this.setDragStartHookState(InputType.Mouse, this.useMouse);
        this.setDragStartHookState(InputType.Touch, this.useTouch);
      }
    }
  }

  //#endregion

  /**
   * Set to false to disable invocation of listeners on each frame. Does not affect throttle tracking.
   */
  public isEnabled: boolean = true;

  //#region Throttle Config

  private throttleStep: number = 1;
  private throttleThreshold: number = 2;
  private throttleCount: number = 0;
  public setThrottle = (step: number, threshold: number): void => {
    if (step <= 0 || threshold <= 0 || step > threshold) {
      throw new Error(
        "step and threshold must be greater than 0 and step cannot be greater than threshold"
      );
    }
    this.throttleStep = step;
    this.throttleThreshold = threshold;
    this.throttleCount = 0;
  };

  //#endregion

  //#region Frame Handling

  private frameHandle: number | null = null;
  private keepFrameHooked: boolean = false;
  private onFrame = (): void => {
    this.throttleCount += this.throttleStep;

    if (!this.keepFrameHooked) {
      // If we intend for this to be the final frame, we should process it
      // regardless of throttling to make sure the final event fires.
      this.throttleCount = this.throttleThreshold;
    }

    if (this.throttleCount >= this.throttleThreshold) {
      this.throttleCount -= this.throttleThreshold;
      const al: number = this._activeTouches.size;
      if (al > 0) {
        const removeList: number[] = [];
        for (const a of this._activeTouches.values()) {
          if (a.updated) {
            if (!a.isDown) {
              removeList.push(a.id);
            }
            if (this.isEnabled) {
              const ll: number = this.listeners.length;
              for (let j: number = 0; j < ll; j++) {
                const b: IGestureListenerInfo = this.listeners[j];
                if ((a.id === emulatedTouchId && b.mouse) || b.touch) {
                  if (b.listener) {
                    b.listener(a);
                  }
                }
              }
            }
            a.updated = false;
          }
        }

        if (removeList.length > 0) {
          for (let i: number = 0; i < removeList.length; i++) {
            this._activeTouches.delete(removeList[i]);
          }
        }
      }
    }
    if (this.keepFrameHooked) {
      this.frameHandle = window.requestAnimationFrame(this.onFrame);
    } else {
      this.frameHandle = null;
    }
  };
  private hookFrame = (): void => {
    this.keepFrameHooked = true;
    if (this.frameHandle === null) {
      this.frameHandle = window.requestAnimationFrame(this.onFrame);
    }
  };
  private unhookFrame = (cancel: boolean = true): void => {
    this.keepFrameHooked = false;
    if (this.frameHandle !== null) {
      if (cancel) {
        window.cancelAnimationFrame(this.frameHandle);
        this.frameHandle = null;
      }
    }
  };

  //#endregion

  //#region Listeners

  private listeners: IGestureListenerInfo[] = [];

  public addListener = (
    l: (touchInfo: ITouchInfo) => void,
    t: boolean,
    m: boolean
  ): void => {
    this.listeners.push({
      listener: l,
      touch: t,
      mouse: m
    });
    if (t) {
      this.useTouch = true;
    }
    if (m) {
      this.useMouse = true;
    }
  };

  public removeListener = (l: (touchInfo: ITouchInfo) => void): void => {
    let index: number = -1;
    for (let i: number = 0; i < this.listeners.length; i++) {
      if (this.listeners[i].listener === l) {
        index = i;
        break;
      }
    }
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
    let mouse: boolean = false;
    let touch: boolean = false;
    for (let i: number = 0; i < this.listeners.length; i++) {
      if (this.listeners[i].mouse) {
        mouse = true;
      }
      if (this.listeners[i].touch) {
        touch = true;
      }
    }
    if (!mouse) {
      this.useMouse = false;
    }
    if (!touch) {
      this.useTouch = false;
    }
  };

  //#endregion

  //#region TouchInfo Helpers

  // Event objects can be reused so copies should be made
  private addTouchInfo(e: MouseEvent): void;
  private addTouchInfo(e: ITouchEvent): void;
  private addTouchInfo(e: ITouchEvent | MouseEvent): void {
    const data: Touch | MouseEvent = isITouchEvent(e) ? e.touch : e;
    const i: Partial<ITouchInfo> = {
      xInitial: data.pageX,
      yInitial: data.pageY,
      x: data.pageX,
      y: data.pageY,
      xDelta: 0,
      yDelta: 0,
      xVelocity: 0,
      yVelocity: 0,
      lastUpdateTime: e.timeStamp,
      updated: true
    };
    if (isITouchEvent(e)) {
      i.isDown = e.touchInContact;
      i.id = e.touch.identifier;
      i.force = e.touch.force;
    } else {
      // MouseEvent
      i.isDown = (e.buttons & 1) === 1;
      i.id = emulatedTouchId;
      i.force = emulatedTouchForce;
    }
    this._activeTouches.set(i.id, i as ITouchInfo);
  }

  /**
   * Returns true if a matching TouchInfo (by identifier) was found and updated, otherwise false.
   */
  private updateTouchInfo(e: MouseEvent): boolean;
  private updateTouchInfo(e: ITouchEvent): boolean;
  private updateTouchInfo(e: ITouchEvent | MouseEvent): boolean {
    const id: number = isITouchEvent(e) ? e.touch.identifier : emulatedTouchId;
    const i: ITouchInfo | undefined = this._activeTouches.get(id);
    if (i !== undefined) {
      const data: Touch | MouseEvent = isITouchEvent(e) ? e.touch : e;
      const deltaT: number = (e.timeStamp - i.lastUpdateTime) / 1000;
      i.x = data.pageX;
      i.y = data.pageY;
      i.xDelta = i.x - i.xInitial;
      i.yDelta = i.y - i.yInitial;
      i.xVelocity = (data.pageX - i.x) / deltaT;
      i.yVelocity = (data.pageY - i.y) / deltaT;
      i.lastUpdateTime = e.timeStamp;
      i.updated = true;
      if (isITouchEvent(e)) {
        i.isDown = e.touchInContact;
        i.force = e.touch.force;
      } else {
        // MouseEvent
        i.isDown = (e.buttons & 1) === 1;
      }
      return true;
    }
    return false;
  }

  //#endregion

  //#region Drag Start Hook

  /**
   * Set the state of event hooks used to start a drag for an input source.
   *
   * @param inputType The type of input source.
   * @param isHooked Whether there is an active drag start hook or not.
   */
  private setDragStartHookState = (
    inputType: InputType,
    isHooked: boolean
  ): void => {
    const config: InputConfiguration = this._inputTypeConfigurations.get(
      inputType
    )!;

    if (config.inputState.isInputHooked !== isHooked) {
      config.inputState.isInputHooked = isHooked;
      this.updateTargetListener(
        isHooked,
        this.target,
        config.dragStartListener.eventName,
        config.dragStartListener.listener
      );
    }

    if (!isHooked) {
      this.setDraggingActiveState(inputType, false);
    }

    if (
      !this.anyInputConfigs(
        (i: InputConfiguration) => i.inputState.isInputHooked
      )
    ) {
      this._activeTouches.clear();
    }
  };

  //#endregion

  //#region Drag State

  /**
   * Set the drag state for an input source.
   *
   * @param inputType The type of input source.
   * @param isActive A value indicating if the drag is active drag or not.
   */
  private setDraggingActiveState = (
    inputType: InputType,
    isActive: boolean
  ): void => {
    const config: InputConfiguration = this._inputTypeConfigurations.get(
      inputType
    )!;

    if (config.inputState.isDragActive !== isActive) {
      config.inputState.isDragActive = isActive;
      config.draggingListeners.forEach(
        (listenerData: InputListenerData): void => {
          this.updateTargetListener(
            isActive,
            window,
            listenerData.eventName,
            listenerData.listener
          );
        }
      );
    }

    if (
      this.anyInputConfigs((i: InputConfiguration) => i.inputState.isDragActive)
    ) {
      this.hookFrame();
    } else {
      this.unhookFrame(false);
    }
  };

  //#endregion

  //#region Input Type Properties

  private _useMouse: boolean = false;
  /**
   * Enable or disable the use of Mouse events as the source for gestures.
   */
  get useMouse(): boolean {
    return this._useMouse;
  }
  set useMouse(value: boolean) {
    if (this._useMouse !== value) {
      this._useMouse = value;
      this.setDragStartHookState(InputType.Mouse, value);
    }
  }

  private _useTouch: boolean = false;
  /**
   * Enable or disable the use of Touch events as the source for gestures.
   */
  get useTouch(): boolean {
    return this._useTouch;
  }
  set useTouch(value: boolean) {
    if (this._useTouch !== value) {
      this._useTouch = value;
      this.setDragStartHookState(InputType.Touch, value);
    }
  }

  //#endregion

  //#region Mouse Handlers

  private onMouseDown = (e: MouseEvent): void => {
    this.addTouchInfo(e);
    this.setDraggingActiveState(InputType.Mouse, true);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.updateTouchInfo(e)) {
      this.addTouchInfo(e);
    }
    if (!(e.buttons & 1)) {
      this.setDraggingActiveState(InputType.Mouse, false);
    }
  };

  private onMouseUp = (e: MouseEvent): void => {
    this.updateTouchInfo(e);
    this.setDraggingActiveState(InputType.Mouse, false);
  };

  //#endregion

  //#region Touch Handlers

  private onTouchStart = (e: TouchEvent): void => {
    const t: Partial<ITouchEvent> = {
      timeStamp: e.timeStamp,
      touchInContact: true
    };
    for (let i: number = 0; i < e.changedTouches.length; i++) {
      t.touch = e.changedTouches[i];
      this.addTouchInfo(t as ITouchEvent);
    }
    this.setDraggingActiveState(InputType.Touch, true);
  };

  private onTouchMove = (e: TouchEvent): void => {
    const t: Partial<ITouchEvent> = {
      timeStamp: e.timeStamp,
      touchInContact: true
    };
    for (let i: number = 0; i < e.changedTouches.length; i++) {
      t.touch = e.changedTouches[i];
      if (!this.updateTouchInfo(t as ITouchEvent)) {
        // If the touch wasn't found and 'window' is the target, start tracking it.
        // We don't want to do this if we're on a specific element.
        if (this.target === window) {
          this.addTouchInfo(t as ITouchEvent);
        }
      }
    }
  };

  private onTouchStop = (e: TouchEvent): void => {
    const t: Partial<ITouchEvent> = {
      timeStamp: e.timeStamp,
      touchInContact: false
    };
    for (let i: number = 0; i < e.changedTouches.length; i++) {
      t.touch = e.changedTouches[i];
      this.updateTouchInfo(t as ITouchEvent);
    }

    for (const touchId of this._activeTouches.keys()) {
      if (touchId !== emulatedTouchId) {
        // There's at least one active touch
        return;
      }
    }

    this.setDraggingActiveState(InputType.Touch, false);
  };

  //#endregion

  /**
   * Add or remove a listener to the target for the given event.
   *
   * @param add True to add the listener. False to remove it.
   */
  private updateTargetListener = (
    add: boolean,
    inputTarget: InputTarget,
    event: string,
    listener: InputEventListener
  ): void => {
    if (inputTarget === null) {
      return;
    }
    /* This is a helper function because storing "target.AddEventListener"
    or the remove variation in a variable caused the function to lose its
    context - so it wasn't ever actually attached to "target". */
    if (add) {
      inputTarget.addEventListener(event, listener, false);
    } else {
      inputTarget.removeEventListener(event, listener, false);
    }
  };

  private removeAllListeners = (): void => {
    for (const info of this.listeners) {
      // Release reference
      info.listener = undefined;
    }
    this.listeners.splice(0, this.listeners.length);
  };

  public dispose = (): void => {
    this.target = null;
    this.removeAllListeners();
  };
}

export const globalGestureInputHandler: GestureInputHandler = new GestureInputHandler();
