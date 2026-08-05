import { PALETTE } from "../data/palette";
import { ZONE_HEIGHT, ZONE_WIDTH } from "../core/Renderer";
import type { Player } from "./Player";
import { Entity, type Rect } from "./Entity";

interface SeedProjectile { x: number; y: number; vx: number; vy: number; active: boolean }

/** Racine qui jaillit du sol : l'attaque de la troisième phase. */
export interface RootSpike { x: number; y: number; timer: number }

const ARENA_CENTRE_X = ZONE_WIDTH / 2 - 32;
const ARENA_TOP = 104;

/** Frames de combustion ajoutées par un trait de feu, et plafond cumulé. */
const BURN_PER_HIT = 220;
const BURN_MAX = 480;
/** Une braise ronge un cœur tous les trois quarts de seconde. */
const BURN_INTERVAL = 45;

/**
 * L'Arbre-Mère.
 *
 * Le combat se gagnait en martelant : elle encaissait tout, sans rythme ni
 * respiration. Elle alterne désormais salves et fenêtres de faiblesse — hors
 * de ces fenêtres, l'écorce renvoie les coups.
 */
export class MotherTreeBoss extends Entity {
  // Vingt-quatre cœurs à un point par coup, dans des fenêtres de soixante-dix
  // frames : le combat durait sans jamais devenir plus intéressant. On raccourcit.
  maxHearts = 18;
  hearts = 18;
  flashFrames = 0;
  exposedFrames = 0;
  /** Frames de combustion restantes : un arbre, ça prend feu. */
  burnFrames = 0;
  private burnTick = 0;
  private frame = 0;
  readonly seeds: SeedProjectile[] = [];
  readonly spikes: RootSpike[] = [];

  constructor(private readonly target: Player) {
    super({ x: ARENA_CENTRE_X, y: ARENA_TOP }, { x: 8, y: 18, width: 48, height: 56 });
    this.depth = 20;
  }

  get phase(): 1 | 2 | 3 {
    if (this.hearts > 16) return 1;
    if (this.hearts > 8) return 2;
    return 3;
  }

  get bounds(): Rect {
    return { x: this.position.x + 8, y: this.position.y + 18, width: 48, height: 56 };
  }

  get healthRatio(): number { return Math.max(0, this.hearts / this.maxHearts); }
  get isExposed(): boolean { return this.exposedFrames > 0; }
  get isBurning(): boolean { return this.burnFrames > 0; }

  update(): void {
    if (!this.active) return;
    this.frame += 1;
    if (this.flashFrames > 0) this.flashFrames -= 1;
    if (this.exposedFrames > 0) this.exposedFrames -= 1;
    this.burn();

    const sway = this.phase === 1 ? 46 : this.phase === 2 ? 34 : 26;
    const rate = this.phase === 1 ? 62 : this.phase === 2 ? 46 : 34;
    this.position.x = ARENA_CENTRE_X + Math.round(Math.sin(this.frame / rate) * sway);
    this.position.y = ARENA_TOP + Math.round(Math.cos(this.frame / (rate * 1.7)) * 14);

    // Salves espacées et fenêtre de riposte large : on veut un rythme lisible,
    // pas une course contre la montre.
    const volleyPeriod = this.phase === 1 ? 140 : this.phase === 2 ? 105 : 80;
    if (this.frame % volleyPeriod === 0) {
      this.fireVolley();
      this.exposedFrames = 100;
    }

    if (this.phase === 3 && this.frame % 96 === 0) {
      for (let index = 0; index < 3; index += 1) {
        this.spikes.push({
          x: this.target.position.x + (index - 1) * 34,
          y: this.target.position.y + 8,
          timer: 46,
        });
      }
    }

    for (const seed of this.seeds) {
      seed.x += seed.vx;
      seed.y += seed.vy;
      if (seed.x < 0 || seed.x > ZONE_WIDTH || seed.y < 0 || seed.y > ZONE_HEIGHT) seed.active = false;
    }
    for (const spike of this.spikes) spike.timer -= 1;
    for (let index = this.spikes.length - 1; index >= 0; index -= 1) {
      if (this.spikes[index]!.timer <= 0) this.spikes.splice(index, 1);
    }
  }

  /** Racines effectivement sorties : ce sont elles qui blessent. */
  spikeBounds(): readonly Rect[] {
    return this.spikes
      .filter((spike) => spike.timer <= 26 && spike.timer > 8)
      .map((spike) => ({ x: spike.x - 8, y: spike.y - 20, width: 16, height: 28 }));
  }

  private fireVolley(): void {
    const count = this.phase === 1 ? 3 : this.phase === 2 ? 5 : 8;
    const spread = this.phase === 3 ? Math.PI * 2 : 0.9;
    const dx = this.target.position.x - (this.position.x + 32);
    const dy = this.target.position.y - (this.position.y + 40);
    const base = Math.atan2(dy, dx);
    for (let index = 0; index < count; index += 1) {
      const offset = (index / (count - 1) - 0.5) * spread;
      const angle = base + offset;
      const speed = 1.25 + this.phase * 0.2;
      this.seeds.push({
        x: this.position.x + 32, y: this.position.y + 40,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, active: true,
      });
    }
  }

  /** Emplacements des flammes : décalage x, décalage y, déphasage. */
  private static readonly FLAME_SEATS: readonly (readonly [number, number, number])[] = [
    [8, 22, 0], [18, 14, 7], [28, 10, 13], [38, 13, 3], [48, 20, 10], [54, 28, 16],
    [6, 30, 5], [24, 34, 11], [42, 32, 1],
    [25, 52, 8], [34, 62, 14], [26, 70, 2], [12, 56, 12], [44, 48, 6],
  ];

