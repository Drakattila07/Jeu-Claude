import { PALETTE } from "../data/palette";
import type { Input } from "../core/Input";
import type { TileMap } from "../world/TileMap";
import { moveOnGrid, resolveOverlap } from "../world/Collision";
import { Entity, type Rect, type Vec2 } from "./Entity";

export type Direction = "up" | "down" | "left" | "right";

/** Durée du recul encaissé par le joueur, en frames. */
export const KNOCKBACK_FRAMES = 8;
/** Durée totale d'une esquive roulée. */
export const ROLL_FRAMES = 18;
/** Frames d'invincibilité offertes par une esquive bien placée. */
export const ROLL_INVULNERABILITY = 13;
/** Repos imposé entre deux esquives. */
export const ROLL_COOLDOWN = 16;
/** Endurance maximale, et coût d'une esquive. */
export const MAX_STAMINA = 100;
export const ROLL_COST = 34;

const HITBOX: Rect = { x: 3, y: 9, width: 10, height: 7 };

/**
 * Fenêtre de parade parfaite, en frames après la levée du bouclier.
 *
 * Assez large pour être atteignable au jugé, assez étroite pour qu'on ne
 * l'obtienne pas en gardant le bouton enfoncé.
 */
export const PARRY_WINDOW = 10;
/** Endurance dépensée par un coup encaissé au bouclier. */
export const BLOCK_COST = 22;
/** Ouverture offerte par une parade parfaite : l'ennemi est sonné. */
export const RIPOSTE_FRAMES = 34;

export class Player extends Entity {
  direction: Direction = "down";
  walkFrame = 0;
  hearts = 6;
  maxHearts = 6;
  rupees = 12;
  /** Bonus d'attaque cumulé via les récompenses de quête. */
  swordBonus = 0;
  stamina = MAX_STAMINA;
  /** À la barre : l'eau devient praticable, la terre ne l'est plus. */
  sailing = false;
  /**
   * Vent courant, posé par le jeu à chaque image. Le joueur ne connaît pas
   * l'horloge : lui passer un vecteur évite de lui donner tout le monde.
   */
  wind: Readonly<Vec2> = { x: 0, y: 0 };
  private drift = { x: 0, y: 0 };
  private demon = false;
  attackFrame = -1;
  /** Frames de charge accumulées avant de relâcher le coup tournoyant. */
  chargeFrames = 0;
  spinFrames = -1;
  invulnerabilityFrames = 0;
  flashFrames = 0;
  knockbackFrames = 0;
  rollFrames = 0;
  rollCooldown = 0;
  /** Position de la dernière éclaboussure, pour que le jeu l'affiche. */
  splashed = false;
  private rollDirection = { x: 0, y: 1 };
  private knockback = { x: 0, y: 0 };
  private staminaLock = 0;
  /** Bouclier au poing : posé par le jeu quand l'objet est au sac. */
  hasShield = false;
  /** Frames depuis la levée du bouclier ; -1 s'il est baissé. */
  guardFrames = -1;
  /** Ouverture gagnée par une parade parfaite, à dépenser en riposte. */
  riposteFrames = 0;
  /** Techniques d'épée apprises, par identifiant. */
  readonly techniques = new Set<string>();
  /** Teinture du manteau : `null` pour le vert d'origine. */
  cloak: string | null = null;
  /** À dos de mulet : plus vite sur les chemins, jamais sur l'eau. */
  mounted = false;

  constructor(private readonly input: Input, private map: TileMap) {
    super({ x: 240, y: 336 }, HITBOX);
    this.depth = 10;
  }

  setMap(map: TileMap): void { this.map = map; }
  setDemon(active: boolean): void { this.demon = active; }
  toggleDemon(): boolean {
    this.demon = !this.demon;
    return this.demon;
  }
  get isDemon(): boolean { return this.demon; }
  get speed(): number {
    const base = this.demon ? 2.6 : 1.85;
    return this.mounted && !this.sailing ? base * 1.55 : base;
  }
  get attackDamage(): number { return (this.demon ? 2 : 1) + this.swordBonus; }
  get fireRadius(): number { return this.demon ? 40 : 0; }
  get isRolling(): boolean { return this.rollFrames > 0; }
  get isCharging(): boolean { return this.chargeFrames > 0 && this.attackFrame < 0; }
  /** Le coup tournoyant se déclenche à partir de 42 frames de charge. */
  get chargeReady(): boolean { return this.chargeFrames >= 42; }

