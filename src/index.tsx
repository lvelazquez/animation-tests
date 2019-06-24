import * as React from "react";
import { render } from "react-dom";
import "./styles.css";

/*---------
  IMPORTS
----------*/

import { GestureInputHandler, ITouchInfo } from "./gesture";
import SpringAnimate, { ISpringConfig } from "./spring";
// import Icon from "../../icon";

/*----------------
  PROPS & STATES
-----------------*/

interface ITestMotionProps {}

interface ITestMotionStates {
  springConfig: ISpringConfig;
  motionValue?: number;
}

/*------------------
  CLASS DEFINITION
-------------------*/

class App extends React.Component<ITestMotionProps, ITestMotionStates, {}> {
  private dragContainer: HTMLDivElement;
  private gestureHandler: GestureInputHandler;
  private spring: SpringAnimate;

  constructor(props: ITestMotionProps) {
    super(props);

    this.state = {
      springConfig: {
        spring: 0.09,
        friction: 0.95
      },
      motionValue: 0
    };

    this.handleSpringChange = this.handleSpringChange.bind(this);
  }

  private handleSpringChange(e: React.ChangeEvent<HTMLInputElement>): void {
    this.setState(
      {
        springConfig: {
          ...this.state.springConfig,
          [e.target.name]: Number(e.target.value)
        }
      },
      (): void => {
        this.springAnimate.config = this.state.springConfig;
      }
    );
  }

  // on touch start

  public componentDidMount(): void {
    this.spring = new SpringAnimate(
      this.dragContainer,
      { spring: 0.2, friction: 0.95 },
      {
        onStart: () => console.log("start!"),
        onUpdate: (motionValue: number) => {
          // return throttle(console.log("update!", motionValue), 10);
        },
        onComplete: () => console.log("completed!")
      }
    );
    this.gestureHandler = new GestureInputHandler(this.dragContainer);
    this.gestureHandler.addListener(
      (touchInfo: ITouchInfo) => this.spring.onGesture(touchInfo),
      true,
      true
    );
    this.spring.start();
  }

  public componentWillUnmount(): void {
    if (this.spring) {
      this.spring.stop();
    }
  }
  /*--------------
    REACT RENDER
  ---------------*/

  public render(): JSX.Element {
    return (
      <div className={"container"}>
        <h2>Test Motion</h2>

        <div className={"extended-container"}>
          <div
            ref={(ref: HTMLDivElement): HTMLDivElement =>
              (this.dragContainer = ref)
            }
            className="ball"
          />
        </div>
      </div>
    );
  }

  /*-------------------
    PRIVATE FUNCTIONS
  --------------------*/
}

/*------------------
  EXPORT COMPONENT
-------------------*/

const rootElement = document.getElementById("root");
render(<App />, rootElement);