  /**
   * Combustion.
   *
   * Le bois sec ne se défend pas comme l'écorce vive : le feu ronge quoi qu'il
   * arrive, fenêtre ouverte ou non. C'est ce qui donne enfin une raison de
   * garder la forme démoniaque pendant le combat.
   */
  private burn(): void {
    if (this.burnFrames <= 0) return;
    this.burnFrames -= 1;
    this.burnTick += 1;
    if (this.burnTick < BURN_INTERVAL) return;
    this.burnTick = 0;
    this.hearts -= 1;
    this.flashFrames = Math.max(this.flashFrames, 3);
    if (this.hearts <= 0) this.active = false;
  }

  /** Met le feu. Vrai si l'arbre s'embrase pour la première fois. */
  ignite(): boolean {
    if (!this.active) return false;
    const fresh = this.burnFrames <= 0;
    this.burnFrames = Math.min(BURN_MAX, this.burnFrames + BURN_PER_HIT);
    return fresh;
  }

  /**
   * Encaisse un coup. La quantité comptait pour rien : un coup tournoyant
   * chargé retirait exactement autant qu'une pichenette, si bien qu'aucune
   * amélioration d'épée ne se sentait. Un arbre déjà en flammes s'écaille et
   * prend un point de plus.
   */
  hit(damage = 1): boolean {
    if (!this.active || this.flashFrames > 0) return false;
    if (this.exposedFrames <= 0) {
      this.flashFrames = 3;
      return false;
    }
    this.hearts -= Math.max(1, damage) + (this.isBurning ? 1 : 0);
    this.flashFrames = 5;
    if (this.hearts <= 0) this.active = false;
    return !this.active;
  }

  /**
   * Flammes qui montent le long du tronc et de la frondaison. Elles doivent se
   * voir de loin : c'est le seul retour qui dit que le feu travaille encore.
   */
  private drawFlames(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const dying = this.burnFrames < 90;
    ctx.globalAlpha = dying && Math.floor(this.frame / 6) % 2 === 0 ? 0.35 : 1;
    // Foyers posés à la main sur la silhouette — frondaison puis tronc. Un
    // semis calculé se repliait sur une seule colonne : l'arbre brûlait par
    // la tranche.
    for (const [dx, dy, phase] of MotherTreeBoss.FLAME_SEATS) {
      const rise = Math.floor((this.frame * 1.6 + phase) % 18);
      const height = 11 - Math.floor(rise / 3);
      if (height <= 2) continue;
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x + dx, y + dy - rise, 4, height);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + dx + 1, y + dy - rise, 2, height - 2);
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(x + dx + 1, y + dy - rise, 1, 2);
    }
    // Fumée au-dessus de la cime.
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = PALETTE.stoneDark;
    for (let index = 0; index < 3; index += 1) {
      const drift = Math.floor((this.frame / 3 + index * 22) % 34);
      ctx.fillRect(x + 16 + index * 12 + Math.round(Math.sin(drift / 6) * 4), y - 6 - drift, 5, 4);
    }
    ctx.globalAlpha = 1;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.active) return;
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    const exposed = this.exposedFrames > 0;
    ctx.save();

    ctx.globalAlpha = 0.32;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 6, y + 72, 52, 6);
    ctx.globalAlpha = 1;

    ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.woodDark;
    ctx.fillRect(x + 24, y + 26, 18, 48);
    ctx.fillRect(x + 10, y + 50, 18, 8);
    ctx.fillRect(x + 38, y + 42, 18, 8);
    ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.leafDark;
    ctx.fillRect(x + 5, y + 7, 54, 31);
    ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.leaf;
    ctx.fillRect(x + 12, y, 40, 28);
    ctx.fillStyle = PALETTE.leafLight;
    ctx.fillRect(x + 18, y + 3, 14, 6);

    ctx.fillStyle = exposed ? PALETTE.yellow : PALETTE.red;
    ctx.fillRect(x + 25, y + 30, exposed ? 4 : 3, exposed ? 4 : 3);
    ctx.fillRect(x + 39, y + 30, exposed ? 4 : 3, exposed ? 4 : 3);
    if (exposed) {
      ctx.globalAlpha = 0.24 + Math.sin(this.frame / 6) * 0.1;
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 8, y + 18, 48, 56);
      ctx.globalAlpha = 1;
    }
    if (this.phase === 3) {
      ctx.fillStyle = PALETTE.purple;
      ctx.fillRect(x, y + 58, 64, 5);
      ctx.fillRect(x + 5, y + 68, 54, 4);
    }
    if (this.burnFrames > 0) this.drawFlames(ctx, x, y);

    for (const seed of this.seeds) {
      if (!seed.active) continue;
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(Math.round(seed.x) - 2, Math.round(seed.y) - 2, 5, 5);
      ctx.fillStyle = PALETTE.leafLight;
      ctx.fillRect(Math.round(seed.x) - 1, Math.round(seed.y) - 1, 2, 2);
    }

    for (const spike of this.spikes) {
      if (spike.timer > 26) {
        // Marque au sol pendant la montée : on voit où ça va sortir.
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = PALETTE.red;
        ctx.fillRect(Math.round(spike.x) - 8, Math.round(spike.y) - 3, 16, 6);
        ctx.globalAlpha = 1;
        continue;
      }
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(Math.round(spike.x) - 5, Math.round(spike.y) - 28, 10, 28);
      ctx.fillStyle = PALETTE.wood;
      ctx.fillRect(Math.round(spike.x) - 3, Math.round(spike.y) - 26, 4, 24);
    }
    ctx.restore();
  }
}
