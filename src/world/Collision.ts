import type { Rect, Vec2 } from "../entities/Entity";
import { TILE_SIZE } from "../core/Renderer";

export type SolidQuery = (tileX: number, tileY: number) => boolean;

/** Vrai si la boîte posée en `position` recouvre au moins une case bloquante. */
export function collides(position: Readonly<Vec2>, box: Readonly<Rect>, solid: SolidQuery): boolean {
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
  // Un corps déjà encastré ne pouvait plus bouger du tout : chaque candidat
  // touchait le même mur, donc tout était refusé, et la partie était perdue.
  // Dans ce cas on laisse passer le mouvement — la sortie de secours de
  // `resolveOverlap` fera le reste, mais le joueur n'est jamais figé.
  if (collides(origin, box, solid)) return { x: origin.x + delta.x, y: origin.y + delta.y };

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

/**
 * Cherche la position libre la plus proche de `origin`.
 *
 * C'est le filet de sécurité du changement de zone : la carte d'arrivée est
 * générée indépendamment de celle qu'on quitte, et rien ne garantit que le
 * point de dépose soit praticable. Sans ce rattrapage, entrer dans un arbre
 * ou un rocher enfermait définitivement le personnage.
 *
 * La recherche parcourt des anneaux concentriques dans un ordre fixe : le
 * résultat est déterministe, donc rejouable et testable.
 */
export function resolveOverlap(
  origin: Readonly<Vec2>,
  box: Readonly<Rect>,
  solid: SolidQuery,
  bounds?: { readonly width: number; readonly height: number },
  maxRadius = TILE_SIZE * 8,
): Vec2 {
  const clamp = (value: Vec2): Vec2 => {
    if (!bounds) return value;
    return {
      x: Math.min(Math.max(value.x, -box.x), bounds.width - box.x - box.width),
      y: Math.min(Math.max(value.y, -box.y), bounds.height - box.y - box.height),
    };
  };

  const start = clamp({ x: origin.x, y: origin.y });
  if (!collides(start, box, solid)) return start;

  const step = 4;
  for (let radius = step; radius <= maxRadius; radius += step) {
    // Les quatre directions cardinales d'abord : on préfère reculer tout droit
    // plutôt que d'être éjecté en diagonale au travers d'un angle.
    const ring: Vec2[] = [
      { x: 0, y: radius }, { x: 0, y: -radius },
      { x: -radius, y: 0 }, { x: radius, y: 0 },
    ];
    for (let offset = step; offset < radius; offset += step) {
      ring.push(
        { x: offset, y: radius }, { x: -offset, y: radius },
        { x: offset, y: -radius }, { x: -offset, y: -radius },
        { x: radius, y: offset }, { x: radius, y: -offset },
        { x: -radius, y: offset }, { x: -radius, y: -offset },
      );
    }
    ring.push(
      { x: radius, y: radius }, { x: -radius, y: radius },
      { x: radius, y: -radius }, { x: -radius, y: -radius },
    );
    for (const offset of ring) {
      const candidate = clamp({ x: start.x + offset.x, y: start.y + offset.y });
      if (!collides(candidate, box, solid)) return candidate;
    }
  }
  return start;
}