  /** Annule recul, roulade et invulnérabilité (renaissance, chargement). */
  clearImpact(): void {
    this.invulnerabilityFrames = 0;
    this.flashFrames = 0;
    this.knockbackFrames = 0;
    this.rollFrames = 0;
    this.rollCooldown = 0;
    this.chargeFrames = 0;
    this.spinFrames = -1;
    this.attackFrame = -1;
    this.knockback = { x: 0, y: 0 };
    this.stamina = MAX_STAMINA;
  }

  /** Replace le personnage sur une case praticable de la carte courante. */
  unstick(): void {
    this.position = resolveOverlap(this.position, this.hitbox,
      (tileX, tileY) => this.map.solidFor(tileX, tileY, this.sailing),
      { width: this.map.pixelWidth, height: this.map.pixelHeight });
  }

  /** Monte ou descend de barque, et remet l'élan à zéro. */
  setSailing(active: boolean): void {
    this.sailing = active;
    this.drift = { x: 0, y: 0 };
    this.attackFrame = -1;
    this.chargeFrames = 0;
    this.rollFrames = 0;
  }

  update(): void {
    this.splashed = false;
    this.updateGuard();
    if (this.invulnerabilityFrames > 0) this.invulnerabilityFrames -= 1;
    if (this.flashFrames > 0) this.flashFrames -= 1;
    if (this.rollCooldown > 0) this.rollCooldown -= 1;
    if (this.staminaLock > 0) this.staminaLock -= 1;
    else if (this.stamina < MAX_STAMINA) this.stamina = Math.min(MAX_STAMINA, this.stamina + 0.85);

    if (this.attackFrame >= 0) {
      this.attackFrame += 1;
      if (this.attackFrame >= (this.spinFrames >= 0 ? 30 : 18)) {
        this.attackFrame = -1;
        this.spinFrames = -1;
      }
    }

    if (this.sailing) {
      this.updateSailing();
      return;
    }

    // Le recul prend la main sur les commandes : on subit le coup avant de repartir.
    if (this.knockbackFrames > 0) {
      const factor = this.knockbackFrames / KNOCKBACK_FRAMES;
      this.slide(this.knockback.x * factor, this.knockback.y * factor);
      this.knockbackFrames -= 1;
      this.walkFrame = 0;
      return;
    }

    if (this.rollFrames > 0) {
      // Une roulade décélère : la fin du mouvement se sent, elle n'est pas
      // coupée net.
      const progress = 1 - this.rollFrames / ROLL_FRAMES;
      const power = 3.4 * (1 - progress * progress * 0.85);
      this.slide(this.rollDirection.x * power, this.rollDirection.y * power);
      this.rollFrames -= 1;
      if (this.rollFrames <= 0) this.rollCooldown = ROLL_COOLDOWN;
      this.walkFrame = (this.walkFrame + 2) % 32;
      return;
    }

    const wanted = this.input.direction();
    if (this.input.wasPressed("Dash")) this.tryRoll(wanted);
    if (this.rollFrames > 0) return;

    let { x: dx, y: dy } = wanted;
    // Pendant l'élan de l'épée, on reste planté : le coup a du poids.
    if (this.attackFrame >= 0 && this.attackFrame <= 5) { dx = 0; dy = 0; }
    if (this.isCharging) { dx *= 0.42; dy *= 0.42; }
    // Bouclier levé : on avance au pas. Une garde qui n'entrave rien serait
    // gratuite, et l'on traverserait le jeu bouclier au poing.
    if (this.isGuarding) { dx *= 0.35; dy *= 0.35; }

    if (Math.abs(dx) > Math.abs(dy) && dx !== 0) this.direction = dx > 0 ? "right" : "left";
    else if (dy !== 0) this.direction = dy > 0 ? "down" : "up";

    const terrain = this.map.slowAtPixel(this.position.x + 8, this.position.y + 12);
    const speed = this.speed * terrain;
    this.velocity = { x: dx * speed, y: dy * speed };
    this.slide(this.velocity.x, this.velocity.y);
    if (dx !== 0 || dy !== 0) {
      this.walkFrame = (this.walkFrame + 1) % 32;
      if (terrain < 0.7 && this.walkFrame % 10 === 0) this.splashed = true;
    } else this.walkFrame = 0;
  }

