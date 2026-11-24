import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, JSX, KeyboardEvent } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

import { GestureInputHandler, ITouchInfo } from "./gesture";
import SpringAnimate, { DEFAULT_SPRING_CONFIG, ISpringConfig } from "./spring";

/** Distance in px the ball is pulled per arrow key press. */
const KEY_PULL_STEP = 40;
/** Maximum distance in px the ball can be pulled with the keyboard. */
const KEY_PULL_MAX = 240;

const ARROW_DIRECTIONS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1]
};

const clamp = (n: number, max: number): number =>
  Math.max(-max, Math.min(max, n));

function usePrefersReducedMotion(): boolean {
  const query = "(prefers-reduced-motion: reduce)";
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent): void => setReduced(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function App(): JSX.Element {
  const ballRef = useRef<HTMLButtonElement>(null);
  const springRef = useRef<SpringAnimate<HTMLButtonElement> | null>(null);
  const pull = useRef({ x: 0, y: 0 });
  const [config, setConfig] = useState<ISpringConfig>(DEFAULT_SPRING_CONFIG);
  const [paused, setPaused] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const ball = ballRef.current;
    if (!ball) return;
    const spring = new SpringAnimate(ball, DEFAULT_SPRING_CONFIG);
    const gestures = new GestureInputHandler(ball);
    gestures.addListener((info: ITouchInfo) => spring.onGesture(info), true, true);
    springRef.current = spring;
    spring.start();
    return () => {
      spring.stop();
      gestures.dispose();
      springRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (springRef.current) springRef.current.config = config;
  }, [config]);

  useEffect(() => {
    springRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  const onKeyDown = (e: KeyboardEvent): void => {
    const direction = ARROW_DIRECTIONS[e.key];
    if (!direction) return;
    e.preventDefault();
    pull.current = {
      x: clamp(pull.current.x + direction[0] * KEY_PULL_STEP, KEY_PULL_MAX),
      y: clamp(pull.current.y + direction[1] * KEY_PULL_STEP, KEY_PULL_MAX)
    };
    springRef.current?.pullTo(pull.current.x, pull.current.y);
  };

  const releaseKeyboardPull = (): void => {
    pull.current = { x: 0, y: 0 };
    springRef.current?.release();
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    if (ARROW_DIRECTIONS[e.key] || e.key === " " || e.key === "Escape") {
      releaseKeyboardPull();
    }
  };

  const togglePause = (): void => {
    const spring = springRef.current;
    if (!spring) return;
    if (spring.paused) spring.resume();
    else spring.pause();
    setPaused(spring.paused);
  };

  const onConfigChange = (e: ChangeEvent<HTMLInputElement>): void =>
    setConfig({ ...config, [e.target.name]: Number(e.target.value) });

  return (
    <main className="container">
      <h1>Spring motion test</h1>
      <p className="help" id="help">
        Drag the ball with a mouse or finger, or focus it and press the arrow
        keys to pull it. It springs back when released.
      </p>
      <div className="controls">
        <button type="button" onClick={togglePause} aria-pressed={paused}>
          {paused ? "Resume" : "Pause"}
        </button>
        <button type="button" onClick={() => springRef.current?.reset()}>
          Reset
        </button>
        <label>
          Spring ({config.spring.toFixed(2)})
          <input
            type="range"
            name="spring"
            min={0.01}
            max={0.5}
            step={0.01}
            value={config.spring}
            onChange={onConfigChange}
          />
        </label>
        <label>
          Friction ({config.friction.toFixed(2)})
          <input
            type="range"
            name="friction"
            min={0.5}
            max={0.99}
            step={0.01}
            value={config.friction}
            onChange={onConfigChange}
          />
        </label>
      </div>
      <div className="stage">
        <button
          type="button"
          ref={ballRef}
          className="ball"
          aria-label="Draggable ball"
          aria-describedby="help"
          aria-disabled={paused}
          onKeyDown={onKeyDown}
          onKeyUp={onKeyUp}
          onBlur={releaseKeyboardPull}
        />
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
