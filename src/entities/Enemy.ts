import { PALETTE } from "../data/palette";
import { ENEMY_TYPES, type EnemyDefinition, type EnemySpawn } from "../data/enemies";
import { ZONE_HEIGHT, ZONE_WIDTH } from "../core/Renderer";
import { moveOnGrid, resolveOverlap } from "../world/Collision";
import type { TileMap } from "../world/TileMap";
import type { Player } from "./Player";
import { Entity, type Rect, type Vec2 } from "./Entity";

/**
 * Étapes du comportement.
 *
 * Les créatures fonçaient droit sur le joueur et blessaient au contact : aucun
 * moyen de lire une intention, donc aucun moyen de bien jouer. Chaque attaque
 * passe désormais par une annonce visible, et c'est cette fenêtre-là qui rend
 * l'esquive et le contre possibles.
 */
export type EnemyState = "idle" | "chase" | "windup" | "strike" | "recover" | "flee";

export interface EnemyStrike {
  readonly x: number;
  readonly y: number;
  readonly damage: number;
  readonly ranged: boolean;
  readonly direction: Vec2;
}

const HITBOX: Rect = { x: 2, y: 5, width: 12, height: 10 };

export class Enemy extends Entity {
  readonly definition: EnemyDefinition;
  hearts: number;
  aiFrame = 0;
  flashFrames = 0;
  /** Frames pendant lesquelles une parade parfaite la laisse sonnée. */
  private staggerFrames = 0;
  knockbackFrames = 0;
  state: EnemyState = "idle";
  private stateFrames = 0;
  private knockback = { x: 0, y: 0 };
  private facing: Vec2 = { x: 0, y: 1 };
  private wander: Vec2 = { x: 0, y: 0 };
  private pendingStrike: EnemyStrike | null = null;
  private readonly home: Vec2;

  constructor(readonly spawn: EnemySpawn, private readonly target: Player, private readonly map?: TileMap) {
    super({ x: spawn.x, y: spawn.y }, HITBOX);
    this.definition = ENEMY_TYPES[spawn.type];
    this.hearts = this.definition.hearts;
    this.depth = 9;
    this.home = { x: spawn.x, y: spawn.y };
    if (map && this.definition.phasing !== true) {
      // Une créature née dans un rocher ne pourrait plus jamais en sortir.
      this.position = resolveOverlap(this.position, this.hitbox,
        (tileX, tileY) => map.isSolid(tileX, tileY),
        { width: map.pixelWidth, height: map.pixelHeight });
      this.home = { x: this.position.x, y: this.position.y };
    }
  }

  get bounds(): Rect {
    return {
      x: this.position.x + this.hitbox.x, y: this.position.y + this.hitbox.y,
      width: this.hitbox.width, height: this.hitbox.height,
    };
  }

  /** Fraction de vie restante, pour la jauge affichée au-dessus de la tête. */
  get healthRatio(): number { return Math.max(0, this.hearts / this.definition.hearts); }

  /** Vrai pendant l'annonce : c'est le signal donné au joueur. */
  get isTelegraphing(): boolean { return this.state === "windup"; }

  /**
   * Sonne la créature : elle reste plantée le temps indiqué.
   *
   * C'est la récompense d'une parade parfaite. Sans cet état, parer au bon
   * moment n'offrait rien de plus que parer au hasard.
   */
  stagger(frames: number): void {
    if (!this.active) return;
    this.staggerFrames = Math.max(this.staggerFrames, frames);
    this.pendingStrike = null;
    this.enter("recover");
  }

  get isStaggered(): boolean { return this.staggerFrames > 0; }

  /** Récupère et consomme l'attaque déclenchée pendant cette frame. */
  takeStrike(): EnemyStrike | null {
    const strike = this.pendingStrike;
    this.pendingStrike = null;
    return strike;
  }

  /** Déplacement borné à la carte et arrêté par le décor, sauf pour les volants. */
  private step(dx: number, dy: number): void {
    const canPhase = !this.map || this.definition.phasing === true;
    const next = canPhase
      ? { x: this.position.x + dx, y: this.position.y + dy }
      : moveOnGrid(this.position, { x: dx, y: dy }, this.hitbox,
        (tileX, tileY) => this.map!.isSolid(tileX, tileY), 3);
    const width = this.map?.pixelWidth ?? ZONE_WIDTH;
    const height = this.map?.pixelHeight ?? ZONE_HEIGHT;
    this.position = {
      x: Math.max(4, Math.min(width - 20, next.x)),
      y: Math.max(4, Math.min(height - 20, next.y)),
    };
  }