  /**
   * Barre.
   *
   * Une coque ne s'arrête pas net : l'élan s'accumule et se dissipe. Sans
   * cette inertie, naviguer serait exactement marcher, en bleu.
   */
  private updateSailing(): void {
    const wanted = this.input.direction();
    // Le vent : au portant on file, au près on peine. Le cap comptait pour
    // rien — barrer revenait à marcher en bleu, avec de l'inertie.
    const wind = this.wind;
    const heading = Math.hypot(wanted.x, wanted.y);
    const alignment = heading > 0
      ? (wanted.x * wind.x + wanted.y * wind.y) / heading : 0;
    const push = 1 + alignment * 0.45;
    const top = 2.5 * (1 + alignment * 0.3);
    this.drift.x = (this.drift.x + wanted.x * 0.14 * push + wind.x * 0.012) * 0.972;
    this.drift.y = (this.drift.y + wanted.y * 0.14 * push + wind.y * 0.012) * 0.972;
    const speed = Math.hypot(this.drift.x, this.drift.y);
    if (speed > top) {
      this.drift.x = (this.drift.x / speed) * top;
      this.drift.y = (this.drift.y / speed) * top;
    }
    if (Math.abs(this.drift.x) > Math.abs(this.drift.y)) {
      if (Math.abs(this.drift.x) > 0.12) this.direction = this.drift.x > 0 ? "right" : "left";
    } else if (Math.abs(this.drift.y) > 0.12) {
      this.direction = this.drift.y > 0 ? "down" : "up";
    }
    this.velocity = { x: this.drift.x, y: this.drift.y };
    this.slide(this.drift.x, this.drift.y);
    this.walkFrame = (this.walkFrame + 1) % 32;
    // Sillage : une éclaboussure régulière tant que la barque avance.
    if (speed > 0.7 && this.walkFrame % 12 === 0) this.splashed = true;
  }

  private slide(dx: number, dy: number): void {
    this.position = moveOnGrid(this.position, { x: dx, y: dy }, this.hitbox,
      (tileX, tileY) => this.map.solidFor(tileX, tileY, this.sailing));
  }

  private tryRoll(wanted: Readonly<Vec2>): void {
    if (this.sailing || this.rollCooldown > 0 || this.stamina < ROLL_COST) return;
    const facing = wanted.x !== 0 || wanted.y !== 0 ? wanted : this.facingVector();
    this.rollDirection = facing;
    this.rollFrames = ROLL_FRAMES;
    this.invulnerabilityFrames = Math.max(this.invulnerabilityFrames, ROLL_INVULNERABILITY);
    this.stamina -= ROLL_COST;
    this.staminaLock = 26;
    this.attackFrame = -1;
    this.chargeFrames = 0;
  }

  /**
   * Garde.
   *
   * Le bouclier ne se lève qu'à l'arrêt et hors attaque : c'est ce qui
   * l'empêche de devenir un état permanent qu'on traverse le jeu à porter.
   */
  get isGuarding(): boolean { return this.guardFrames >= 0; }
  /** Vrai pendant la fenêtre où un coup encaissé devient une parade parfaite. */
  get inParryWindow(): boolean {
    return this.guardFrames >= 0 && this.guardFrames < PARRY_WINDOW;
  }
  get canRiposte(): boolean { return this.riposteFrames > 0; }

  private updateGuard(): void {
    if (this.riposteFrames > 0) this.riposteFrames -= 1;
    const wants = this.hasShield && !this.sailing && this.attackFrame < 0
      && this.rollFrames <= 0 && this.knockbackFrames <= 0
      && this.input.isDown("Guard") && this.stamina > 0;
    if (!wants) { this.guardFrames = -1; return; }
    this.guardFrames += 1;
  }

  /**
   * Encaisse au bouclier. Rend « parfait » si le coup tombe dans la fenêtre,
   * « bloqué » s'il est simplement arrêté, et rien du tout si la garde est
   * baissée ou l'endurance à sec.
   */
  block(direction: Readonly<Vec2>): "parfait" | "bloqué" | null {
    if (!this.isGuarding) return null;
    // On ne pare que ce qui vient d'en face : un coup dans le dos passe.
    const facing = this.facingVector();
    if (facing.x * -direction.x + facing.y * -direction.y < 0.2) return null;
    if (this.inParryWindow) {
      this.riposteFrames = RIPOSTE_FRAMES;
      this.invulnerabilityFrames = Math.max(this.invulnerabilityFrames, 20);
      this.guardFrames = PARRY_WINDOW;
      return "parfait";
    }
    if (this.stamina < BLOCK_COST) return null;
    this.stamina -= BLOCK_COST;
    this.staminaLock = 30;
    this.invulnerabilityFrames = Math.max(this.invulnerabilityFrames, 14);
    this.knockbackFrames = KNOCKBACK_FRAMES;
    this.knockback = { x: direction.x * 1.6, y: direction.y * 1.6 };
    return "bloqué";
  }

