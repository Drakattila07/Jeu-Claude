import { VIEW_HEIGHT, VIEW_WIDTH } from "./Renderer";
import type { Vec2 } from "../entities/Entity";

export type Edge = "north" | "south" | "west" | "east";
export interface ZoneCoord { readonly x: number; readonly y: number }

export class Camera {
  constructor(public zone: ZoneCoord = { x: 3, y: 3 }) {}

  edgeFor(position: Readonly<Vec2>): Edge | null {
    if (position.x < -8) return "west";
    if (position.x > VIEW_WIDTH - 8) return "east";
    if (position.y < -8) return "north";
    if (position.y > VIEW_HEIGHT - 8) return "south";
    return null;
  }

  adjacent(edge: Edge): ZoneCoord {
    const delta = {
      north: { x: 0, y: -1 }, south: { x: 0, y: 1 },
      west: { x: -1, y: 0 }, east: { x: 1, y: 0 },
    }[edge];
    return { x: this.zone.x + delta.x, y: this.zone.y + delta.y };
  }

  enterPosition(edge: Edge, current: Readonly<Vec2>): Vec2 {
    if (edge === "west") return { x: VIEW_WIDTH - 32, y: current.y };
    if (edge === "east") return { x: 32, y: current.y };
    if (edge === "north") return { x: current.x, y: VIEW_HEIGHT - 32 };
    return { x: current.x, y: 32 };
  }
}
