export class Point {
  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  public clone = (): Point => new Point(this.x, this.y);
  public add = (p: Point): Point => new Point(this.x + p.x, this.y + p.y);
  public subtract = (p: Point): Point => new Point(this.x - p.x, this.y - p.y);
  public multiply = (p: Point | number): Point =>
    p instanceof Point
      ? new Point(this.x * p.x, this.y * p.y)
      : new Point(this.x * p, this.y * p);
  public equals = (p: Point): boolean => this.x === p.x && this.y === p.y;
  public distance = (): number => Math.hypot(this.x, this.y);
  public toString = (): string =>
    `Point (x: ${this.x.toFixed(0)}, y: ${this.y.toFixed(0)})`;
}