  facingVector(): Vec2 {
    if (this.direction === "up") return { x: 0, y: -1 };
    if (this.direction === "down") return { x: 0, y: 1 };
    if (this.direction === "left") return { x: -1, y: 0 };
    return { x: 1, y: 0 };
  }

  /** Accumule la charge tant que le bouton d'attaque reste enfoncé. */
  updateCharge(): void {
    if (this.attackFrame >= 0 || this.rollFrames > 0) return;
    if (this.input.isDown("Attack")) this.chargeFrames = Math.min(90, this.chargeFrames + 1);
  }

  startAttack(): boolean {
    if (this.sailing || this.attackFrame >= 0 || this.rollFrames > 0) return false;
    this.attackFrame = 0;
    this.spinFrames = -1;
    return true;
  }

  /** Relâche la charge : coup tournoyant si elle est complète. */
  releaseCharge(): "spin" | "none" {
    if (!this.chargeReady || this.attackFrame >= 0 || this.rollFrames > 0) {
      this.chargeFrames = 0;
      return "none";
    }
    this.chargeFrames = 0;
    this.attackFrame = 0;
    this.spinFrames = 0;
    return "spin";
  }

  get swordActive(): boolean {
    if (this.spinFrames >= 0) return this.attackFrame >= 3 && this.attackFrame < 26;
    return this.attackFrame >= 4 && this.attackFrame < 12;
  }

  get isSpinning(): boolean { return this.spinFrames >= 0 && this.attackFrame >= 0; }

  attackHitbox(): Rect {
    const x = this.position.x;
    const y = this.position.y;
    if (this.isSpinning) return { x: x - 18, y: y - 16, width: 52, height: 50 };
    if (this.direction === "up") return { x: x + 1, y: y - 14, width: 14, height: 18 };
    if (this.direction === "down") return { x: x + 1, y: y + 12, width: 14, height: 18 };
    if (this.direction === "left") return { x: x - 14, y: y + 1, width: 18, height: 14 };
    return { x: x + 12, y: y + 1, width: 18, height: 14 };
  }

  takeDamage(hearts: number, direction: Readonly<Vec2>): boolean {
    if (this.invulnerabilityFrames > 0) return false;
    this.hearts = Math.max(0, this.hearts - hearts);
    this.invulnerabilityFrames = 44;
    this.flashFrames = 5;
    this.knockbackFrames = KNOCKBACK_FRAMES;
    this.knockback = { x: direction.x * 3.4, y: direction.y * 3.4 };
    this.chargeFrames = 0;
    return true;
  }

  get isDead(): boolean { return this.hearts <= 0; }

  /**
   * Couleurs du manteau. La forme démoniaque prime sur la teinture : on ne
   * choisit pas la couleur du feu.
   */
  private get cloakTone(): { readonly dark: string; readonly light: string } {
    if (this.demon) return { dark: PALETTE.roofDark, light: PALETTE.red };
    if (this.cloak === "garance") return { dark: PALETTE.red, light: PALETTE.rose };
    if (this.cloak === "guede") return { dark: PALETTE.deepWater, light: PALETTE.waterLight };
    if (this.cloak === "safran") return { dark: PALETTE.wood, light: PALETTE.yellow };
    return { dark: PALETTE.leaf, light: PALETTE.leafLight };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.invulnerabilityFrames > 0 && this.rollFrames <= 0
      && Math.floor(this.invulnerabilityFrames / 4) % 2 === 0) return;
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    const step = Math.floor(this.walkFrame / 8) % 2;
    const walking = this.walkFrame > 0;
    const rolling = this.rollFrames > 0;
    const bob = walking && step === 1 ? -1 : 0;

    ctx.save();

    if (this.sailing) {
      this.drawBoat(ctx, x, y);
      ctx.restore();
      return;
    }

    // Ombre portée : elle se resserre pendant la roulade, comme un saut.
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = PALETTE.ink;
    const shadowShrink = rolling ? 3 : 0;
    ctx.fillRect(x + 2 + shadowShrink, y + 14, 12 - shadowShrink * 2, 2);
    ctx.fillRect(x + 4 + shadowShrink, y + 16, 8 - shadowShrink * 2, 1);
    ctx.globalAlpha = 1;

