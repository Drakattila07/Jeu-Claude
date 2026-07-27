export interface Vec2 { x: number; y: number }
export interface Rect extends Vec2 { width: number; height: number }

export abstract class Entity {
  velocity: Vec2 = { x: 0, y: 0 };
  depth = 0;
  active = true;

  constructor(
    public position: Vec2,
    public readonly hitbox: Readonly<Rect>,
  ) {}

  abstract update(): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;
}
