import { PALETTE } from "../data/palette";
import { Input } from "./Input";
import {
  Renderer, VIEW_HEIGHT, VIEW_WIDTH, ZONE_HEIGHT, ZONE_WIDTH, TILE_SIZE,
} from "./Renderer";
import { TileMap } from "../world/TileMap";
import { TileSet } from "../world/TileSet";
import { Player } from "../entities/Player";
import { Camera } from "./Camera";
import { Transition } from "../ui/Transition";
import { ZoneRegistry } from "../world/Zone";
import { INTERACTABLES } from "../data/interactables";
import { WORLD_ZONES } from "../data/world";
import { Interactable, ZoneObjectState } from "../entities/Interactable";
import { Combat, overlaps } from "../systems/Combat";
import { CASTLE_ENEMY_SPAWNS, type EnemySpawn } from "../data/enemies";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { Pickup } from "../entities/Pickup";
import { LanternCat } from "../entities/LanternCat";
import { TextBox, paginateText } from "../ui/TextBox";
import { EventBus, type GameEvent } from "./EventBus";
import { Flags } from "../systems/Flags";
import { QuestSystem } from "../systems/Quest";
import { Clock } from "./Clock";
import { Affinity } from "../systems/Affinity";
import { NPCS } from "../data/npcs/core";
import { Npc } from "../entities/Npc";
import { ZoneVariants } from "../world/ZoneVariants";
import { Inventory } from "../systems/Inventory";
import { Alchemy } from "../systems/Alchemy";
import { Dungeon } from "../systems/Dungeon";
import { HUD } from "../ui/HUD";
import { Menu } from "../ui/Menu";
import { MapScreen } from "../ui/MapScreen";
import { HintSystem } from "../systems/HintSystem";
import { Campaign } from "../systems/Campaign";
import { SideActivities } from "../systems/SideActivities";
import { Fishing } from "../systems/Fishing";
import { MotherTreeBoss } from "../entities/Boss";
import { epilogueLine } from "../data/epilogues";
import { Audio, type Mood } from "../systems/Audio";
import { Particles } from "../ui/Particles";
import { FloatingText } from "../ui/FloatingText";
import { WeatherOverlay, drawVignette } from "../ui/Weather";
import { Lighting, type Light } from "../systems/Lighting";
import { SaveLoad, type SaveData } from "../systems/SaveLoad";
import { Death, rupeesAfterDeath } from "../systems/Death";
import { Shop } from "../systems/Shop";
import { Progression } from "../systems/Progression";
import { Requirements, type WorldState } from "../systems/Requirements";
import { createZoneMap } from "../world/ZoneMapFactory";
import { gatewayFor, oppositeEdge } from "../world/WorldGen";
import { populateZone } from "../systems/Spawner";
import { TitleScreen } from "../ui/TitleScreen";
import { ITEMS, itemEffect, type ItemId } from "../data/items/core";
import {
  INTERIOR_ENTRY, INTERIOR_NAMES, createInteriorMap, nearInteriorExit, type InteriorKind,
} from "../world/Interiors";
import { BurningWorld } from "../world/BurningWorld";
import { drawText } from "../ui/Font";

export const FIXED_STEP_MS = 1000 / 60;
export const MAX_FRAME_DELTA_MS = 250;

export function consumeAccumulator(accumulatorMs: number, elapsedMs: number): {
  accumulatorMs: number;
  steps: number;
} {
  let remaining = accumulatorMs + Math.min(elapsedMs, MAX_FRAME_DELTA_MS);
  let steps = 0;
  while (remaining + Number.EPSILON >= FIXED_STEP_MS) {
    remaining -= FIXED_STEP_MS;
    steps += 1;
  }
  return { accumulatorMs: remaining, steps };
}

/** Portée d'interaction avec un objet ou un personnage, en pixels. */
const REACH = 34;

export class Game {
  private readonly renderer: Renderer;
  private readonly input: Input;
  private accumulatorMs = 0;
  private previousTimeMs = 0;
  private running = false;
  private frame = 0;
  private readonly tileSet = new TileSet();
  private map: TileMap;
  private readonly player: Player;
  private readonly camera = new Camera();
  private readonly transition = new Transition();
  private readonly zones = new ZoneRegistry();
  private readonly objectState = new ZoneObjectState();
  private interactables: Interactable[] = [];
  private notice = "";
  private noticeFrames = 0;
  private readonly combat = new Combat();
  private enemies: Enemy[] = [];
  private pickups: Pickup[] = [];
  private projectiles: Projectile[] = [];
  private readonly textBox = new TextBox();
  private readonly events = new EventBus();
  private readonly flags = new Flags();
  private readonly quests = new QuestSystem(this.flags, this.events);
  private readonly clock = new Clock();
  private readonly affinity = new Affinity();
  private npcs: Npc[] = [];
  private readonly variants = new ZoneVariants();
  private readonly inventory = new Inventory();
  private readonly alchemy = new Alchemy();
  private readonly dungeon = new Dungeon();
  private readonly hud = new HUD();
  private readonly menu = new Menu();
  private readonly mapScreen = new MapScreen();
  private readonly hints = new HintSystem(this.flags, this.quests);
  private readonly campaign = new Campaign(this.flags, this.quests, this.events);
  private readonly sideActivities = new SideActivities(this.flags, this.quests);
  private readonly fishing = new Fishing();
  private boss: MotherTreeBoss | null = null;
  private endingPending = false;
  private readonly audio = new Audio();
  private readonly particles = new Particles();
  private readonly floaters = new FloatingText();
  private readonly weather = new WeatherOverlay();
  private readonly lighting = new Lighting();
  private readonly saveLoad = new SaveLoad(
    typeof window === "undefined" ? memoryStorage() : window.localStorage);
  private readonly death = new Death();
  private readonly shop = new Shop(this.flags, this.inventory);
  private readonly progression = new Progression(this.flags);
  private readonly requirements = new Requirements(this.flags, this.inventory);
  private interior: InteriorKind | null = null;
  private exteriorReturnPosition = { x: 240, y: 300 };
  private readonly burning = new BurningWorld();
  private familiar: LanternCat | null = null;
  private lastScheduleHour = -1;
  private lastPopulatedDay = -1;
  private title: TitleScreen;
  private pendingSave: SaveData | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.input = new Input();
    this.map = new TileMap(createZoneMap(WORLD_ZONES[27]!), this.tileSet);
    this.player = new Player(this.input, this.map);