    if (rolling) {
      this.drawRoll(ctx, x, y);
      ctx.restore();
      return;
    }

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 3 + step, y + 12, 4, 4);
    ctx.fillRect(x + 9 - step, y + 12, 4, 4);
    ctx.fillRect(x + 2, y + 6 + bob, 12, 8);
    ctx.fillStyle = this.demon ? PALETTE.purple : PALETTE.pineDark;
    ctx.fillRect(x + 3, y + 7 + bob, 10, 7);
    ctx.fillStyle = this.demon ? PALETTE.red : this.cloakTone.dark;
    ctx.fillRect(x + 4, y + 7 + bob, 3, 6);
    ctx.fillStyle = this.demon ? PALETTE.yellow : this.cloakTone.light;
    ctx.fillRect(x + 5, y + 8 + bob, 1, 4);

    if (this.direction !== "up") {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 4, y + 1 + bob, 9, 7);
      ctx.fillStyle = this.demon ? PALETTE.rose : PALETTE.sandLight;
      ctx.fillRect(x + 5, y + 3 + bob, 7, 6);
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(x + 6, y + 3 + bob, 4, 2);
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 4, y + 1 + bob, 9, 3);
      ctx.fillRect(x + 11, y + 3 + bob, 2, 3);
    } else {
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 4, y + 1 + bob, 9, 7);
      ctx.fillStyle = PALETTE.wood;
      ctx.fillRect(x + 6, y + 3 + bob, 5, 4);
    }

    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(x + 1, y + 2 + bob, 13, 4);
    ctx.fillStyle = this.cloakTone.dark;
    ctx.fillRect(x + 2, y + 1 + bob, 12, 4);
    ctx.fillStyle = this.cloakTone.light;
    ctx.fillRect(x + (this.direction === "left" ? 1 : 3), y + bob, 9, 2);
    ctx.fillStyle = PALETTE.pineDark;
    ctx.fillRect(x + 11, y + 4 + bob, 4, 3);

    // La rondache, levée. Elle clignote pendant la fenêtre de parade : c'est
    // le seul retour qui apprend au joueur où se trouve le bon moment.
    if (this.isGuarding) {
      const facing = this.facingVector();
      // Centré sur l'axe du regard : posé plus bas, la rondache couvrait le
      // chapeau dès qu'on regardait vers le haut.
      const sx = x + 5 + facing.x * 11;
      const sy = y + 5 + facing.y * 11;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(sx - 1, sy - 1, 9, 11);
      ctx.fillStyle = this.inParryWindow ? PALETTE.yellow : PALETTE.wood;
      ctx.fillRect(sx, sy, 7, 9);
      ctx.fillStyle = this.inParryWindow ? PALETTE.cream : PALETTE.woodDark;
      ctx.fillRect(sx + 2, sy + 3, 3, 3);
    }

    if (this.demon) {
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(x + 2, y - 3 + bob, 2, 5);
      ctx.fillRect(x + 13, y - 3 + bob, 2, 5);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 2, y - 4 + bob, 1, 2);
      ctx.fillRect(x + 14, y - 4 + bob, 1, 2);
    }

    ctx.fillStyle = PALETTE.ink;
    if (this.direction === "left") ctx.fillRect(x + 5, y + 6 + bob, 1, 1);
    else if (this.direction === "right") ctx.fillRect(x + 11, y + 6 + bob, 1, 1);
    else if (this.direction === "down") {
      ctx.fillRect(x + 6, y + 6 + bob, 1, 1);
      ctx.fillRect(x + 10, y + 6 + bob, 1, 1);
    }

    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 4 + step, y + 13, 3, 3);
    ctx.fillRect(x + 10 - step, y + 13, 3, 3);

    if (this.isCharging) this.drawCharge(ctx, x, y);
    if (this.attackFrame >= 0) this.drawBlade(ctx, x, y, bob);
    ctx.restore();
  }

  /**
   * Barque vue de dessus : coque, banc, voile et gouvernail. Elle tangue au
   * rythme de la houle et s'incline dans le sens de la marche — sans quoi on
   * aurait l'impression de faire glisser une caisse sur l'eau.
   */
  private drawBoat(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const roll = Math.round(Math.sin(this.walkFrame / 5) * 1);
    const vertical = this.direction === "up" || this.direction === "down";

    // Sillage.
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = PALETTE.waterLight;
    ctx.fillRect(x - 2, y + 13 + roll, 20, 2);
    ctx.fillRect(x + 1, y + 15 + roll, 14, 1);
    ctx.globalAlpha = 1;

    ctx.translate(x + 8, y + 8 + roll);
    if (vertical) ctx.rotate(Math.PI / 2);

    // Coque.
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(-11, -5, 22, 11);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(-10, -4, 20, 9);
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(-9, -3, 18, 5);
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(-8, -3, 16, 1);
    // Proue et poupe.
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(this.direction === "left" ? -13 : 11, -3, 2, 6);
    // Banc et gouvernail.
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(-3, -4, 3, 9);
    ctx.fillRect(6, -1, 5, 2);
    // Mât et voile.
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(-1, -9, 2, 12);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(0, -9, 8 + roll, 8);
    ctx.fillStyle = PALETTE.sandLight;
    ctx.fillRect(0, -9, 8 + roll, 2);
    ctx.fillStyle = PALETTE.roof;
    ctx.fillRect(2, -6, 4, 2);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // La cartographe, assise à la barre.
    const head = { x: x + 5, y: y + 3 + roll };
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(head.x - 1, head.y - 1, 8, 8);
    ctx.fillStyle = this.demon ? PALETTE.rose : PALETTE.sandLight;
    ctx.fillRect(head.x, head.y + 1, 6, 5);
    ctx.fillStyle = this.demon ? PALETTE.roofDark : PALETTE.leaf;
    ctx.fillRect(head.x - 1, head.y - 1, 8, 3);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(head.x + 1, head.y + 3, 1, 1);
    ctx.fillRect(head.x + 4, head.y + 3, 1, 1);
  }

  private drawRoll(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const spin = Math.floor((ROLL_FRAMES - this.rollFrames) / 3) % 4;
    ctx.translate(x + 8, y + 8);
    ctx.rotate((spin * Math.PI) / 2);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(-7, -6, 14, 12);
    ctx.fillStyle = this.demon ? PALETTE.purple : PALETTE.pineDark;
    ctx.fillRect(-6, -5, 12, 10);
    ctx.fillStyle = this.demon ? PALETTE.red : PALETTE.leaf;
    ctx.fillRect(-5, -4, 5, 8);
    ctx.fillStyle = PALETTE.sandLight;
    ctx.fillRect(1, -3, 4, 4);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawCharge(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const ready = this.chargeReady;
    const pulse = Math.floor(this.chargeFrames / 3) % 2;
    ctx.globalAlpha = ready ? 0.85 : 0.4 + (this.chargeFrames / 42) * 0.4;
    ctx.fillStyle = ready ? PALETTE.white : PALETTE.waterLight;
    for (let spark = 0; spark < 4; spark += 1) {
      const angle = (this.chargeFrames / 6) + (spark * Math.PI) / 2;
      const radius = ready ? 13 : 9;
      ctx.fillRect(
        Math.round(x + 8 + Math.cos(angle) * radius),
        Math.round(y + 9 + Math.sin(angle) * radius * 0.7),
        2, 2,
      );
    }
    if (ready && pulse === 0) {
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(x - 2, y - 1, 20, 20);
    }
    ctx.globalAlpha = 1;
  }

  private drawBlade(ctx: CanvasRenderingContext2D, x: number, y: number, bob: number): void {
    if (this.isSpinning) {
      const angle = (this.attackFrame / 26) * Math.PI * 2.4;
      ctx.save();
      ctx.translate(x + 8, y + 9);
      ctx.rotate(angle);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(6, -3, 20, 6);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(6, -2, 19, 3);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(4, -2, 3, 4);
      ctx.restore();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = PALETTE.cream;
      ctx.beginPath();
      ctx.arc(x + 8, y + 9, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }

    const blade = this.attackHitbox();
    ctx.fillStyle = PALETTE.ink;
    if (this.direction === "up" || this.direction === "down") {
      ctx.fillRect(Math.round(blade.x + 5), Math.round(blade.y), 4, blade.height);
    } else {
      ctx.fillRect(Math.round(blade.x), Math.round(blade.y + 5), blade.width, 4);
    }
    ctx.fillStyle = this.flashFrames > 0 ? PALETTE.white : PALETTE.stoneLight;
    if (this.direction === "up" || this.direction === "down") {
      ctx.fillRect(Math.round(blade.x + 6), Math.round(blade.y), 2, blade.height - 2);
    } else {
      ctx.fillRect(Math.round(blade.x), Math.round(blade.y + 6), blade.width - 2, 2);
    }
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(x + 5, y + 8 + bob, 7, 2);
    if (this.swordActive) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(Math.round(blade.x), Math.round(blade.y), blade.width, blade.height);
      ctx.globalAlpha = 1;
    }
  }
}