  update(): void {
    if (!this.active) return;
    this.aiFrame += 1;
    this.stateFrames += 1;
    if (this.flashFrames > 0) this.flashFrames -= 1;
    // Sonnée : elle ne pense plus, elle encaisse.
    if (this.staggerFrames > 0) {
      this.staggerFrames -= 1;
      return;
    }
    if (this.knockbackFrames > 0) {
      const factor = this.knockbackFrames / 7;
      this.step(this.knockback.x * factor, this.knockback.y * factor);
      this.knockbackFrames -= 1;
      return;
    }

    const dx = this.target.position.x - this.position.x;
    const dy = this.target.position.y - this.position.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const toward: Vec2 = { x: dx / distance, y: dy / distance };
    if (this.state !== "windup" && this.state !== "strike") this.facing = toward;

    const wounded = this.definition.skittish === true && this.hearts <= 1;

    switch (this.state) {
      case "idle":
        this.patrol();
        if (distance <= this.definition.aggro) this.enter("chase");
        break;
      case "chase":
        if (wounded && distance < 70) { this.enter("flee"); break; }
        if (distance > this.definition.aggro * 1.6) { this.enter("idle"); break; }
        this.pursue(toward, distance);
        if (distance <= this.definition.reach) this.enter("windup");
        break;
      case "windup":
        // On se ramasse sur place : le joueur a le temps de rouler.
        this.step(-this.facing.x * 0.24, -this.facing.y * 0.24);
        if (this.stateFrames >= this.definition.windup) {
          this.pendingStrike = {
            x: this.position.x + 8 + this.facing.x * 12,
            y: this.position.y + 8 + this.facing.y * 12,
            damage: this.definition.damage,
            ranged: this.definition.ranged === true,
            direction: this.facing,
          };
          this.enter("strike");
        }
        break;
      case "strike":
        if (!this.definition.ranged) this.step(this.facing.x * 2.6, this.facing.y * 2.6);
        if (this.stateFrames >= 9) this.enter("recover");
        break;
      case "recover":
        if (this.stateFrames >= 24) this.enter(wounded ? "flee" : "chase");
        break;
      case "flee":
        this.step(-toward.x * this.definition.speed * 1.25, -toward.y * this.definition.speed * 1.25);
        if (distance > 150 || this.stateFrames > 150) this.enter("idle");
        break;
    }
  }

  private enter(state: EnemyState): void {
    this.state = state;
    this.stateFrames = 0;
  }

  /** Approche propre à chaque espèce : bond, piqué, marche pesante. */
  private pursue(toward: Readonly<Vec2>, distance: number): void {
    const speed = this.definition.speed;
    switch (this.definition.behavior) {
      case "leap": {
        if (this.aiFrame % 78 >= 58) this.step(toward.x * speed * 2.1, toward.y * speed * 2.1);
        break;
      }
      case "hop": {
        if (this.aiFrame % 54 >= 40) this.step(toward.x * speed * 1.9, toward.y * speed * 1.9);
        break;
      }
      case "dive": {
        // Vol sinusoïdal : impossible à suivre en ligne droite.
        const drift = Math.sin(this.aiFrame / 11) * 0.9;
        this.step(toward.x * speed + -toward.y * drift, toward.y * speed + toward.x * drift);
        break;
      }
      case "caster": {
        // Le lanceur garde ses distances : il recule si l'on colle.
        if (distance < 74) this.step(-toward.x * speed, -toward.y * speed);
        else if (distance > this.definition.reach * 0.8) this.step(toward.x * speed, toward.y * speed);
        else this.step(-toward.y * speed * 0.6, toward.x * speed * 0.6);
        break;
      }
      case "charger": {
        const rush = this.aiFrame % 96 >= 70 ? 1.9 : 1;
        this.step(toward.x * speed * rush, toward.y * speed * rush);
        break;
      }
      default:
        this.step(toward.x * speed, toward.y * speed);
    }
  }

