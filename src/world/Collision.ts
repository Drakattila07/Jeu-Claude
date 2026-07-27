import type { Rect, Vec2 } from "../entities/Entity";
import { TILE_SIZE } from "../core/Renderer";

export type SolidQuery = (tileX: number, tileY: number) => boolean;

function collides(position: Vec2, box: Readonly<Rect>, solid: SolidQuery): boolean {
  const left = Math.floor((position.x + box.x) / TILE_SIZE);
  const right = Math.floor((position.x + box.x + box.width - 1) / TILE_SIZE);
  const top = Math.floor((position.y + box.y) / TILE_SIZE);
  const bottom = Math.floor((position.y + box.y + box.height - 1) / TILE_SIZE);
  for (let y = top; y <= bottom; y += 1) {
    for (let x = left; x <= right; x += 1) if (solid(x, y)) return true;
  }
  return false;
}

export function moveOnGrid(
  origin: Readonly<Vec2>,
  delta: Readonly<Vec2>,
  box: Readonly<Rect>,
  solid: SolidQuery,
  cornerCorrection = 4,
): Vec2 {
  const result = { x: origin.x, y: origin.y };
  if (delta.x !== 0) {
    const candidate = { x: result.x + delta.x, y: result.y };
    if (!collides(candidate, box, solid)) result.x = candidate.x;
    else {
      for (let shift = 1; shift <= cornerCorrection; shift += 1) {
        const signs = [-1, 1] as const;
        const corrected = signs
          .map((sign) => ({ x: candidate.x, y: candidate.y + shift * sign }))
          .find((value) => !collides(value, box, solid));
        if (corrected) { result.x = corrected.x; result.y = corrected.y; break; }
      }
    }
  }
  if (delta.y !== 0) {
    const candidate = { x: result.x, y: result.y + delta.y };
    if (!collides(candidate, box, solid)) result.y = candidate.y;
    else {
      for (let shift = 1; shift <= cornerCorrection; shift += 1) {
        const signs = [-1, 1] as const;
        const corrected = signs
          .map((sign) => ({ x: candidate.x + shift * sign, y: candidate.y }))
          .find((value) => !collides(value, box, solid));
        if (corrected) { result.x = corrected.x; result.y = corrected.y; break; }
      }
    }
  }
  return result;
}
