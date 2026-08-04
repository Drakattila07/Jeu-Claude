import { VIEW_HEIGHT, VIEW_WIDTH, ZONE_HEIGHT, ZONE_WIDTH } from "./Renderer";
import type { Vec2 } from "../entities/Entity";

export type Edge = "north" | "south" | "west" | "east";
export interface ZoneCoord { readonly x: number; readonly y: number }
/** Étendue d'un passage, en tuiles, bornes comprises. */
export interface TileSpan { readonly start: number; readonly end: number }

export const EDGE_DELTA: Readonly<Record<Edge, ZoneCoord>> = {
  north: { x: 0, y: -1 }, south: { x: 0, y: 1 },
  west: { x: -1, y: 0 }, east: { x: 1, y: 0 },
};

/** Marge conservée entre le personnage et la bordure quand la caméra bute. */
const FOLLOW_SMOOTHING = 0.14;

/**
 * Caméra à défilement libre.
 *
 * Le jeu changeait d'écran d'un bloc, comme un livre d'images : chaque zone
 * tenait exactement dans la fenêtre. Une zone fait désormais 512×448 pixels
 * pour une fenêtre de 384×216, et la caméra suit le personnage en restant
 * bornée à la carte — on voit le monde continuer autour de soi.
 */
export class Camera {
  /** Coin haut-gauche de la fenêtre, en pixels monde. */
  x = 0;
  y = 0;
  /**
   * Dimensions de la carte courante. Elles valaient toujours celles d'une
   * zone : dans une pièce plus petite, la caméra descendait sous le plancher
   * et l'on ne voyait jamais le haut de la salle.
   */
  private boundsWidth = ZONE_WIDTH;
  private boundsHeight = ZONE_HEIGHT;
  private shakeFrames = 0;
  private shakeStrength = 0;

  constructor(public zone: ZoneCoord = { x: 3, y: 3 }) {}

  /** Recale la caméra sur la carte que l'on vient de charger. */
  setBounds(width: number, height: number): void {
    this.boundsWidth = width;
    this.boundsHeight = height;
    this.x = Math.min(this.x, Math.max(0, width - VIEW_WIDTH));
    this.y = Math.min(this.y, Math.max(0, height - VIEW_HEIGHT));
  }

  /** Recentre instantanément (changement de zone, renaissance, chargement). */
  snapTo(target: Readonly<Vec2>): void {
    const desired = this.desiredFor(target);
    this.x = desired.x;
    this.y = desired.y;
  }

  /** Suit la cible avec un léger retard : le mouvement respire. */
  follow(target: Readonly<Vec2>): void {
    const desired = this.desiredFor(target);
    this.x += (desired.x - this.x) * FOLLOW_SMOOTHING;
    this.y += (desired.y - this.y) * FOLLOW_SMOOTHING;
    // Sous le demi-pixel, le lissage n'apporte plus rien et fait vibrer les
    // arrondis : on colle à la valeur voulue.
    if (Math.abs(desired.x - this.x) < 0.4) this.x = desired.x;
    if (Math.abs(desired.y - this.y) < 0.4) this.y = desired.y;
  }

  private desiredFor(target: Readonly<Vec2>): Vec2 {
    return {
      x: clamp(target.x + 8 - VIEW_WIDTH / 2, 0, Math.max(0, this.boundsWidth - VIEW_WIDTH)),
      y: clamp(target.y + 8 - VIEW_HEIGHT / 2, 0, Math.max(0, this.boundsHeight - VIEW_HEIGHT)),
    };
  }

  /** Décalage entier appliqué au contexte : des demi-pixels feraient scintiller. */
  get offsetX(): number { return -Math.round(this.x) + this.shakeOffset().x; }
  get offsetY(): number { return -Math.round(this.y) + this.shakeOffset().y; }

  shake(strength: number, frames: number): void {
    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.shakeFrames = Math.max(this.shakeFrames, frames);
  }

  update(): void {
    if (this.shakeFrames > 0) {
      this.shakeFrames -= 1;
      if (this.shakeFrames === 0) this.shakeStrength = 0;
    }
  }

  private shakeOffset(): Vec2 {
    if (this.shakeFrames <= 0) return { x: 0, y: 0 };
    const decay = this.shakeStrength * (this.shakeFrames / 12);
    // Deux sinusoïdes premières entre elles : la secousse ne boucle pas.
    return {
      x: Math.round(Math.sin(this.shakeFrames * 1.9) * decay),
      y: Math.round(Math.cos(this.shakeFrames * 2.7) * decay),
    };
  }

  /** Convertit une position monde en position écran. */
  toScreen(position: Readonly<Vec2>): Vec2 {
    return { x: position.x + this.offsetX, y: position.y + this.offsetY };
  }

  /** Vrai si le rectangle monde touche la fenêtre : on ne dessine que lui. */
  isVisible(x: number, y: number, width: number, height: number, margin = 32): boolean {
    return x + width >= this.x - margin && x <= this.x + VIEW_WIDTH + margin
      && y + height >= this.y - margin && y <= this.y + VIEW_HEIGHT + margin;
  }

  /** Bord franchi par une position, ou `null` si elle reste dans la zone. */
  edgeFor(position: Readonly<Vec2>): Edge | null {
    if (position.x < -8) return "west";
    if (position.x > ZONE_WIDTH - 8) return "east";
    if (position.y < -8) return "north";
    if (position.y > ZONE_HEIGHT - 8) return "south";
    return null;
  }

  adjacent(edge: Edge): ZoneCoord {
    const delta = EDGE_DELTA[edge];
    return { x: this.zone.x + delta.x, y: this.zone.y + delta.y };
  }

  /**
   * Point de dépose dans la zone voisine.
   *
   * On conserve la coordonnée transversale pour que le passage se fasse dans
   * la continuité du pas — mais bornée au passage partagé. Sans cette borne,
   * un joueur qui longeait la frontière pouvait être déposé n'importe où sur
   * le bord d'en face, parfois dans une poche fermée dont on ne ressortait
   * plus.
   */
  enterPosition(edge: Edge, current: Readonly<Vec2>, gateway?: TileSpan): Vec2 {
    const margin = 26;
    const along = edge === "west" || edge === "east" ? current.y : current.x;
    const limit = edge === "west" || edge === "east" ? ZONE_HEIGHT : ZONE_WIDTH;
    const value = gateway
      ? clamp(along, gateway.start * 16 + 2, (gateway.end + 1) * 16 - 18)
      : clamp(along, 24, limit - 40);

    if (edge === "west") return { x: ZONE_WIDTH - margin, y: value };
    if (edge === "east") return { x: margin, y: value };
    if (edge === "north") return { x: value, y: ZONE_HEIGHT - margin };
    return { x: value, y: margin };
  }

  /** Repousse dans la zone quand il n'y a pas de voisin de ce côté. */
  blockedPosition(edge: Edge, current: Readonly<Vec2>): Vec2 {
    if (edge === "west") return { x: 0, y: current.y };
    if (edge === "east") return { x: ZONE_WIDTH - 16, y: current.y };
    if (edge === "north") return { x: current.x, y: 0 };
    return { x: current.x, y: ZONE_HEIGHT - 16 };
  }
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return value < min ? min : value > max ? max : value;
}