  /** Errance tranquille autour du point d'apparition. */
  private patrol(): void {
    if (this.definition.behavior === "wake") return;
    if (this.aiFrame % 96 === 0) {
      // L'angle d'or répartit les caps sans jamais repasser au même endroit.
      const angle = (this.aiFrame / 96 + this.spawn.x + this.spawn.y) * 2.399963;
      this.wander = { x: Math.cos(angle), y: Math.sin(angle) };
    }
    if (Math.hypot(this.position.x - this.home.x, this.position.y - this.home.y) > 72) {
      const backX = this.home.x - this.position.x;
      const backY = this.home.y - this.position.y;
      const length = Math.max(1, Math.hypot(backX, backY));
      this.wander = { x: backX / length, y: backY / length };
    }
    if (this.aiFrame % 96 < 46) {
      this.step(this.wander.x * this.definition.speed * 0.34, this.wander.y * this.definition.speed * 0.34);
    }
  }

  hit(damage: number, from: Readonly<Vec2>): boolean {
    if (!this.active) return false;
    this.hearts -= damage;
    this.flashFrames = 5;
    const dx = this.position.x - from.x;
    const dy = this.position.y - from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.knockback = { x: (dx / length) * 3.4, y: (dy / length) * 3.4 };
    this.knockbackFrames = 7;
    // Un coup porté pendant l'annonce l'interrompt : frapper au bon moment paie.
    if (this.state === "windup") this.enter("recover");
    else if (this.state === "idle") this.enter("chase");
    if (this.hearts <= 0) this.active = false;
    return !this.active;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const hop = this.definition.behavior === "hop" || this.definition.behavior === "leap"
      ? (this.aiFrame % (this.definition.behavior === "hop" ? 54 : 78) >= 40 ? -4 : 0)
      : this.definition.phasing ? Math.round(Math.sin(this.aiFrame / 16) * 2) : 0;
    const shake = this.state === "windup" ? (this.aiFrame % 2 === 0 ? 1 : -1) : 0;
    const x = Math.round(this.position.x + shake);
    const y = Math.round(this.position.y + hop);

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 3, Math.round(this.position.y) + 14, 10, 2);
    ctx.globalAlpha = 1;

    const tint = this.flashFrames > 0 ? PALETTE.white : PALETTE[this.definition.color];
    this.drawBody(ctx, x, y, tint);

