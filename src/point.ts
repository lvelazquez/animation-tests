export class Point {
  public static get Default(): Point {
    return new Point();
  }

  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  public clone = (): Point => new Point(this.x, this.y);
  public add = (p: Point): Point =>
    p!! && new Point(this.x + p.x, this.y + p.y);
  public subtract = (p: Point): Point =>
    p!! && new Point(this.x - p.x, this.y - p.y);
  public multiply = (p: Point | number): Point => {
    if (p instanceof Point) {
      return p!! && new Point(this.x * p.x, this.y * p.y);
    } else if (typeof p === "number") {
      return new Point(this.x * p, this.y * p);
    }
  };

  public div = (p: Point): Point =>
    p!! && new Point(this.x / p.x, this.y / p.y);

  public equals = (p: Point): boolean => {
    return p!! && this.x === p.x && this.y === p.y;
  };

  public distance = (): number => {
    return Math.hypot(this.x, this.y);
  };

  public toString = (): string => {
    return `Point (x: ${this.x.toFixed(0)}, y: ${this.y.toFixed(0)})`;
  };
}