    // Une sauvegarde valide mais inattendue ne doit jamais empêcher le jeu de
    // démarrer : on la propose depuis l'écran-titre, sans l'imposer.
    this.pendingSave = this.saveLoad.load(0);
    this.title = new TitleScreen(this.pendingSave !== null,
      this.pendingSave ? describeSave(this.pendingSave) : "");
    this.startNewGame();
    this.loadZoneObjects();
    this.camera.snapTo(this.player.position);
    this.textBox.setBeep(() => this.audio.playSfx("text"));
    this.events.subscribe((event) => this.onQuestReward(event));
  }

  /** Verse les primes de quête que le système de quêtes annonce. */
  private onQuestReward(event: GameEvent): void {
    if (event.type !== "quest_reward" || event.payload?.reward !== "rupees") return;
    const amount = Number(event.payload.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.player.rupees = Math.min(this.progression.rupeeCap, this.player.rupees + amount);
    this.showNotice(`Prime de quête : +${amount} rubis.`, 180);
    this.audio.playSfx("secret");
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame(this.loop);
  }

  stop(): void { this.running = false; }

  debugAdvance(frames: number): void {
    for (let index = 0; index < Math.max(0, Math.floor(frames)); index += 1) this.update();
    this.render();
  }

  /** Ferme l'écran-titre : utilisé par l'outil de capture. */
  debugSkipTitle(): void {
    if (!this.title.active) return;
    this.title.active = false;
    this.beginNewGame();
    this.textBox.close();
  }

  /** Téléporte dans une région : sert à la planche de contrôle graphique. */
  debugGoto(zoneX: number, zoneY: number, hour = 10): void {
    this.title.active = false;
    this.textBox.close();
    this.menu.active = false;
    this.interior = null;
    this.clock.setTime(hour);
    this.camera.zone = { x: zoneX, y: zoneY };
    this.player.position = { x: ZONE_WIDTH / 2, y: ZONE_HEIGHT / 2 };
    this.loadZoneObjects();
    this.player.unstick();
    this.camera.snapTo(this.player.position);
    this.mapScreen.reveal(this.camera.zone);
    this.noticeFrames = 0;
  }

  /** Instantané lisible depuis l'extérieur : outils de vérification. */
  debugState(): {
    zone: { x: number; y: number }; x: number; y: number;
    hearts: number; rupees: number; enemies: number; inSolid: boolean;
    interior: string | null; busy: boolean;
  } {
    const tileX = Math.floor((this.player.position.x + this.player.hitbox.x) / TILE_SIZE);
    const tileY = Math.floor((this.player.position.y + this.player.hitbox.y) / TILE_SIZE);
    return {
      zone: { ...this.camera.zone },
      x: Math.round(this.player.position.x),
      y: Math.round(this.player.position.y),
      hearts: this.player.hearts,
      rupees: this.player.rupees,
      enemies: this.enemies.filter((enemy) => enemy.active).length,
      inSolid: this.map.isSolid(tileX, tileY),
      interior: this.interior,
      busy: this.death.active || this.textBox.active || this.menu.active
        || this.shop.active || this.transition.active || this.combat.frozen,
    };
  }

  /** Entre dans un intérieur sans passer par sa porte. */
  debugEnterInterior(kind: InteriorKind): void {
    this.title.active = false;
    this.textBox.close();
    this.interior = kind;
    this.useMap(new TileMap(createInteriorMap(kind), this.tileSet));
    this.player.position = { ...INTERIOR_ENTRY };
    this.player.unstick();
    this.camera.snapTo(this.player.position);
    this.interactables = [];
    this.enemies = [];
    this.npcs = [];
    this.noticeFrames = 0;
  }

  private readonly loop = (timeMs: number): void => {
    if (!this.running) return;
    const elapsedMs = this.previousTimeMs === 0 ? 0 : timeMs - this.previousTimeMs;
    this.previousTimeMs = timeMs;
    const consumed = consumeAccumulator(this.accumulatorMs, elapsedMs);
    this.accumulatorMs = consumed.accumulatorMs;
    for (let index = 0; index < consumed.steps; index += 1) this.update();
    this.render();
    requestAnimationFrame(this.loop);
  };

  // — Simulation ————————————————————————————————————————————

  private update(): void {
    this.frame += 1;
    this.input.poll();

    if (this.title.active) {
      this.updateTitle();
      return;
    }

    this.combat.update();
    this.camera.update();
    this.clock.update();
    this.particles.update();
    this.floaters.update();
    this.burning.update();
    this.hud.update();
    this.weather.update(this.clock.weather, this.currentZone()?.biome);
    // La transition avance toujours : un menu ouvert pendant un fondu ne doit
    // pas le figer.
    this.transition.update();
    this.refreshScheduleIfNeeded();

    if (this.input.wasPressed("A") || this.input.wasPressed("Attack")
      || this.input.wasPressed("B") || this.input.wasPressed("Start")) this.audio.unlock();
    this.audio.update(this.frame, this.mood());

    if (!this.death.active && this.player.hearts <= 0 && this.death.begin()) {
      this.textBox.close();
      this.menu.active = false;
      this.shop.close();
      this.fishing.cancel();
      this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "smoke", 24);
      this.audio.playSfx("hurt");
      this.combat.impact(4, 16);
    }
    if (this.death.active) {
      this.death.update();
      const choice = this.death.read(this.input);
      if (choice === "respawn") this.respawn();
      else if (choice === "load") this.reloadFromSave();
      this.input.endFrame();
      return;
    }

    this.progression.apply(this.player);

    if (this.textBox.active) {
      this.textBox.update(this.input);
      this.input.endFrame();
      return;
    }
    if (this.shop.active) {
      this.updateShop();
      this.input.endFrame();
      return;
    }
    if (this.menu.active) {
      this.menu.update(this.input, this.inventory);
      const request = this.menu.takeUseRequest();
      if (request) this.useItem(request);
      this.input.endFrame();
      return;
    }
    if (this.input.wasPressed("Start")) {
      this.menu.open("sac");
      this.input.endFrame();
      return;
    }
    if (this.input.wasPressed("Map")) {
      this.menu.open("carte");
      this.input.endFrame();
      return;
    }
    if (this.input.wasPressed("Select")) {
      this.toggleDemonForm();
      this.input.endFrame();
      return;
    }
    if (this.fishing.active) {
      const result = this.fishing.update(this.input);
      if (result === "caught") {
        this.player.rupees += 8;
        this.floaters.reward(this.player.position.x + 8, this.player.position.y - 6, "+8");
        this.quests.notify("collect", "fish", this.frame);
        this.audio.playSfx("secret");
      }
      this.input.endFrame();
      return;
    }
    if (this.endingPending) {
      this.updateEndingChoice();
      this.input.endFrame();
      return;
    }
    if (this.input.wasPressed("B")) {
      if (this.currentZone()?.id === "quai_lac" && !this.interior) {
        if (this.flags.has("fishing_unlocked")) this.fishing.start(this.clock.day);
        else this.textBox.open("Il vous manque une canne. Nessa en a perdu une dans la Lisière.");
        this.input.endFrame();
        return;
      }
      this.useFirstRemedy();
    }

    if (!this.transition.active && !this.combat.frozen) {
      this.updateWorld();
    }
    this.camera.follow(this.player.position);
    this.quests.syncFlags(this.frame);
    if (this.noticeFrames > 0) this.noticeFrames -= 1;
    this.input.endFrame();
  }

  private updateTitle(): void {
    const choice = this.title.update(this.input);
    if (choice === "new") {
      this.audio.unlock();
      this.beginNewGame();
    } else if (choice === "continue" && this.pendingSave) {
      this.audio.unlock();
      try {
        this.restoreSave(this.pendingSave);
      } catch {
        this.saveLoad.erase(0);
        this.startNewGame();
      }
      this.loadZoneObjects();
      this.player.unstick();
      this.camera.snapTo(this.player.position);
      this.announceZone();
    }
    if (this.input.wasPressed("A") || this.input.wasPressed("Start")) this.audio.unlock();
    this.audio.update(this.frame, "title");
    this.input.endFrame();
  }

  private beginNewGame(): void {
    this.startNewGame();
    this.loadZoneObjects();
    this.player.unstick();
    this.camera.snapTo(this.player.position);
    this.announceZone();
    this.textBox.open(
      "La Vallée de Bruyère s'assèche. Le puits ne rend plus que de la poussière, "
      + "et les arbres, dit-on, se sont mis à marcher. Relevez la vallée : "
      + "c'est votre métier.",
      "Les Racines Creuses",
    );
  }

  private updateWorld(): void {
    this.player.update();
    if (this.player.splashed) {
      this.particles.emit(this.player.position.x + 8, this.player.position.y + 14, "splash", 5);
      if (this.frame % 20 === 0) this.audio.playSfx("splash");
    }
    if (this.player.isRolling && this.frame % 3 === 0) {
      this.particles.emit(this.player.position.x + 8, this.player.position.y + 14, "dust", 3);
    }
    this.familiar?.update();
    this.updateNpcs();
    this.updateEnemies();
    this.updateBoss();
    this.updateProjectiles();
    this.updatePickups();

    if (this.input.wasPressed("A")) this.interact();
    this.updateAttacks();
    this.checkCastleRelic();
    this.checkZoneEdge();
  }

  private updateNpcs(): void {
    for (const npc of this.npcs) {
      npc.update();
      if (!npc.tryAttack()) continue;
      const dx = this.player.position.x - npc.position.x;
      const dy = this.player.position.y - npc.position.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      if (this.player.takeDamage(1, { x: dx / length, y: dy / length })) {
        this.onPlayerHurt(1);
        this.combat.confirmHit(`npc-attack:${npc.data.id}:${this.frame}`, npc.isGuard);
      }
    }
  }

  private updateEnemies(): void {
    const playerBox = {
      x: this.player.position.x + this.player.hitbox.x,
      y: this.player.position.y + this.player.hitbox.y,
      width: this.player.hitbox.width,
      height: this.player.hitbox.height,
    };
    for (const enemy of this.enemies) {
      enemy.update();
      if (!enemy.active) continue;

      const strike = enemy.takeStrike();
      if (strike) {
        if (strike.ranged) {
          this.projectiles.push(new Projectile(
            { x: strike.x, y: strike.y }, strike.direction,
            enemy.spawn.type === "frost_wisp" ? "frost" : "ember", "foe"));
          this.audio.playSfx("charge");
        } else {
          const blade = { x: strike.x - 12, y: strike.y - 12, width: 24, height: 24 };
          if (overlaps(blade, playerBox)
            && this.player.takeDamage(strike.damage, strike.direction)) {
            this.onPlayerHurt(strike.damage);
          }
          this.particles.spray(strike.x, strike.y, "dust", strike.direction, 4);
          this.audio.playSfx("sword");
        }
      }

      // Seule la charge d'une créature en pleine frappe blesse au contact.
      // Le dégât de contact permanent doublait chaque attaque annoncée : on
      // perdait des cœurs sans avoir rien vu venir, et se battre proprement
      // ne servait à rien.
      if (enemy.state === "strike" && overlaps(enemy.bounds, playerBox)) {
        const dx = this.player.position.x - enemy.position.x;
        const dy = this.player.position.y - enemy.position.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        if (this.player.takeDamage(enemy.definition.damage,
          { x: dx / length, y: dy / length })) this.onPlayerHurt(enemy.definition.damage);
      }
    }
  }

  private updateBoss(): void {
    const boss = this.boss;
    if (!boss?.active) return;
    boss.update();
    const playerBox = {
      x: this.player.position.x + this.player.hitbox.x,
      y: this.player.position.y + this.player.hitbox.y,
      width: this.player.hitbox.width,
      height: this.player.hitbox.height,
    };
    for (const seed of boss.seeds) {
      if (!seed.active) continue;
      const box = { x: seed.x - 3, y: seed.y - 3, width: 6, height: 6 };
      if (!overlaps(box, playerBox)) continue;
      seed.active = false;
      const dx = this.player.position.x - seed.x;
      const dy = this.player.position.y - seed.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      if (this.player.takeDamage(1, { x: dx / length, y: dy / length })) this.onPlayerHurt(1);
    }
    for (const spike of boss.spikeBounds()) {
      if (!overlaps(spike, playerBox)) continue;
      if (this.player.takeDamage(2, { x: 0, y: -1 })) this.onPlayerHurt(2);
    }
  }

  private updatePickups(): void {
    for (const pickup of this.pickups) {
      pickup.update(this.player.position);
      if (!pickup.active) continue;
      const playerBox = {
        x: this.player.position.x, y: this.player.position.y, width: 16, height: 16,
      };
      if (!overlaps(pickup.bounds, playerBox)) continue;
      pickup.collect();
      this.audio.playSfx("pickup");
      if (pickup.kind === "rupee") {
        this.player.rupees = Math.min(this.progression.rupeeCap, this.player.rupees + pickup.amount);
        this.floaters.reward(pickup.position.x, pickup.position.y - 6, `+${pickup.amount}`);
      } else if (pickup.kind === "heart") {
        this.player.hearts = Math.min(this.player.maxHearts, this.player.hearts + pickup.amount);
        this.floaters.push(pickup.position.x, pickup.position.y - 6, `+${pickup.amount}`, PALETTE.red);
        this.particles.emit(pickup.position.x, pickup.position.y, "heal", 6);
      } else {
        this.player.stamina = Math.min(100, this.player.stamina + pickup.amount);
      }
    }
    this.pickups = this.pickups.filter((pickup) => pickup.active);
  }

  private updateAttacks(): void {
    this.player.updateCharge();
    if (this.player.isCharging && this.player.chargeReady && this.frame % 12 === 0) {
      this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "spark", 3);
    }
    if (this.input.wasPressed("Attack") && this.player.startAttack()) {
      this.combat.beginSwing();
      this.audio.playSfx("sword");
      if (this.player.isDemon) this.castFireball();
    }
    // Relâcher une charge complète déclenche le coup tournoyant.
    if (!this.input.isDown("Attack") && this.player.isCharging) {
      if (this.player.releaseCharge() === "spin") {
        this.combat.beginSwing();
        this.audio.playSfx("spin");
        this.combat.impact(2, 8);
        this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "ring", 14);
      }
    }
    if (this.player.swordActive) this.resolveSwordHits();
  }

  private castFireball(): void {
    const facing = this.player.facingVector();
    this.projectiles.push(new Projectile(
      { x: this.player.position.x + 8 + facing.x * 10, y: this.player.position.y + 8 + facing.y * 10 },
      facing, "fireball", "player"));
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "ember", 10);
    this.igniteAround(this.player.position.x + 8, this.player.position.y + 8);
  }

  private resolveSwordHits(): void {
    const sword = this.player.attackHitbox();
    const spinning = this.player.isSpinning;
    const damage = this.player.attackDamage * (spinning ? 2 : 1);

    if (this.boss?.active) {
      const inWave = this.player.isDemon
        && Math.hypot(this.boss.position.x + 32 - this.player.position.x,
          this.boss.position.y + 40 - this.player.position.y) <= this.player.fireRadius + 24;
      if ((overlaps(sword, this.boss.bounds) || inWave) && this.combat.confirmHit("mother_tree", true)) {
        const wasExposed = this.boss.isExposed;
        const defeated = this.boss.hit();
        this.audio.playSfx(wasExposed ? "hit" : "deny");
        if (wasExposed) {
          this.floaters.damage(this.boss.position.x + 32, this.boss.position.y + 10, 1, true);
          this.particles.emit(this.boss.position.x + 32, this.boss.position.y + 40, "leaf", 10);
        } else {
          this.floaters.push(this.boss.position.x + 32, this.boss.position.y + 10, "écorce",
            PALETTE.stoneLight);
        }
        if (defeated) this.onBossDefeated();
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const inWave = this.player.isDemon
        && Math.hypot(enemy.position.x - this.player.position.x,
          enemy.position.y - this.player.position.y) <= this.player.fireRadius;
      if (!overlaps(sword, enemy.bounds) && !inWave) continue;
      // Interrompre une annonce compte comme un contre : le coup fait mal.
      const parry = enemy.isTelegraphing;
      if (!this.combat.confirmHit(enemy.spawn.id, spinning || parry)) continue;
      const total = damage + (parry ? 1 : 0);
      const defeated = enemy.hit(total, this.player.position);
      this.audio.playSfx("hit");
      this.floaters.damage(enemy.position.x + 8, enemy.position.y - 2, total, spinning || parry);
      this.particles.spray(enemy.position.x + 8, enemy.position.y + 8, "blood", {
        x: enemy.position.x - this.player.position.x,
        y: enemy.position.y - this.player.position.y,
      }, 5);
      if (defeated) this.onEnemyDefeated(enemy);
    }

    for (const npc of this.npcs) {
      const inWave = this.player.isDemon
        && Math.hypot(npc.position.x - this.player.position.x,
          npc.position.y - this.player.position.y) <= this.player.fireRadius;
      if ((!overlaps(sword, npc.bounds) && !inWave) || !this.combat.confirmHit(`npc:${npc.data.id}`)) continue;
      npc.provoke(this.player.position);
      for (const guard of this.npcs) if (guard.isGuard) guard.alert();
      this.flags.set("village_alarm");
      this.showNotice(npc.isGuard
        ? "Le garde pare le coup et sonne l'alarme !"
        : `${npc.data.name} se défend ! Le garde accourt.`, 120);
      this.audio.playSfx("hit");
      this.particles.emit(npc.position.x + 8, npc.position.y + 8, "spark", 6);
    }

    for (const object of this.interactables) {
      if (object.data.kind !== "bush" && object.data.kind !== "roots") continue;
      if (!overlaps(sword, object.bounds()) || !this.combat.confirmHit(object.data.id)) continue;
      const result = object.interact();
      const campaignMessage = result.changed ? this.campaign.trigger(object.data.id, this.frame) : null;
      this.showNotice(campaignMessage ?? "FSSSH ! Des feuilles tourbillonnent.", 90);
      this.particles.emit(object.position.x + 8, object.position.y + 8, "leaf", 14);
      this.audio.playSfx("hit");
      // Un buisson coupé rend parfois de quoi tenir un peu plus longtemps.
      if (result.changed && (object.position.x + object.position.y) % 3 === 0) {
        this.pickups.push(new Pickup(
          { x: object.position.x + 8, y: object.position.y + 8 }, "rupee", 1, this.frame));
      }
    }
  }

  private onEnemyDefeated(enemy: Enemy): void {
    this.quests.notify("defeat", enemy.spawn.type, this.frame);
    this.particles.emit(enemy.position.x + 8, enemy.position.y + 8, "smoke", 10);
    this.combat.impact(2, 6);
    const bounty = enemy.definition.bounty;
    const drops = bounty >= 10 ? 3 : bounty >= 5 ? 2 : 1;
    for (let index = 0; index < drops; index += 1) {
      this.pickups.push(new Pickup(
        { x: enemy.position.x + 8, y: enemy.position.y + 8 },
        "rupee", Math.max(1, Math.round(bounty / drops)), this.frame));
    }
    // Une créature sur quatre laisse un cœur : de quoi enchaîner sans revenir
    // au village à chaque égratignure.
    if ((enemy.position.x + enemy.position.y + this.frame) % 4 === 0) {
      this.pickups.push(new Pickup(
        { x: enemy.position.x + 8, y: enemy.position.y + 4 }, "heart", 1, this.frame));
    }
    this.showNotice(`${enemy.definition.name} vaincu`, 70);
  }

  private onBossDefeated(): void {
    this.flags.set("boss_defeated");
    this.quests.notify("defeat", "mother_tree", this.frame);
    this.endingPending = true;
    this.combat.impact(5, 26);
    this.textBox.open("L'Arbre-Mère s'agenouille. X : la libérer · C : l'enraciner.");
  }

  private onPlayerHurt(amount: number): void {
    this.audio.playSfx("hurt");
    this.combat.impact(3, 10);
    this.floaters.push(this.player.position.x + 8, this.player.position.y - 4, `-${amount}`, PALETTE.red);
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "blood", 6);
  }

  private updateProjectiles(): void {
    const playerBox = {
      x: this.player.position.x + this.player.hitbox.x,
      y: this.player.position.y + this.player.hitbox.y,
      width: this.player.hitbox.width,
      height: this.player.hitbox.height,
    };
    for (const projectile of this.projectiles) {
      projectile.update();
      if (!projectile.active) continue;

      if (projectile.side === "foe") {
        if (overlaps(projectile.bounds, playerBox)) {
          projectile.destroy();
          const direction = {
            x: this.player.position.x - projectile.position.x,
            y: this.player.position.y - projectile.position.y,
          };
          const length = Math.max(1, Math.hypot(direction.x, direction.y));
          if (this.player.takeDamage(projectile.damage,
            { x: direction.x / length, y: direction.y / length })) this.onPlayerHurt(projectile.damage);
          this.particles.emit(projectile.position.x, projectile.position.y, "spark", 8);
        }
      } else {
        if (this.boss?.active && overlaps(projectile.bounds, this.boss.bounds)) {
          const wasExposed = this.boss.isExposed;
          const defeated = this.boss.hit();
          this.particles.emit(projectile.position.x, projectile.position.y, "spark", 12);
          projectile.destroy();
          if (wasExposed) this.floaters.damage(this.boss.position.x + 32, this.boss.position.y + 10, 1);
          if (defeated) this.onBossDefeated();
        }
        for (const enemy of this.enemies) {
          if (!projectile.active || !enemy.active || !overlaps(projectile.bounds, enemy.bounds)) continue;
          const defeated = enemy.hit(projectile.damage, this.player.position);
          this.floaters.damage(enemy.position.x + 8, enemy.position.y - 2, projectile.damage);
          this.particles.emit(enemy.position.x + 8, enemy.position.y + 8, "spark", 8);
          if (defeated) this.onEnemyDefeated(enemy);
          projectile.destroy();
        }
        for (const npc of this.npcs) {
          if (!projectile.active || !overlaps(projectile.bounds, npc.bounds)) continue;
          npc.provoke(this.player.position);
          for (const guard of this.npcs) if (guard.isGuard) guard.alert();
          this.flags.set("village_alarm");
          this.showNotice("La boule de feu déclenche l'alarme du village !", 120);
          projectile.destroy();
        }
      }

      if (!projectile.active) continue;
      const tileX = Math.floor(projectile.position.x / TILE_SIZE);
      const tileY = Math.floor(projectile.position.y / TILE_SIZE);
      if (this.map.isSolid(tileX, tileY)) {
        if (projectile.kind === "fireball") this.igniteAround(projectile.position.x, projectile.position.y);
        this.particles.emit(projectile.position.x, projectile.position.y, "smoke", 8);
        projectile.destroy();
      }
    }
    this.projectiles = this.projectiles.filter((projectile) => projectile.active);
  }

  // — Interactions ————————————————————————————————————————

  private interact(): void {
    if (this.interior && nearInteriorExit(this.player.position)) {
      this.leaveInterior();
      return;
    }
    if (this.familiar && this.familiar.distanceTo(this.player.position) <= 34) {
      this.blessFromFamiliar();
      return;
    }

    const nearest = this.interactables
      .filter((object) => object.distanceTo(this.player.position) <= REACH)
      .sort((a, b) => a.distanceTo(this.player.position) - b.distanceTo(this.player.position))[0];
    const nearestNpc = this.npcs
      .filter((npc) => npc.distanceTo(this.player.position) <= REACH)
      .sort((a, b) => a.distanceTo(this.player.position) - b.distanceTo(this.player.position))[0];

    if (nearestNpc && (!nearest
      || nearestNpc.distanceTo(this.player.position) < nearest.distanceTo(this.player.position))) {
      this.talkTo(nearestNpc);
      return;
    }
    if (!nearest) return;
    if (nearest.data.kind === "door") {
      this.enterInterior(nearest.data.id === "hermitage_door" ? "hermitage"
        : nearest.data.id === "castle_gate" ? "castle"
          : nearest.data.id === "witch_tower_door" ? "tower" : "cottage");
      return;
    }
    this.useInteractable(nearest);
  }

  private talkTo(npc: Npc): void {
    const postgameLine = this.flags.has("ending_release")
      ? epilogueLine("release", npc.data.id)
      : this.flags.has("ending_root")
        ? epilogueLine("root", npc.data.id)
        : null;
    const line = postgameLine ?? (npc.data.id === "sylve"
      ? this.hints.hint(this.camera.zone)
      : npc.talk(this.events));
    const campaignLine = npc.data.id === "bram"
      ? this.campaign.trigger("bram_sword", this.frame)
      : null;
    if (npc.data.id === "bram") this.audio.playSfx("anvil");
    this.textBox.open(campaignLine ?? line, npc.data.name, npc.data.id);
    this.affinity.add(npc.data.id, 1);
    this.quests.notify("talkTo", npc.data.id, this.frame);
    if (npc.data.id === "nessa" && this.flags.has("rod_found")) {
      this.sideActivities.trigger("lost_rod", this.frame);
      this.quests.notify("talkTo", "nessa", this.frame);
    }
    if (npc.data.id === "colporteur") this.shop.open();
    // Chaque jumeau ne connaît que la moitié de la comptine.
    if (npc.data.id === "ryn") this.flags.set("heard_ryn");
    if (npc.data.id === "tam") this.flags.set("heard_tam");
    this.events.publish({ type: "talk", id: npc.data.id, frame: this.frame });
  }

  private useInteractable(nearest: Interactable): void {
    // Un objet sous condition refuse d'abord, et explique pourquoi.
    const gate = this.requirements.check(nearest.data.requires, this.worldState());
    if (!gate.ok && !nearest.isSpent) {
      this.showNotice(gate.reason, 160);
      this.textBox.open(gate.reason);
      this.audio.playSfx("deny");
      return;
    }
    const result = nearest.data.kind === "cauldron"
      ? this.alchemy.brewFirst(this.inventory)
      : nearest.data.kind === "valve"
        ? { message: this.dungeon.turnValve(0), changed: true }
        : nearest.data.kind === "roots"
          ? { message: nearest.data.text, changed: false }
          : nearest.data.kind === "footprints" && !this.clock.isNight
            ? { message: "De jour, les empreintes restent immobiles. Revenez la nuit.", changed: false }
            : nearest.interact();

    // Les offrandes ne consomment le sac qu'une fois le geste accompli.
    if ("changed" in result && result.changed) {
      this.requirements.consume(nearest.data.requires, this.worldState());
    }
    const campaignMessage = "changed" in result && result.changed
      ? this.campaign.trigger(nearest.data.id, this.frame) : null;
    const sideMessage = "changed" in result && result.changed
      ? this.sideActivities.trigger(nearest.data.id, this.frame) : null;
    if ("changed" in result && result.changed && nearest.data.kind === "chest") {
      for (let index = 0; index < 4; index += 1) {
        this.pickups.push(new Pickup(
          { x: nearest.position.x + 8, y: nearest.position.y + 8 }, "rupee", 5, this.frame));
      }
      this.particles.emit(nearest.position.x + 8, nearest.position.y + 4, "spark", 14);
    }
    const message = campaignMessage ?? sideMessage ?? result.message;
    this.showNotice(message, 150);
    this.textBox.open(message);
    if (nearest.data.kind === "cauldron" || nearest.data.kind === "valve") {
      this.audio.playSfx("splash");
      this.particles.emit(nearest.position.x + 8, nearest.position.y + 8,
        nearest.data.kind === "cauldron" ? "smoke" : "bubble", 10);
    }
    if (sideMessage) this.audio.playSfx("secret");
    if ("result" in result && result.result === "eternal_lantern") this.flags.set("lantern");
    this.events.publish({ type: "interact", id: nearest.data.id, frame: this.frame });

    if (nearest.data.kind === "well" && this.flags.has("source_open")) {
      this.death.setCheckpoint(this.camera.zone, nearest.position.x - 8, nearest.position.y + 34);
      this.saveLoad.save(0, this.createSave());
      this.player.hearts = this.player.maxHearts;
      this.player.stamina = 100;
      this.particles.emit(nearest.position.x + 8, nearest.position.y + 4, "heal", 16);
      const text = "La fraîcheur du puits vous soigne. Partie sauvegardée.";
      this.showNotice(text, 160);
      this.textBox.open(text);
      this.audio.playSfx("secret");
    }
  }

  private blessFromFamiliar(): void {
    const alreadyBlessed = this.flags.has("lantern_cat_blessing");
    this.flags.set("lantern_cat_blessing");
    this.player.hearts = this.player.maxHearts;
    this.player.stamina = 100;
    this.textBox.open(this.familiar!.blessingMessage(alreadyBlessed), "Chat-Lanterne", "chat");
    this.showNotice("La bénédiction féline restaure tous vos cœurs.", 120);
    this.particles.emit(this.familiar!.position.x + 8, this.familiar!.position.y + 8, "heal", 18);
    this.audio.playSfx("secret");
  }

  private toggleDemonForm(): void {
    if (!this.flags.has("half_demon_skull")) {
      this.showNotice("Une force ancienne manque encore.", 90);
      this.audio.playSfx("deny");
      return;
    }
    const active = this.player.toggleDemon();
    this.showNotice(active
      ? "Le Crâne s'éveille : forme DEMI-DÉMON activée."
      : "La chaleur retombe : forme humaine restaurée.", 120);
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 8,
      active ? "ember" : "smoke", 18);
    this.audio.playSfx("secret");
  }

  private updateShop(): void {
    const purchase = this.shop.update(this.input, this.player);
    if (purchase.kind !== "bought") return;
    this.audio.playSfx("secret");
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "spark", 10);
    if (!purchase.entry.trigger) return;
    const message = this.sideActivities.trigger(purchase.entry.trigger, this.frame);
    if (!message) return;
    this.shop.close();
    this.showNotice(message, 210);
    this.textBox.open(message, "Le Colporteur", "colporteur");
  }

  private updateEndingChoice(): void {
    if (!this.input.wasPressed("A") && !this.input.wasPressed("B")) return;
    const release = this.input.wasPressed("A");
    this.flags.set(release ? "ending_release" : "ending_root");
    this.quests.notify("choice", "ending", this.frame);
    this.textBox.open(release
      ? "Vous libérez l'Arbre-Mère. Elle se lève et disparaît derrière les Cimes."
      : "Vous enracinez l'Arbre-Mère. L'eau jaillit tandis qu'elle s'endort.");
    this.endingPending = false;
  }

  /** Consomme le premier remède du sac : le raccourci de combat. */
  private useFirstRemedy(): void {
    const entry = this.inventory.snapshot().find((candidate) => itemEffect(candidate.id) !== undefined);
    if (!entry) {
      this.showNotice("Aucun remède dans le sac.", 70);
      this.audio.playSfx("deny");
      return;
    }
    this.useItem(entry.id);
  }

  private useItem(id: ItemId): void {
    const definition = ITEMS[id];
    const effect = itemEffect(id);
    if (!effect || !this.inventory.remove(id)) {
      this.audio.playSfx("deny");
      return;
    }
    if (effect.heal) {
      this.player.hearts = Math.min(this.player.maxHearts, this.player.hearts + effect.heal);
      this.floaters.push(this.player.position.x + 8, this.player.position.y - 4,
        `+${effect.heal}`, PALETTE.red);
    }
    if (effect.stamina) this.player.stamina = Math.min(100, this.player.stamina + effect.stamina);
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "heal", 12);
    this.audio.playSfx("secret");
    this.showNotice(`${definition.name} consommé.`, 90);
  }

  private checkCastleRelic(): void {
    if (this.interior !== "castle" || this.flags.has("half_demon_skull")) return;
    if (this.enemies.length === 0 || this.enemies.some((enemy) => enemy.active)) return;
    this.flags.set("half_demon_skull");
    this.inventory.add("half_demon_skull");
    this.player.setDemon(true);
    this.showNotice("CRÂNE DU DEMI-DÉMON OBTENU · F pour changer de forme", 240);
    this.textBox.open(
      "Le dernier garde tombe. Son masque se fend et révèle le Crâne du Demi-Démon. "
      + "Votre sang s'embrase : vitesse, onde de feu et projectiles sont éveillés.",
      "RELIQUE DU CHÂTEAU",
    );
    this.combat.impact(4, 20);
    this.audio.playSfx("secret");
  }

  private checkZoneEdge(): void {
    if (this.interior) return;
    const edge = this.camera.edgeFor(this.player.position);
    if (!edge) return;
    const destination = this.camera.adjacent(edge);
    if (!this.zones.canEnter(destination)) {
      this.player.position = this.camera.blockedPosition(edge, this.player.position);
      return;
    }
    // Le passage de la zone d'arrivée est le même bord physique que celui
    // qu'on vient de franchir : on y borne la dépose.
    const gateway = gatewayFor(destination, oppositeEdge(edge)) ?? undefined;
    this.transition.start(() => {
      this.camera.zone = destination;
      this.player.position = this.camera.enterPosition(edge, this.player.position, gateway);
      this.loadZoneObjects();
      // Filet de sécurité : la carte d'arrivée est générée séparément, rien ne
      // garantit que le point de dépose soit praticable.
      this.player.unstick();
      this.camera.snapTo(this.player.position);
      this.mapScreen.reveal(this.camera.zone);
      this.announceZone();
      this.checkCartography();
    });
  }

  // — Monde ————————————————————————————————————————————————

  /**
   * Adopte une nouvelle carte. Tout ce qui dépend de ses dimensions — le
   * personnage, l'éclairage, les bornes de la caméra — se recale ici, en un
   * seul endroit : c'est en oubliant l'un des trois qu'on obtient une caméra
   * qui regarde sous le plancher.
   */
  private useMap(next: TileMap): void {
    this.map = next;
    this.player.setMap(next);
    this.lighting.bind(next);
    this.camera.setBounds(next.pixelWidth, next.pixelHeight);
  }

  private currentZone() { return this.zones.at(this.camera.zone); }

  private worldState(): WorldState {
    return {
      isNight: this.clock.isNight,
      weather: this.clock.weather,
      rupees: this.player.rupees,
      explored: this.mapScreen.exploredCount,
    };
  }

  private mood(): Mood {
    if (this.boss?.active) return "boss";
    const zone = this.currentZone();
    if (this.interior === "castle") return "dungeon";
    if (zone?.biome === "canal" || zone?.biome === "ruins") return "dungeon";
    if (this.clock.isNight) return "night";
    if (zone?.biome === "forest" || zone?.biome === "peaks" || zone?.biome === "witch") return "forest";
    return "village";
  }

  private showNotice(text: string, frames = 150): void {
    this.notice = text;
    this.noticeFrames = frames;
  }

  private announceZone(): void {
    const zone = this.currentZone();
    if (!zone) return;
    const variant = this.variants.resolve(zone.id, {
      flags: new Set(this.flags.snapshot()), isNight: this.clock.isNight,
    });
    this.hud.announce(zone.name, variant === "default"
      ? (zone.safe ? "Refuge" : `Menace ${"·".repeat(Math.max(1, zone.danger))}`)
      : variant);
  }

  /**
   * La quête de cartographie n'avait aucun déclencheur : on la valide dès que
   * la vallée entière a été foulée.
   */
  private checkCartography(): void {
    if (this.flags.has("side:map") || this.mapScreen.exploredCount < WORLD_ZONES.length) return;
    const message = this.sideActivities.trigger("map_100", this.frame);
    if (!message) return;
    this.showNotice(message, 240);
    this.textBox.open("La dernière région rejoint votre carte. La vallée entière tient sur une page.",
      "CARTOGRAPHIE");
    this.audio.playSfx("secret");
  }

  private refreshScheduleIfNeeded(): void {
    if (this.clock.hour === this.lastScheduleHour) return;
    this.lastScheduleHour = this.clock.hour;
    if (this.interior || this.transition.active) return;
    this.reloadNpcs();
    // Le peuplement se renouvelle au lever du jour.
    if (this.clock.hour === 6 && this.lastPopulatedDay !== this.clock.day) this.populate();
  }

  private loadZoneObjects(): void {
    this.familiar = null;
    this.pickups = [];
    this.projectiles = [];
    const zone = this.currentZone();
    if (zone) {
      this.useMap(new TileMap(createZoneMap(zone), this.tileSet));
    }
    this.interactables = zone
      ? INTERACTABLES.filter((data) => data.zone === zone.id)
        .map((data) => new Interactable(data, this.objectState))
      : [];
    this.lastScheduleHour = this.clock.hour;
    this.reloadNpcs();
    this.populate();
    this.boss = zone?.id === "boss_arena" && this.flags.has("mechanism_repaired")
      && !this.flags.has("boss_defeated") ? new MotherTreeBoss(this.player) : null;
  }

  /** (Re)peuple la zone courante en créatures. */
  private populate(): void {
    const zone = this.currentZone();
    if (!zone || this.interior) return;
    this.lastPopulatedDay = this.clock.day;
    const spawns: readonly EnemySpawn[] = populateZone({
      zone, map: this.map, day: this.clock.day,
      playerX: this.player.position.x, playerY: this.player.position.y,
      night: this.clock.isNight,
      peaceful: zone.safe && !this.flags.has("village_alarm"),
    });
    this.enemies = spawns.map((spawn) => new Enemy(spawn, this.player, this.map));
  }

  /**
   * Reconstruit la population de PNJ de la zone pour l'heure courante, en
   * préservant l'état des PNJ déjà présents (un garde en colère le reste).
   */
  private reloadNpcs(): void {
    const zone = this.currentZone();
    if (!zone) {
      this.npcs = [];
      return;
    }
    const previous = new Map(this.npcs.map((npc) => [npc.data.id, npc]));
    this.npcs = NPCS.filter((npc) => npc.id !== "maelis" && npc.schedule.some((entry) =>
      entry.zone === zone.id && this.clock.hour >= entry.start && this.clock.hour < entry.end))
      .map((data) => previous.get(data.id) ?? new Npc(data, this.map, this.clock, this.player));
  }

  private enterInterior(kind: InteriorKind): void {
    if (this.transition.active || this.interior) return;
    this.exteriorReturnPosition = {
      x: this.player.position.x,
      y: Math.min(ZONE_HEIGHT - 40, this.player.position.y + 24),
    };
    this.transition.start(() => {
      this.interior = kind;
      this.useMap(new TileMap(createInteriorMap(kind), this.tileSet));
      this.player.position = { ...INTERIOR_ENTRY };
      this.player.unstick();
      this.camera.snapTo(this.player.position);
      this.interactables = [];
      this.pickups = [];
      this.projectiles = [];
      this.enemies = kind === "castle" && !this.flags.has("half_demon_skull")
        ? CASTLE_ENEMY_SPAWNS.map((spawn) => new Enemy(spawn, this.player, this.map))
        : [];
      const witch = NPCS.find((npc) => npc.id === "maelis");
      this.npcs = kind === "tower" && witch
        ? [new Npc(witch, this.map, this.clock, this.player)]
        : [];
      this.familiar = kind === "tower" ? new LanternCat({ x: 300, y: 180 }) : null;
      this.boss = null;
      this.hud.announce(INTERIOR_NAMES[kind]);
      this.showNotice(kind === "cottage"
        ? "Le tapis rouge et le feu rendent la pièce accueillante."
        : kind === "hermitage"
          ? "L'ermitage sent la pierre chaude, le bois et les cartes anciennes."
          : kind === "tower"
            ? "Les fioles tintent. Maëlis et son Chat-Lanterne vous observent."
            : this.flags.has("half_demon_skull")
              ? "Le château vaincu résonne encore de votre ancienne bataille."
              : "Les Gardes de Cendre ferment les rangs devant le trône.", 150);
    });
  }

  private leaveInterior(): void {
    if (this.transition.active || !this.interior) return;
    this.transition.start(() => {
      this.interior = null;
      this.loadZoneObjects();
      this.player.position = { ...this.exteriorReturnPosition };
      this.player.unstick();
      this.camera.snapTo(this.player.position);
      this.announceZone();
      this.familiar = null;
    });
  }

  private currentSceneId(): string {
    return this.interior ? `interior:${this.interior}` : (this.currentZone()?.id ?? "unknown");
  }

  private igniteAround(worldX: number, worldY: number): void {
    const centerX = Math.floor(worldX / TILE_SIZE);
    const centerY = Math.floor(worldY / TILE_SIZE);
    const scene = this.currentSceneId();
    for (let y = centerY - 1; y <= centerY + 1; y += 1) {
      for (let x = centerX - 1; x <= centerX + 1; x += 1) {
        if (this.map.isBurnable(x, y)) this.burning.ignite(scene, x, y);
      }
    }
  }

  // — Mort et sauvegarde ————————————————————————————————————

  private respawn(): void {
    const point = this.death.respawnPoint;
    this.player.rupees = rupeesAfterDeath(this.player.rupees);
    this.player.hearts = this.player.maxHearts;
    this.player.setDemon(false);
    this.player.clearImpact();
    this.interior = null;
    this.camera.zone = { ...point.zone };
    this.player.position = { x: point.x, y: point.y };
    this.projectiles = [];
    this.pickups = [];
    this.boss = null;
    this.endingPending = false;
    this.loadZoneObjects();
    this.player.unstick();
    this.camera.snapTo(this.player.position);
    this.mapScreen.reveal(this.camera.zone);
    this.death.resolve();
    this.particles.clear();
    this.floaters.clear();
    this.announceZone();
    this.showNotice("Le puits vous recrache, trempée et vivante. Quelques rubis manquent.", 200);
    this.audio.playSfx("secret");
  }

  private reloadFromSave(): void {
    const saved = this.saveLoad.load(0);
    if (!saved) {
      this.respawn();
      return;
    }
    this.restoreSave(saved);
    this.interior = null;
    this.projectiles = [];
    this.pickups = [];
    this.boss = null;
    this.endingPending = false;
    this.player.setDemon(false);
    this.player.clearImpact();
    this.loadZoneObjects();
    this.player.unstick();
    this.camera.snapTo(this.player.position);
    this.death.resolve();
    this.particles.clear();
    this.floaters.clear();
    this.announceZone();
    this.showNotice("Sauvegarde rechargée.", 150);
  }

  private createSave(): SaveData {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      frame: this.frame,
      player: {
        x: this.player.position.x, y: this.player.position.y,
        hearts: this.player.hearts, rupees: this.player.rupees,
      },
      zone: { ...this.camera.zone },
      flags: this.flags.snapshot(),
      inventory: this.inventory.snapshot(),
      quests: this.quests.snapshot(),
      explored: this.mapScreen.snapshot(),
      objects: this.objectState.entries(),
      clock: this.clock.snapshot(),
      checkpoint: this.death.snapshot(),
      purchases: this.shop.snapshot(),
    };
  }

  private startNewGame(): void {
    this.quests.refresh();
    this.inventory.add("bitter_root", 2);
    this.inventory.add("well_water");
    this.inventory.add("apple", 2);
    this.mapScreen.reveal(this.camera.zone);
  }

  private restoreSave(data: SaveData): void {
    this.frame = data.frame;
    this.player.position = { x: data.player.x, y: data.player.y };
    this.player.hearts = data.player.hearts;
    this.player.rupees = data.player.rupees;
    this.camera.zone = { ...data.zone };
    this.flags.restore(data.flags);
    this.inventory.restore(data.inventory);
    this.quests.restore(data.quests);
    this.mapScreen.restore(data.explored);
    this.objectState.restore(data.objects);
    this.clock.restore(data.clock);
    this.death.restore(data.checkpoint);
    this.shop.restore(data.purchases ?? []);
    this.progression.apply(this.player);
    this.quests.refresh();
  }

  // — Rendu ————————————————————————————————————————————————

  private render(): void {
    const { ctx } = this.renderer;
    if (this.title.active) {
      this.title.draw(this.renderer);
      return;
    }

    this.renderer.clear(PALETTE.ink);
    const shake = this.combat.shakeOffset(this.frame);
    ctx.save();
    ctx.translate(this.camera.offsetX + shake.x, this.camera.offsetY + shake.y);

    this.map.drawBase(ctx, this.camera, this.frame);
    this.drawSortedEntities(ctx);
    this.map.drawOver(ctx, this.camera, this.frame);
    this.burning.draw(ctx, this.currentSceneId(), this.frame);
    for (const projectile of this.projectiles) projectile.draw(ctx, this.frame);
    this.particles.draw(ctx);
    this.floaters.draw(ctx);
    ctx.restore();

    // La nappe du canal est un voile plein cadre : la dessiner sous la
    // translation de caméra la faisait glisser hors de l'écran.
    if (this.currentZone()?.id === "canal_entry" && !this.interior) this.dungeon.drawWater(ctx);
    this.applyLighting();
    this.weather.draw(ctx, this.camera, this.clock.weather,
      this.interior ? undefined : this.currentZone()?.biome, this.clock.isNight);
    drawVignette(ctx, this.interior ? 0.55 : 0.42);

    this.drawInterface();
  }

  /**
   * Rendu trié par profondeur : ce qui est plus bas passe devant. Sans cela,
   * le personnage se dessinait toujours par-dessus les buissons qu'il était
   * censé contourner.
   */
  private drawSortedEntities(ctx: CanvasRenderingContext2D): void {
    const drawables: { readonly entity: { draw(ctx: CanvasRenderingContext2D): void }; readonly y: number }[] = [];
    for (const object of this.interactables) {
      if (!this.camera.isVisible(object.position.x, object.position.y, 16, 16)) continue;
      drawables.push({ entity: object, y: object.position.y + 15 });
    }
    for (const npc of this.npcs) drawables.push({ entity: npc, y: npc.position.y + 16 });
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      drawables.push({ entity: enemy, y: enemy.position.y + 16 });
    }
    for (const pickup of this.pickups) {
      drawables.push({ entity: { draw: (c) => pickup.draw(c, this.frame) }, y: pickup.position.y });
    }
    if (this.familiar) drawables.push({ entity: this.familiar, y: this.familiar.position.y + 16 });
    if (this.boss?.active) drawables.push({ entity: this.boss, y: this.boss.position.y + 74 });
    drawables.push({ entity: this.player, y: this.player.position.y + 16 });

    drawables.sort((a, b) => a.y - b.y);
    for (const drawable of drawables) drawable.entity.draw(ctx);
  }

  private applyLighting(): void {
    const lights: Light[] = [];
    const zone = this.currentZone();
    // Lanterne du personnage : plus large en forme démon, indispensable dans
    // la forêt dense et sous terre.
    const carriesLantern = this.flags.has("lantern") || this.interior !== null;
    if (carriesLantern || this.clock.isNight || this.player.isDemon) {
      lights.push({
        x: this.player.position.x + 8, y: this.player.position.y + 8,
        radius: this.player.isDemon ? 108 : carriesLantern ? 96 : 70,
        color: this.player.isDemon ? "#ff9a52" : "#ffe3a8",
      });
    }
    for (const projectile of this.projectiles) {
      lights.push({
        x: projectile.position.x, y: projectile.position.y,
        radius: 52, color: projectile.style.glow,
      });
    }
    if (this.familiar) {
      lights.push({ x: this.familiar.position.x + 8, y: this.familiar.position.y + 8,
        radius: 90, color: "#ffd479" });
    }
    if (this.boss?.active && this.boss.isExposed) {
      lights.push({ x: this.boss.position.x + 32, y: this.boss.position.y + 40,
        radius: 120, color: "#ffe07a" });
    }

    const denseForest = zone?.id === "lisiere_carrefour" && !this.flags.has("lantern");
    this.lighting.draw(this.renderer, this.camera, lights, {
      minuteOfDay: this.clock.minuteOfDay,
      weather: this.clock.weather,
      biome: this.interior ? undefined : zone?.biome,
      interior: this.interior !== null,
      gloom: denseForest ? 0.45 : zone?.biome === "forest" ? 0.12 : 0,
    });
  }

  private drawInterface(): void {
    const { ctx } = this.renderer;
    const zone = this.currentZone();
    const interiorName = this.interior ? INTERIOR_NAMES[this.interior] : null;
    this.hud.draw(this.renderer, this.player, this.clock,
      interiorName ?? zone?.name ?? "INCONNU",
      this.quests.activeObjective()?.hint);
    if (!this.interior && !this.menu.active) {
      this.mapScreen.drawMini(ctx, this.camera.zone, VIEW_WIDTH - 62, VIEW_HEIGHT - 58);
    }
    if (this.boss?.active) this.drawBossBar();

    if (this.interior && nearInteriorExit(this.player.position) && !this.textBox.active) {
      const label = "X   SORTIR";
      ctx.fillStyle = "rgba(10,8,16,0.72)";
      ctx.fillRect(VIEW_WIDTH / 2 - 34, VIEW_HEIGHT - 40, 68, 14);
      drawText(ctx, label, VIEW_WIDTH / 2, VIEW_HEIGHT - 39, { color: PALETTE.cream, align: "center" });
    }
    if (this.noticeFrames > 0) this.drawNotice();

    this.shop.draw(this.renderer, this.player);
    this.textBox.draw(this.renderer);
    this.menu.draw(this.renderer, this.inventory, this.mapScreen, this.quests, this.camera.zone);
    this.fishing.draw(this.renderer);
    this.transition.draw(ctx);
    this.death.draw(this.renderer);
  }

  private drawNotice(): void {
    const { ctx } = this.renderer;
    const lines = paginateText(this.notice, 52, 2)[0] ?? [];
    const height = lines.length > 1 ? 30 : 18;
    const top = VIEW_HEIGHT - height - 8;
    // Fondu de sortie : l'encart ne disparaît pas d'un coup.
    ctx.save();
    ctx.globalAlpha = Math.min(1, this.noticeFrames / 24);
    ctx.fillStyle = "rgba(10,12,20,0.82)";
    ctx.fillRect(10, top, VIEW_WIDTH - 20, height);
    ctx.fillStyle = PALETTE.sandLight;
    ctx.fillRect(10, top, 2, height);
    lines.forEach((line, index) => {
      drawText(ctx, line, 18, top + 4 + index * 12, { color: PALETTE.cream });
    });
    ctx.restore();
  }

  private drawBossBar(): void {
    const { ctx } = this.renderer;
    const boss = this.boss!;
    const width = 200;
    const x = (VIEW_WIDTH - width) / 2;
    ctx.save();
    drawText(ctx, "L'ARBRE-MÈRE", VIEW_WIDTH / 2, 24, {
      color: PALETTE.leafLight, align: "center", outline: "rgba(10,8,16,0.9)", shadow: null,
    });
    ctx.fillStyle = "rgba(10,8,16,0.8)";
    ctx.fillRect(x - 2, 38, width + 4, 8);
    ctx.fillStyle = PALETTE.pineDark;
    ctx.fillRect(x, 40, width, 4);
    ctx.fillStyle = boss.isExposed ? PALETTE.yellow : PALETTE.leaf;
    ctx.fillRect(x, 40, Math.round(width * boss.healthRatio), 4);
    if (boss.isExposed) {
      drawText(ctx, "ÉCORCE OUVERTE", VIEW_WIDTH / 2, 48, {
        color: PALETTE.yellow, align: "center",
      });
    }
    ctx.restore();
  }
}

function describeSave(save: SaveData): string {
  const zone = WORLD_ZONES.find((entry) => entry.x === save.zone.x && entry.y === save.zone.y);
  return `Jour ${save.clock.day} · ${zone?.name ?? "quelque part"}`;
}

/** Stockage de repli hors navigateur, pour les tests et l'outil de capture. */
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}
