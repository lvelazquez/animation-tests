import { describe, expect, it } from "vitest";
import { Point } from "./point";
import {
  DEFAULT_SPRING_CONFIG,
  REST_TOLERANCE,
  ISpringState,
  scale,
  stepSpring
} from "./spring";

describe("Point", () => {
  it("does vector arithmetic", () => {
    const a = new Point(3, 4);
    expect(a.distance()).toBe(5);
    expect(a.add(new Point(1, 1)).equals(new Point(4, 5))).toBe(true);
    expect(a.subtract(new Point(1, 1)).equals(new Point(2, 3))).toBe(true);
    expect(a.multiply(2).equals(new Point(6, 8))).toBe(true);
    expect(a.multiply(new Point(2, 0)).equals(new Point(6, 0))).toBe(true);
  });
});

describe("scale", () => {
  it("maps ranges linearly", () => {
    expect(scale(5, 0, 10, 0, 1)).toBe(0.5);
    expect(scale(10, 10, 0, 0, 1)).toBe(0);
  });
});

describe("stepSpring", () => {
  it("does not mutate its input and moves toward the target", () => {
    const state: ISpringState = {
      current: new Point(100, 0),
      velocity: new Point(0, 0)
    };
    const next = stepSpring(state, new Point(0, 0), DEFAULT_SPRING_CONFIG);
    expect(state.current.x).toBe(100);
    expect(next.current.x).toBeLessThan(100);
  });

  it("settles at the anchor", () => {
    let state: ISpringState = {
      current: new Point(200, -150),
      velocity: new Point(0, 0)
    };
    for (let i = 0; i < 600; i++) {
      state = stepSpring(state, new Point(0, 0), DEFAULT_SPRING_CONFIG);
    }
    expect(state.current.distance()).toBeLessThan(REST_TOLERANCE);
  });
});