    if (this.state === "windup") this.drawTelegraph(ctx, x, y);
    if (this.hearts < this.definition.hearts) this.drawHealth(ctx, x, Math.round(this.position.y));
    ctx.restore();
  }

  private drawTelegraph(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const progress = Math.min(1, this.stateFrames / this.definition.windup);
    ctx.globalAlpha = 0.22 + progress * 0.42;
    ctx.fillStyle = this.definition.ranged ? PALETTE.waterLight : PALETTE.red;
    if (this.definition.ranged) {
      for (let step = 1; step <= 3; step += 1) {
        ctx.fillRect(
          Math.round(x + 7 + this.facing.x * 13 * step),
          Math.round(y + 7 + this.facing.y * 13 * step),
          4 - step, 4 - step,
        );
      }
    } else {
      ctx.fillRect(
        Math.round(x + 8 + this.facing.x * this.definition.reach * 0.6 - 9),
        Math.round(y + 8 + this.facing.y * this.definition.reach * 0.6 - 9),
        18, 18,
      );
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x + 7, y - 9, 2, 5);
    ctx.fillRect(x + 7, y - 3, 2, 2);
  }

  private drawHealth(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 1, y - 5, 14, 3);
    ctx.fillStyle = this.healthRatio > 0.5 ? PALETTE.leafLight
      : this.healthRatio > 0.25 ? PALETTE.yellow : PALETTE.red;
    ctx.fillRect(x + 2, y - 4, Math.max(1, Math.round(12 * this.healthRatio)), 1);
  }

  private drawBody(ctx: CanvasRenderingContext2D, x: number, y: number, tint: string): void {
    switch (this.spawn.type) {
      case "castle_guard": {
        const stride = Math.floor(this.aiFrame / 8) % 2;
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x + 3, y + 2, 11, 13);
        ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.stoneDark;
        ctx.fillRect(x + 4, y + 3, 9, 5);
        ctx.fillStyle = tint;
        ctx.fillRect(x + 4, y + 8, 9, 6);
        ctx.fillStyle = PALETTE.stoneLight;
        ctx.fillRect(x + 5, y + 4, 7, 2);
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(x + 8, y + 5, 2, 2);
        ctx.fillStyle = PALETTE.woodDark;
        ctx.fillRect(x + 14, y, 2, 16);
        ctx.fillStyle = PALETTE.stoneLight;
        ctx.fillRect(x + 13, y, 4, 3);
        ctx.fillStyle = PALETTE.woodDark;
        ctx.fillRect(x + 3 + stride, y + 13, 3, 3);
        ctx.fillRect(x + 10 - stride, y + 13, 3, 3);
        break;
      }
      case "ember_mage": {
        const flame = Math.floor(this.aiFrame / 9) % 2;
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x + 3, y + 5, 11, 11);
        ctx.fillStyle = tint;
        ctx.fillRect(x + 4, y + 4, 9, 11);
        ctx.fillStyle = PALETTE.roofDark;
        ctx.fillRect(x + 2, y + 2, 13, 4);
        ctx.fillRect(x + 6, y, 5, 4);
        ctx.fillStyle = PALETTE.red;
        ctx.fillRect(x + 6, y + 6, 2, 2);
        ctx.fillRect(x + 11, y + 6, 2, 2);
        ctx.fillStyle = PALETTE.woodLight;
        ctx.fillRect(x + 15, y + 1, 2, 15);
        ctx.fillStyle = PALETTE.red;
        ctx.fillRect(x + 13 + flame, y - 2, 6 - flame, 6);
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(x + 15, y - 1, 2, 4);
        break;
      }
      case "wolf": {
        const stride = Math.floor(this.aiFrame / 7) % 2;
        ctx.save();
        ctx.translate(x + 8, y);
        ctx.scale(this.facing.x < 0 ? -1 : 1, 1);
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(-7, 6, 14, 8);
        ctx.fillRect(4, 2, 6, 8);
        ctx.fillRect(5, 0, 2, 4);
        ctx.fillRect(9, 1, 2, 4);
        ctx.fillRect(-11, 5, 6, 3);
        ctx.fillStyle = tint;
        ctx.fillRect(-6, 7, 12, 6);
        ctx.fillRect(4, 3, 5, 6);
        ctx.fillRect(-5 + stride, 12, 3, 4);
        ctx.fillRect(2 - stride, 12, 3, 4);
        ctx.fillStyle = PALETTE.stoneLight;
        ctx.fillRect(5, 4, 3, 2);
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(7, 5, 1, 1);
        ctx.fillStyle = PALETTE.white;
        ctx.fillRect(9, 8, 2, 1);
        ctx.restore();
        break;
      }
      case "branch_bat": {
        const flap = Math.floor(this.aiFrame / 5) % 2;
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x, y + 5 - flap, 16, 5);
        ctx.fillStyle = tint;
        ctx.fillRect(x + 1, y + 6 - flap, 14, 3);
        ctx.fillRect(x + 5, y + 2, 6, 11);
        ctx.fillStyle = PALETTE.red;
        ctx.fillRect(x + 6, y + 5, 1, 1);
        ctx.fillRect(x + 9, y + 5, 1, 1);
        break;
      }
      case "hop_mushroom":
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x + 1, y + 2, 14, 8);
        ctx.fillStyle = tint;
        ctx.fillRect(x + 2, y + 3, 12, 6);
        ctx.fillStyle = PALETTE.cream;
        ctx.fillRect(x + 4, y + 4, 3, 2);
        ctx.fillRect(x + 10, y + 5, 2, 2);
        ctx.fillStyle = PALETTE.sandLight;
        ctx.fillRect(x + 6, y + 9, 5, 6);
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x + 7, y + 11, 1, 1);
        ctx.fillRect(x + 9, y + 11, 1, 1);
        break;
      case "gargoyle":
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x + 1, y + 1, 14, 15);
        ctx.fillStyle = tint;
        ctx.fillRect(x + 2, y + 2, 12, 13);
        ctx.fillStyle = PALETTE.stoneDark;
        ctx.fillRect(x, y + 4, 3, 7);
        ctx.fillRect(x + 13, y + 4, 3, 7);
        ctx.fillStyle = PALETTE.red;
        ctx.fillRect(x + 5, y + 5, 2, 2);
        ctx.fillRect(x + 10, y + 5, 2, 2);
        ctx.fillStyle = PALETTE.stoneLight;
        ctx.fillRect(x + 5, y + 10, 6, 1);
        break;
      case "frost_wisp": {
        const halo = Math.floor(this.aiFrame / 8) % 3;
        ctx.globalAlpha = 0.32;
        ctx.fillStyle = PALETTE.waterLight;
        ctx.fillRect(x + 2 - halo, y + 2 - halo, 12 + halo * 2, 12 + halo * 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = tint;
        ctx.fillRect(x + 4, y + 4, 8, 8);
        ctx.fillStyle = PALETTE.white;
        ctx.fillRect(x + 6, y + 6, 4, 4);
        break;
      }
      case "bog_lurker":
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x + 1, y + 4, 14, 12);
        ctx.fillStyle = tint;
        ctx.fillRect(x + 2, y + 5, 12, 10);
        ctx.fillStyle = PALETTE.marsh;
        ctx.fillRect(x + 3, y + 3, 3, 4);
        ctx.fillRect(x + 10, y + 2, 3, 5);
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(x + 4, y + 8, 2, 2);
        ctx.fillRect(x + 10, y + 8, 2, 2);
        break;
      case "stone_crab": {
        const claw = Math.floor(this.aiFrame / 12) % 2;
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x + 2, y + 5, 12, 8);
        ctx.fillStyle = tint;
        ctx.fillRect(x + 3, y + 6, 10, 6);
        ctx.fillStyle = PALETTE.sandDark;
        ctx.fillRect(x - 1, y + 4 - claw, 4, 4);
        ctx.fillRect(x + 13, y + 4 + claw, 4, 4);
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x + 5, y + 4, 1, 3);
        ctx.fillRect(x + 10, y + 4, 1, 3);
        ctx.fillStyle = PALETTE.white;
        ctx.fillRect(x + 5, y + 3, 1, 1);
        ctx.fillRect(x + 10, y + 3, 1, 1);
        break;
      }
      case "night_walker": {
        // Un tronc monté sur racines. Il dépasse de sa case vers le haut :
        // c'est ce débordement qui le rend immédiatement plus grand que tout
        // ce qu'on a croisé jusque-là.
        const stride = Math.floor(this.aiFrame / 14) % 2;
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x + 1, y - 14, 14, 30);
        ctx.fillStyle = tint;
        ctx.fillRect(x + 2, y - 13, 12, 28);
        // Frondaison.
        ctx.fillStyle = PALETTE.pineDark;
        ctx.fillRect(x - 3, y - 22, 22, 10);
        ctx.fillStyle = PALETTE.leafDark;
        ctx.fillRect(x - 2, y - 24, 20, 9);
        ctx.fillStyle = PALETTE.leaf;
        ctx.fillRect(x + 1, y - 25, 13, 6);
        // Écorce et nœuds.
        ctx.fillStyle = PALETTE.woodDark;
        ctx.fillRect(x + 4, y - 10, 3, 20);
        ctx.fillRect(x + 9, y - 6, 2, 14);
        // Racines qui marchent.
        ctx.fillStyle = PALETTE.woodDark;
        ctx.fillRect(x + 1 + stride, y + 11, 5, 5);
        ctx.fillRect(x + 10 - stride, y + 11, 5, 5);
        ctx.fillRect(x - 2 + stride, y + 14, 4, 2);
        ctx.fillRect(x + 14 - stride, y + 14, 4, 2);
        // Deux yeux dans l'écorce : c'est ce qui fait qu'on ne le prend pas
        // pour un arbre.
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(x + 4, y - 8, 3, 3);
        ctx.fillRect(x + 10, y - 8, 3, 3);
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x + 5, y - 7, 1, 1);
        ctx.fillRect(x + 11, y - 7, 1, 1);
        break;
      }
      case "root_horror":
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x, y, 16, 16);
        ctx.fillStyle = tint;
        ctx.fillRect(x + 1, y + 2, 14, 13);
        ctx.fillStyle = PALETTE.woodDark;
        ctx.fillRect(x + 2, y, 3, 6);
        ctx.fillRect(x + 11, y, 3, 6);
        ctx.fillRect(x + 6, y + 12, 4, 4);
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(x + 4, y + 6, 2, 2);
        ctx.fillRect(x + 10, y + 6, 2, 2);
        break;
      default:
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(x + 2, y + 3, 12, 12);
        ctx.fillStyle = tint;
        ctx.fillRect(x + 3, y + 4, 10, 10);
        ctx.fillRect(x, y + 6, 4, 3);
        ctx.fillRect(x + 12, y + 6, 4, 3);
        ctx.fillStyle = PALETTE.yellow;
        ctx.fillRect(x + 5, y + 6, 2, 2);
        ctx.fillRect(x + 10, y + 6, 2, 2);
    }
  }
}
