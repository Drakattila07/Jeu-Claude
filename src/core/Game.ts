import { PALETTE } from "../data/palette";
import { Input } from "./Input";
import {
  Renderer, VIEW_HEIGHT, VIEW_WIDTH, ZONE_HEIGHT, ZONE_WIDTH, TILE_SIZE,
} from "./Renderer";
import { TileMap } from "../world/TileMap";
import { TileSet, TILE } from "../world/TileSet";
import { Player } from "../entities/Player";
import type { Rect, Vec2 } from "../entities/Entity";
import { Camera, type Edge } from "./Camera";
import { Transition } from "../ui/Transition";
import { ZoneRegistry } from "../world/Zone";
import { INTERACTABLES } from "../data/interactables";
import { WORLD_ZONES, isOpenSea } from "../data/world";
import { Interactable, ZoneObjectState } from "../entities/Interactable";
import { Combat, overlaps } from "../systems/Combat";
import { CASTLE_ENEMY_SPAWNS, nightGuardianFor, type EnemySpawn } from "../data/enemies";
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
import { residentOf } from "../data/npcs/residents";
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
import { waypointFor, type Waypoint } from "../systems/Waypoint";
import { hash2, isNavalZone } from "../world/WorldGen";
import { TitleScreen } from "../ui/TitleScreen";
import { ChoiceBox } from "../ui/ChoiceBox";
import { ITEMS, itemEffect, type ItemId } from "../data/items/core";
import {
  HOUSE_LABELS, INTERIOR_ENTRY, INTERIOR_NAMES, createHouseMap, createInteriorMap,
  houseTradeFor, nearInteriorExit, type InteriorKind,
} from "../world/Interiors";
import { BurningWorld } from "../world/BurningWorld";
import { Fortress } from "../systems/Fortress";
import {
  createRoomMap, nearFortressExit, roomEntry, ROOM_TILES_X, ROOM_TILES_Y,
} from "../world/Dungeons";
import { Dragon } from "../entities/Dragon";
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
  private readonly choices = new ChoiceBox();
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
  /** Puits devant lequel on se tient, pour y revenir après le menu. */
  private wellPosition: Vec2 | null = null;
  /** Graine du logis visité : chaque porte du monde rend toujours la même pièce. */
  private houseSeed: number | null = null;
  private exteriorReturnPosition = { x: 240, y: 300 };
  private readonly burning = new BurningWorld();
  private familiar: LanternCat | null = null;
  private readonly fortress = new Fortress();
  private dragon: Dragon | null = null;
  private lastScheduleHour = -1;
  private lastPopulatedDay = -1;
  private title: TitleScreen;
  private pendingSave: SaveData | null = null;
  private faults = 0;

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
    this.fortress.leave();
    this.clock.setTime(hour);
    this.camera.zone = { x: zoneX, y: zoneY };
    // Une région de haute mer ne se visite qu'à la barque : l'outil de
    // vérification doit s'y présenter dans le bon mode, sinon il conclut à
    // tort que la carte est bouchée.
    const zone = this.zones.at(this.camera.zone);
    this.player.setSailing(zone !== null && isNavalZone(zone));
    this.player.position = { x: ZONE_WIDTH / 2, y: ZONE_HEIGHT / 2 };
    this.loadZoneObjects();
    this.player.unstick();
    this.camera.snapTo(this.player.position);
    this.mapScreen.reveal(this.camera.zone);
    // Le cartouche annonce la région où l'on vient d'atterrir : sans cela,
    // les captures de contrôle affichaient le nom de la région précédente.
    this.announceZone();
    this.noticeFrames = 0;
  }

  /** Pose le personnage à un point précis de la région : vérification ciblée. */
  debugPlace(x: number, y: number): void {
    this.player.position = { x, y };
    this.player.unstick();
    this.camera.snapTo(this.player.position);
  }

  /** Pose un drapeau : sert à rejouer un état de partie avancé. */
  debugSetFlag(flag: string): void {
    this.flags.set(flag);
    this.quests.refresh();
    this.quests.syncFlags(this.frame);
  }

  /** Portes du décor de la région courante : outils de vérification. */
  debugDoors(): readonly { readonly x: number; readonly y: number }[] {
    const doors: { x: number; y: number }[] = [];
    for (let y = 0; y < this.map.height; y += 1) {
      for (let x = 0; x < this.map.width; x += 1) {
        if (this.map.tileAt("terrain", x, y) === TILE.door) doors.push({ x, y });
      }
    }
    return doors;
  }

  /** Instantané lisible depuis l'extérieur : outils de vérification. */
  debugState(): {
    zone: { x: number; y: number }; x: number; y: number;
    hearts: number; rupees: number; enemies: number; inSolid: boolean;
    interior: string | null; busy: boolean; hour: number; day: number;
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
      inSolid: this.map.solidFor(tileX, tileY, this.player.sailing),
      interior: this.interior ?? (this.fortress.active ? this.fortress.name : null),
      busy: this.death.active || this.textBox.active || this.menu.active
        || this.shop.active || this.choices.active || this.transition.active
        || this.combat.frozen,
      hour: this.clock.hour,
      day: this.clock.day,
    };
  }

  /** État de l'Arbre-Mère : un combat ne se juge qu'en le regardant tourner. */
  debugBoss(): { hearts: number; max: number; phase: number; exposed: boolean;
    burning: boolean; burnFrames: number; seeds: number; alive: boolean } | null {
    const boss = this.boss;
    if (!boss) return null;
    return {
      hearts: boss.hearts, max: boss.maxHearts, phase: boss.phase,
      exposed: boss.isExposed, burning: boss.isBurning, burnFrames: boss.burnFrames,
      seeds: boss.seeds.filter((seed) => seed.active).length, alive: boss.active,
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
    // Une image fautive ne doit pas emporter la partie. Sans ce filet, une
    // exception dans le rendu empêchait la demande d'image suivante : la
    // boucle mourait et l'écran restait figé sur une frame incomplète, sans
    // rien dire à personne.
    try {
      for (let index = 0; index < consumed.steps; index += 1) this.update();
      this.render();
    } catch (error) {
      this.reportFault(error);
    }
    requestAnimationFrame(this.loop);
  };

  /** Signale une image fautive, une seule fois, et poursuit la partie. */
  private reportFault(error: unknown): void {
    this.faults += 1;
    if (this.faults > 1) return;
    const message = error instanceof Error ? error.message : String(error);
    console.error("Les Racines Creuses — image fautive :", error);
    this.showNotice(`Incident interne : ${message}`, 600);
  }

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
    if (this.choices.active) {
      const picked = this.choices.update(this.input);
      if (picked) this.resolveWellChoice(picked);
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
    this.burnOnLava();
    this.familiar?.update();
    this.updateNpcs();
    this.updateEnemies();
    this.updateBoss();
    this.updateProjectiles();
    this.updatePickups();

    if (this.input.wasPressed("A")) this.interact();
    this.updateAttacks();
    this.checkCastleRelic();
    if (this.fortress.active) this.checkRoomCleared();
    this.updateDragon();
    this.checkZoneEdge();
  }

  /**
   * La lave brûle. Elle ne bloque pas — on peut la traverser en courant — mais
   * chaque instant passé dedans coûte : c'est le terrain qui devient un
   * adversaire, sans qu'il faille y poser un ennemi.
   */
  private burnOnLava(): void {
    const harm = this.map.harmAt(
      Math.floor((this.player.position.x + 8) / TILE_SIZE),
      Math.floor((this.player.position.y + 12) / TILE_SIZE));
    if (harm <= 0) return;
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 12, "ember", 2);
    if (this.player.takeDamage(harm, { x: 0, y: -1 })) this.onPlayerHurt(harm);
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
    if (boss.isBurning && this.frame % 5 === 0) {
      this.particles.emit(boss.position.x + 16 + (this.frame % 3) * 16,
        boss.position.y + 20 + (this.frame % 5) * 8, "ember", 2);
    }
    // Le feu peut l'achever entre deux coups d'épée : la mort ne se constate
    // plus seulement au moment de l'impact.
    if (!boss.active) { this.onBossDefeated(); return; }
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
    this.resolveDragonHit(sword, spinning);
    const damage = this.player.attackDamage * (spinning ? 2 : 1);

    if (this.boss?.active) {
      const inWave = this.player.isDemon
        && Math.hypot(this.boss.position.x + 32 - this.player.position.x,
          this.boss.position.y + 40 - this.player.position.y) <= this.player.fireRadius + 24;
      if ((overlaps(sword, this.boss.bounds) || inWave) && this.combat.confirmHit("mother_tree", true)) {
        const wasExposed = this.boss.isExposed;
        // L'onde de feu de la forme démoniaque embrase le bois : elle porte,
        // écorce ouverte ou non.
        if (inWave) this.igniteBoss();
        const dealt = damage + (this.boss.isBurning ? 1 : 0);
        const defeated = this.boss.hit(damage);
        this.audio.playSfx(wasExposed ? "hit" : "deny");
        if (wasExposed) {
          this.floaters.damage(this.boss.position.x + 32, this.boss.position.y + 10, dealt, true);
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
    // Un gardien nocturne n'est pas une créature de plus : sa chute est un
    // moment de l'histoire, et c'est elle qui débloque la suite.
    const zoneId = this.currentZone()?.id ?? "";
    const guardian = nightGuardianFor(zoneId, this.clock.hour, (flag) => this.flags.has(flag));
    if (guardian && enemy.spawn.type === guardian.type) {
      const message = this.campaign.trigger(guardian.trigger, this.frame);
      if (message) {
        this.textBox.open(message, "LA CLAIRIÈRE");
        this.combat.impact(4, 22);
        this.audio.playSfx("secret");
      }
    }
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

  /**
   * Embrase l'Arbre-Mère.
   *
   * C'est le seul dégât qui traverse l'écorce fermée : le bois brûle qu'on
   * regarde ou non. La forme démoniaque cesse ainsi d'être un simple bonus de
   * vitesse pendant ce combat — elle en devient la réponse.
   */
  private igniteBoss(): void {
    const boss = this.boss;
    if (!boss?.active) return;
    const first = boss.ignite();
    this.particles.emit(boss.position.x + 32, boss.position.y + 30, "ember", first ? 24 : 8);
    if (!first) return;
    this.audio.playSfx("secret");
    this.combat.impact(3, 12);
    this.showNotice("L'Arbre-Mère prend feu. Le bois sec ne se protège plus.", 220);
  }

  private onBossDefeated(): void {
    if (this.flags.has("boss_defeated")) return;
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
          if (projectile.kind === "fireball" || projectile.kind === "ember") this.igniteBoss();
          const defeated = this.boss.hit(projectile.damage);
          this.particles.emit(projectile.position.x, projectile.position.y, "ember", 14);
          projectile.destroy();
          if (wasExposed) {
            this.floaters.damage(this.boss.position.x + 32, this.boss.position.y + 10,
              projectile.damage);
          }
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

  /**
   * Embarquement et débarquement.
   *
   * On monte à bord depuis la terre quand de l'eau navigable borde le pas ;
   * on accoste depuis la barque quand une terre praticable la borde. Les deux
   * gestes passent par la même touche que le reste : rien de nouveau à
   * apprendre.
   */
  private tryBoarding(): boolean {
    if (!this.flags.has("boat")) return false;
    const centre = { x: this.player.position.x + 8, y: this.player.position.y + 10 };
    const tileX = Math.floor(centre.x / TILE_SIZE);
    const tileY = Math.floor(centre.y / TILE_SIZE);
    const around: readonly (readonly [number, number])[] = [
      [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1],
      [2, 0], [-2, 0], [0, 2], [0, -2],
    ];

    if (!this.player.sailing) {
      for (const [dx, dy] of around) {
        if (!this.map.isSailable(tileX + dx, tileY + dy)) continue;
        this.player.setSailing(true);
        this.player.position = {
          x: (tileX + dx) * TILE_SIZE, y: (tileY + dy) * TILE_SIZE - 2,
        };
        this.player.unstick();
        this.particles.emit(centre.x, centre.y, "splash", 12);
        this.audio.playSfx("splash");
        this.showNotice("Vous poussez la barque à l'eau.", 110);
        return true;
      }
      return false;
    }

    for (const [dx, dy] of around) {
      if (this.map.solidFor(tileX + dx, tileY + dy, false)) continue;
      this.player.setSailing(false);
      this.player.position = { x: (tileX + dx) * TILE_SIZE, y: (tileY + dy) * TILE_SIZE };
      this.player.unstick();
      this.particles.emit(centre.x, centre.y, "dust", 8);
      this.showNotice("Vous tirez la barque sur la grève.", 110);
      return true;
    }
    this.showNotice("Aucune terre où accoster ici.", 90);
    this.audio.playSfx("deny");
    return true;
  }

  /** Cases voisines du personnage, du plus proche au plus éloigné. */
  private tilesAround(): readonly (readonly [number, number])[] {
    const tileX = Math.floor((this.player.position.x + 8) / TILE_SIZE);
    const tileY = Math.floor((this.player.position.y + 10) / TILE_SIZE);
    return [
      [0, -1], [0, 0], [-1, -1], [1, -1], [-1, 0], [1, 0], [0, -2], [0, 1],
    ].map(([dx, dy]) => [tileX + dx!, tileY + dy!] as const);
  }

  /**
   * Ouvre une porte du décor.
   *
   * Seules quatre portes scénarisées s'ouvraient ; toutes les autres maisons
   * du monde étaient des façades peintes. Chaque tuile `door` mène désormais
   * quelque part, et la graine du logis vient de sa position : la même porte
   * rend toujours la même pièce.
   */
  private tryDoorTile(): boolean {
    if (this.indoors || this.player.sailing) return false;
    for (const [tileX, tileY] of this.tilesAround()) {
      if (this.map.tileAt("terrain", tileX, tileY) !== TILE.door) continue;
      const seed = hash2(tileX, tileY, hash2(this.camera.zone.x, this.camera.zone.y, 0x4d0));
      this.enterHouse(seed);
      return true;
    }
    return false;
  }

  /**
   * Dormir. Un lit rend les forces et fait passer la nuit — de quoi attendre
   * le jour quand une condition l'exige, au lieu de tourner en rond.
   */
  private trySleeping(): boolean {
    if (!this.indoors) return false;
    const bed = this.tilesAround()
      .some(([tileX, tileY]) => this.map.tileAt("terrain", tileX, tileY) === TILE.bed);
    if (!bed) return false;
    this.clock.sleepUntilMorning();
    this.player.hearts = this.player.maxHearts;
    this.player.stamina = 100;
    this.lastScheduleHour = -1;
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 4, "heal", 12);
    this.audio.playSfx("secret");
    this.textBox.open(
      `Vous dormez d'un trait. Au matin du jour ${this.clock.day}, la vallée sent le foin mouillé.`,
      "REPOS");
    return true;
  }

  private enterHouse(seed: number): void {
    if (this.transition.active || this.indoors) return;
    this.exteriorReturnPosition = {
      x: this.player.position.x,
      y: Math.min(ZONE_HEIGHT - 40, this.player.position.y + 24),
    };
    this.transition.start(() => {
      this.interior = "cottage";
      this.houseSeed = seed;
      this.fortress.leave();
      this.dragon = null;
      this.player.setSailing(false);
      this.useMap(new TileMap(createHouseMap(seed), this.tileSet));
      this.player.position = { ...INTERIOR_ENTRY };
      this.player.unstick();
      this.camera.snapTo(this.player.position);
      this.interactables = [];
      // L'occupant : une maison vide est plus froide qu'une porte close.
      this.npcs = [new Npc(residentOf(seed, "house"), this.map, this.clock, this.player)];
      this.enemies = [];
      this.pickups = [];
      this.projectiles = [];
      this.familiar = null;
      this.boss = null;
      this.hud.announce(HOUSE_LABELS[houseTradeFor(seed)]);
      this.showNotice(houseTradeFor(seed) === "auberge"
        ? "Un lit libre au fond : X pour dormir jusqu'au matin."
        : "Personne. Le feu couve encore dans l'âtre.", 150);
    });
  }

  private interact(): void {
    if (this.fortress.active) {
      this.interactInFortress();
      return;
    }
    if (this.interior && nearInteriorExit(this.player.position)) {
      this.leaveInterior();
      return;
    }
    if (this.familiar && this.familiar.distanceTo(this.player.position) <= 34) {
      this.blessFromFamiliar();
      return;
    }

    const nearest = this.player.sailing ? undefined : this.interactables
      .filter((object) => object.isPresent && object.distanceTo(this.player.position) <= REACH)
      .sort((a, b) => a.distanceTo(this.player.position) - b.distanceTo(this.player.position))[0];
    const nearestNpc = this.player.sailing ? undefined : this.npcs
      .filter((npc) => npc.distanceTo(this.player.position) <= REACH)
      .sort((a, b) => a.distanceTo(this.player.position) - b.distanceTo(this.player.position))[0];

    // Rien à portée : la touche ouvre une porte du décor, ou sert à embarquer.
    if (!nearest && !nearestNpc) {
      if (this.trySleeping()) return;
      if (this.tryWellTile()) return;
      if (this.tryDoorTile()) return;
      if (this.tryBoarding()) return;
    }

    if (nearestNpc && (!nearest
      || nearestNpc.distanceTo(this.player.position) < nearest.distanceTo(this.player.position))) {
      this.talkTo(nearestNpc);
      return;
    }
    if (!nearest) return;
    if (nearest.data.kind === "door") {
      if (nearest.data.id === "fortress_gate") this.enterFortress("vertepierre");
      else {
        this.enterInterior(nearest.data.id === "hermitage_door" ? "hermitage"
          : nearest.data.id === "castle_gate" ? "castle"
            : nearest.data.id === "witch_tower_door" ? "tower" : "cottage");
      }
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
          // Les racines ne cèdent qu'à la lame : le dire, plutôt que de
          // répéter qu'elles bloquent le passage.
          ? { message: `${nearest.data.text} Il faudra les trancher.`, changed: false }
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
    const opened = "changed" in result && result.changed;
    if (opened && nearest.data.grants) {
      // Un coffre peut remettre un objet nommé : c'est ce qui permet aux
      // quêtes de collecte d'exister sans déclencheur scénarisé.
      const { item, count } = nearest.data.grants;
      this.inventory.add(item, count);
      this.floaters.reward(nearest.position.x + 8, nearest.position.y - 6,
        `${ITEMS[item].name} ×${count}`);
      this.particles.emit(nearest.position.x + 8, nearest.position.y + 4, "spark", 14);
    } else if (opened && nearest.data.kind === "chest") {
      for (let index = 0; index < 4; index += 1) {
        this.pickups.push(new Pickup(
          { x: nearest.position.x + 8, y: nearest.position.y + 8 }, "rupee", 5, this.frame));
      }
      this.particles.emit(nearest.position.x + 8, nearest.position.y + 4, "spark", 14);
    }
    const message = campaignMessage ?? sideMessage ?? result.message;
    this.showNotice(message, 150);
    // Un puits en eau ouvre directement son menu : sa réplique de fond sec
    // s'intercalait devant, et il fallait la congédier avant de pouvoir
    // seulement choisir d'attendre le soir.
    // Un puits n'a rien à raconter : il a un menu. Sa réplique de fond sec
    // s'intercalait devant, et il fallait la congédier avant de pouvoir
    // seulement choisir d'attendre le soir.
    if (nearest.data.kind !== "well") this.textBox.open(message);
    if (nearest.data.kind === "cauldron" || nearest.data.kind === "valve") {
      this.audio.playSfx("splash");
      this.particles.emit(nearest.position.x + 8, nearest.position.y + 8,
        nearest.data.kind === "cauldron" ? "smoke" : "bubble", 10);
    }
    if (sideMessage) this.audio.playSfx("secret");
    if ("result" in result && result.result === "eternal_lantern") this.flags.set("lantern");
    this.events.publish({ type: "interact", id: nearest.data.id, frame: this.frame });

    if (nearest.data.kind === "well") {
      this.openWellMenu({ x: nearest.position.x, y: nearest.position.y });
    }
  }

  /**
   * Puits du décor.
   *
   * Seul le puits *déclaré* de la Place du Puits répondait ; ceux des hameaux
   * n'étaient que des tuiles muettes. Chaque margelle du monde ouvre le même
   * menu — c'est à cela que sert un puits, et cela évite d'en écrire deux.
   */
  private tryWellTile(): boolean {
    if (this.indoors || this.player.sailing) return false;
    for (const [tileX, tileY] of this.tilesAround()) {
      if (this.map.tileAt("terrain", tileX, tileY) !== TILE.well) continue;
      this.openWellMenu({ x: tileX * TILE_SIZE, y: tileY * TILE_SIZE });
      return true;
    }
    return false;
  }

  /**
   * Le puits.
   *
   * Il faisait tout à la fois — soigner, sauvegarder, poser le point de
   * renaissance — sans jamais demander, et n'offrait rien d'autre. Il propose
   * désormais chaque geste séparément, et surtout d'attendre le moment de la
   * journée qu'on cherche : plusieurs secrets n'acceptent que la nuit, et les
   * guetter en tournant en rond était une punition.
   */
  private openWellMenu(at: Vec2): void {
    this.wellPosition = at;
    const full = this.player.hearts >= this.player.maxHearts && this.player.stamina >= 100;
    // Un puits tari ne désaltère pas — mais on peut toujours s'y asseoir et
    // laisser tourner les heures. Réserver tout le menu à la source rouverte
    // privait le joueur du seul moyen d'atteindre une heure précise, et c'est
    // précisément ce dont l'acte II a besoin.
    const dry = !this.flags.has("source_open");
    this.choices.open(dry ? "LE PUITS TARI" : "LE PUITS", [
      {
        id: "rest",
        label: "Boire et se reposer",
        note: dry ? "à sec" : full ? "déjà d'aplomb" : "soigne tout",
        disabled: dry || full,
      },
      { id: "save", label: "Graver son passage", note: "sauvegarde" },
      { id: "wait:matin", label: "Attendre le matin", note: "09:00" },
      { id: "wait:midi", label: "Attendre midi", note: "13:00" },
      { id: "wait:soir", label: "Attendre le soir", note: "19:00" },
      { id: "wait:nuit", label: "Attendre la nuit", note: "22:00" },
    ]);
  }

  private resolveWellChoice(choice: string): void {
    const at = this.wellPosition;
    if (choice === "cancel" || !at) return;

    if (choice === "rest") {
      this.player.hearts = this.player.maxHearts;
      this.player.stamina = 100;
      this.particles.emit(at.x + 8, at.y + 4, "heal", 18);
      this.audio.playSfx("secret");
      this.showNotice("L'eau est glacée. Vous repartez d'aplomb.", 160);
      return;
    }
    if (choice === "save") {
      this.death.setCheckpoint(this.camera.zone, at.x - 8, at.y + 34);
      this.saveLoad.save(0, this.createSave());
      this.particles.emit(at.x + 8, at.y + 4, "spark", 14);
      this.audio.playSfx("secret");
      this.showNotice("Partie sauvegardée. Vous renaîtrez ici.", 160);
      return;
    }
    if (!choice.startsWith("wait:")) return;

    const moment = choice.slice(5) as "matin" | "midi" | "soir" | "nuit";
    const before = this.clock.day;
    this.clock.waitUntil(moment);
    this.lastScheduleHour = -1;
    this.reloadNpcs();
    if (this.clock.day !== before) this.populate();
    this.particles.emit(at.x + 8, at.y + 4, "bubble", 12);
    this.audio.playSfx("splash");
    this.showNotice(this.clock.day !== before
      ? `Vous laissez filer la nuit. ${capitalise(moment)} du jour ${this.clock.day}.`
      : `Vous laissez filer les heures. ${capitalise(moment)}, il est ${this.clock.hour}h.`, 190);
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
    if (this.fortress.active) { this.checkRoomEdge(); return; }
    if (this.interior) return;
    const edge = this.camera.edgeFor(this.player.position);
    if (!edge) return;
    const destination = this.camera.adjacent(edge);
    const target = this.zones.at(destination);
    if (!target) {
      this.player.position = this.camera.blockedPosition(edge, this.player.position);
      return;
    }
    // Le large ne s'ouvre qu'avec la Carte des Courants : sans elle, on ne
    // trouve pas la passe et le ressac vous rend à la côte.
    if (isOpenSea(target) && !this.flags.has("sea_chart")) {
      this.player.position = this.camera.blockedPosition(edge, this.player.position);
      this.showNotice("Les courants vous repoussent. Il faudrait la Carte des Courants.", 170);
      this.audio.playSfx("deny");
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

  /** Région à rejoindre pour avancer, résolue depuis l'objectif courant. */
  private waypoint(): Waypoint | null {
    return waypointFor(this.quests.activeObjective());
  }

  /** Sous un toit : maison, ermitage ou salle de forteresse. */
  private get indoors(): boolean { return this.interior !== null || this.fortress.active; }

  // — Le dragon ————————————————————————————————————————————

  /**
   * Le dragon ne se combat pas comme le reste : tant qu'il vole, l'épée passe
   * sous lui. On encaisse ses passes, et l'on frappe pendant qu'il se pose.
   */
  private updateDragon(): void {
    const dragon = this.dragon;
    if (!dragon?.active) return;
    dragon.update();

    const playerBox = {
      x: this.player.position.x + this.player.hitbox.x,
      y: this.player.position.y + this.player.hitbox.y,
      width: this.player.hitbox.width,
      height: this.player.hitbox.height,
    };
    for (const flame of dragon.flameBounds()) {
      if (!overlaps(flame, playerBox)) continue;
      const direction = {
        x: this.player.position.x - (flame.x + 7),
        y: this.player.position.y - (flame.y + 7),
      };
      const length = Math.max(1, Math.hypot(direction.x, direction.y));
      if (this.player.takeDamage(2, { x: direction.x / length, y: direction.y / length })) {
        this.onPlayerHurt(2);
      }
    }
    // En piqué, la masse elle-même écrase.
    if (dragon.state === "dive" && dragon.altitude < 14 && overlaps(dragon.bounds, playerBox)) {
      const direction = {
        x: this.player.position.x - (dragon.position.x + 40),
        y: this.player.position.y - (dragon.position.y + 40),
      };
      const length = Math.max(1, Math.hypot(direction.x, direction.y));
      if (this.player.takeDamage(2, { x: direction.x / length, y: direction.y / length })) {
        this.onPlayerHurt(2);
      }
    }
    if (dragon.state === "breathe" && this.frame % 6 === 0) {
      this.particles.emit(dragon.position.x + 40, dragon.position.y + 6, "ember", 3);
    }
  }

  private resolveDragonHit(sword: Rect, spinning: boolean): void {
    const dragon = this.dragon;
    if (!dragon?.active || !overlaps(sword, dragon.bounds)) return;
    if (!this.combat.confirmHit("dragon", true)) return;
    const outcome = dragon.hit(this.player.attackDamage * (spinning ? 2 : 1));
    if (outcome === "guarded") {
      this.audio.playSfx("deny");
      this.floaters.push(dragon.position.x + 40, dragon.position.y + 10, "hors d'atteinte",
        PALETTE.stoneLight);
      return;
    }
    this.audio.playSfx("hit");
    this.floaters.damage(dragon.position.x + 40, dragon.position.y + 10,
      this.player.attackDamage * (spinning ? 2 : 1), true);
    this.particles.emit(dragon.position.x + 40, dragon.position.y + 40, "ember", 10);
    if (outcome !== "slain") return;

    this.flags.set("dragon_slain");
    this.inventory.add("dragon_scale");
    this.quests.notify("defeat", "dragon", this.frame);
    this.combat.impact(6, 40);
    this.particles.emit(dragon.position.x + 40, dragon.position.y + 40, "ember", 40);
    this.textBox.open(
      "Le dragon s'abat sur la roche noire. La fumée retombe pour la première "
      + "fois depuis des siècles. Une écaille tiède reste dans votre main.",
      "LA CALDEIRA");
    this.audio.playSfx("secret");
  }

  // — Forteresse ————————————————————————————————————————————

  private enterFortress(id: string): void {
    if (this.transition.active || this.fortress.active) return;
    this.exteriorReturnPosition = {
      x: this.player.position.x,
      y: Math.min(ZONE_HEIGHT - 40, this.player.position.y + 24),
    };
    this.transition.start(() => {
      if (!this.fortress.enter(id)) return;
      this.interior = null;
      this.player.setSailing(false);
      this.loadRoom(null);
      this.hud.announce(this.fortress.name, "Trois portes, trois clés");
    });
  }

  private leaveFortress(): void {
    if (this.transition.active || !this.fortress.active) return;
    this.transition.start(() => {
      this.fortress.leave();
      this.loadZoneObjects();
      this.player.position = { ...this.exteriorReturnPosition };
      this.player.unstick();
      this.camera.snapTo(this.player.position);
      this.announceZone();
    });
  }

  /** Charge la salle courante et son contenu. */
  private loadRoom(from: Edge | null): void {
    const definition = this.fortress.definition;
    const room = this.fortress.room;
    if (!definition || !room) return;
    this.useMap(new TileMap(
      createRoomMap(definition, room, this.fortress.unlockedDoors), this.tileSet));
    this.player.position = { ...roomEntry(from) };
    this.player.unstick();
    this.camera.snapTo(this.player.position);
    this.interactables = [];
    this.npcs = [];
    this.pickups = [];
    this.projectiles = [];
    this.familiar = null;
    this.boss = null;
    this.enemies = this.fortress.spawns().map((spawn) => new Enemy(spawn, this.player, this.map));
    this.particles.clear();
  }

  /** Franchissement d'une porte entre deux salles. */
  private checkRoomEdge(): void {
    const width = ROOM_TILES_X * TILE_SIZE;
    const height = ROOM_TILES_Y * TILE_SIZE;
    const edge: Edge | null = this.player.position.x < -2 ? "west"
      : this.player.position.x > width - 14 ? "east"
        : this.player.position.y < -2 ? "north"
          : this.player.position.y > height - 14 ? "south" : null;
    if (!edge) return;

    const passage = this.fortress.passage(edge);
    if (!passage || passage.locked) {
      this.player.position = this.blockedInRoom(edge, width, height);
      return;
    }
    this.transition.start(() => {
      this.fortress.moveTo(passage.room);
      this.loadRoom(edge);
    });
  }

  private blockedInRoom(edge: Edge, width: number, height: number): Vec2 {
    if (edge === "west") return { x: 2, y: this.player.position.y };
    if (edge === "east") return { x: width - 18, y: this.player.position.y };
    if (edge === "north") return { x: this.player.position.x, y: 2 };
    return { x: this.player.position.x, y: height - 18 };
  }

  /**
   * « Agir » dans une forteresse : sortir par la herse d'entrée, ou ouvrir une
   * porte verrouillée si l'on porte une clé.
   */
  private interactInFortress(): void {
    if (this.fortress.room?.kind === "entrance" && nearFortressExit(this.player.position)) {
      this.leaveFortress();
      return;
    }
    const locked = this.fortress.lockedEdges();
    if (locked.length === 0) return;

    const width = ROOM_TILES_X * TILE_SIZE;
    const height = ROOM_TILES_Y * TILE_SIZE;
    const near = locked.find((edge) => {
      if (edge === "west") return this.player.position.x < 64;
      if (edge === "east") return this.player.position.x > width - 80;
      if (edge === "north") return this.player.position.y < 64;
      return this.player.position.y > height - 80;
    });
    if (!near) return;

    if (!this.inventory.remove("fortress_key")) {
      this.showNotice("La herse est verrouillée. Il faudrait une clé de Vertepierre.", 160);
      this.audio.playSfx("deny");
      return;
    }
    this.fortress.unlock(near);
    this.useMap(new TileMap(
      createRoomMap(this.fortress.definition!, this.fortress.room!, this.fortress.unlockedDoors),
      this.tileSet));
    this.showNotice("La clé tourne. La herse remonte en grinçant.", 150);
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "dust", 12);
    this.audio.playSfx("secret");
    this.combat.impact(2, 10);
  }

  /** Récompenses d'une salle une fois ses gardes abattus. */
  private checkRoomCleared(): void {
    const room = this.fortress.room;
    if (!room || this.fortress.isCleared()) return;
    if (this.enemies.length === 0 || this.enemies.some((enemy) => enemy.active)) return;
    this.fortress.markCleared();

    if (room.dropsKey) {
      this.inventory.add("fortress_key");
      this.floaters.reward(this.player.position.x + 8, this.player.position.y - 8,
        "Clé de Vertepierre");
      this.audio.playSfx("secret");
    }
    if (room.prize === "heart_shard") {
      this.inventory.add("heart_shard");
      this.showNotice("Un éclat de cœur repose dans le coffre.", 170);
    } else if (room.prize === "rupees") {
      for (let index = 0; index < 5; index += 1) {
        this.pickups.push(new Pickup(
          { x: this.player.position.x + 8, y: this.player.position.y }, "rupee", 8, this.frame));
      }
    } else if (room.prize === "sea_chart" && !this.flags.has("sea_chart")) {
      this.inventory.add("sea_chart");
      this.flags.set("sea_chart");
      this.quests.notify("defeat", "green_knight", this.frame);
      this.textBox.open(
        "Le Chevalier tombe à genoux et ne se relève pas. Sur la table de pierre, "
        + "roulée dans un étui de cuir : la Carte des Courants. Le large vous est ouvert.",
        "VERTEPIERRE");
      this.combat.impact(5, 24);
    }
    if (room.kind !== "boss" && room.dropsKey) {
      this.showNotice("Une clé tombe du ceinturon du garde.", 150);
    }
  }

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
    this.dragon = zone?.id === "caldeira" && !this.flags.has("dragon_slain")
      ? new Dragon(this.player) : null;
    this.boss = zone?.id === "boss_arena" && this.flags.has("mechanism_repaired")
      && !this.flags.has("boss_defeated") ? new MotherTreeBoss(this.player) : null;
  }

  /** (Re)peuple la zone courante en créatures. */
  private populate(): void {
    const zone = this.currentZone();
    if (!zone || this.interior) return;
    this.lastPopulatedDay = this.clock.day;
    const guardian = nightGuardianFor(zone.id, this.clock.hour,
      (flag) => this.flags.has(flag));
    const spawns: readonly EnemySpawn[] = populateZone({
      zone, map: this.map, day: this.clock.day,
      playerX: this.player.position.x, playerY: this.player.position.y,
      night: this.clock.isNight,
      peaceful: zone.safe && !this.flags.has("village_alarm"),
    });
    this.enemies = spawns.map((spawn) => new Enemy(spawn, this.player, this.map));
    if (guardian) {
      this.enemies.push(new Enemy({
        id: `guardian:${guardian.zone}`, zone: guardian.zone, type: guardian.type,
        x: guardian.x, y: guardian.y,
      }, this.player, this.map));
      this.showNotice(guardian.announce, 220);
    }
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
      this.houseSeed = null;
      this.fortress.leave();
      this.dragon = null;
      this.player.setSailing(false);
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
      this.houseSeed = null;
      this.loadZoneObjects();
      this.player.position = { ...this.exteriorReturnPosition };
      this.player.unstick();
      this.camera.snapTo(this.player.position);
      this.announceZone();
      this.familiar = null;
    });
  }

  private currentSceneId(): string {
    if (this.fortress.active && this.fortress.room) {
      return `fortress:${this.fortress.definition!.id}:${this.fortress.room.x},${this.fortress.room.y}`;
    }
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
    this.player.setSailing(false);
    this.player.clearImpact();
    this.interior = null;
    this.houseSeed = null;
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
    this.player.setSailing(false);
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
      fortress: this.fortress.snapshot(),
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
    this.fortress.restore(data.fortress);
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
      this.indoors ? undefined : this.currentZone()?.biome, this.clock.isNight);
    drawVignette(ctx, this.indoors ? 0.55 : 0.42);

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
    // Le dragon passe au-dessus de tout quand il vole, et se range dans le
    // tri dès qu'il se pose : c'est ce qui rend son atterrissage lisible.
    if (this.dragon?.active && !this.dragon.isGrounded) {
      drawables.push({ entity: this.dragon, y: Number.MAX_SAFE_INTEGER });
    } else if (this.dragon?.active) {
      drawables.push({ entity: this.dragon, y: this.dragon.position.y + 70 });
    }
    drawables.push({ entity: this.player, y: this.player.position.y + 16 });

    drawables.sort((a, b) => a.y - b.y);
    for (const drawable of drawables) drawable.entity.draw(ctx);
  }

  private applyLighting(): void {
    const lights: Light[] = [];
    const zone = this.currentZone();
    // Lanterne du personnage : plus large en forme démon, indispensable dans
    // la forêt dense et sous terre.
    const carriesLantern = this.flags.has("lantern") || this.indoors;
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
    if (this.dragon?.active) {
      for (const flame of this.dragon.flames) {
        lights.push({ x: flame.x, y: flame.y, radius: 64, color: "#ff7a30" });
      }
      if (this.dragon.state === "breathe") {
        lights.push({
          x: this.dragon.position.x + 40, y: this.dragon.position.y + 6,
          radius: 76, color: "#ff9040",
        });
      }
    }
    if (this.familiar) {
      lights.push({ x: this.familiar.position.x + 8, y: this.familiar.position.y + 8,
        radius: 90, color: "#ffd479" });
    }
    if (this.boss?.active && this.boss.isBurning) {
      lights.push({ x: this.boss.position.x + 32, y: this.boss.position.y + 34,
        radius: 150, color: "#ff8a3c" });
    } else if (this.boss?.active && this.boss.isExposed) {
      lights.push({ x: this.boss.position.x + 32, y: this.boss.position.y + 40,
        radius: 120, color: "#ffe07a" });
    }

    const denseForest = zone?.id === "lisiere_carrefour" && !this.flags.has("lantern");
    this.lighting.draw(this.renderer, this.camera, lights, {
      minuteOfDay: this.clock.minuteOfDay,
      weather: this.clock.weather,
      biome: this.interior ? undefined : zone?.biome,
      interior: this.indoors,
      gloom: denseForest ? 0.45 : zone?.biome === "forest" ? 0.12 : 0,
    });
  }

  private drawInterface(): void {
    const { ctx } = this.renderer;
    const zone = this.currentZone();
    const interiorName = this.houseSeed !== null
      ? HOUSE_LABELS[houseTradeFor(this.houseSeed)]
      : this.interior ? INTERIOR_NAMES[this.interior]
        : this.fortress.active ? this.fortress.name : null;
    const waypoint = this.waypoint();
    // Face à un gardien, le haut de l'écran appartient à sa jauge : ni
    // cartouche de région ni rappel d'objectif ne doivent s'y superposer.
    const fighting = this.boss?.active === true || this.dragon?.active === true;
    if (fighting) this.hud.clearAnnouncement();
    const heading = waypoint && !this.indoors
      ? { dx: waypoint.zone.x - this.camera.zone.x, dy: waypoint.zone.y - this.camera.zone.y }
      : null;
    this.hud.draw(this.renderer, this.player, this.clock,
      interiorName ?? zone?.name ?? "INCONNU",
      fighting ? undefined : this.quests.activeObjective()?.hint,
      heading);
    if (!this.indoors && !this.menu.active) {
      this.mapScreen.drawMini(ctx, this.camera.zone, VIEW_WIDTH - 74, VIEW_HEIGHT - 70,
        waypoint?.zone, this.frame);
    }
    if (this.boss?.active) this.drawBossBar();
    if (this.dragon?.active) this.drawDragonBar();

    if (this.fortress.active && this.fortress.room?.kind === "entrance"
      && nearFortressExit(this.player.position) && !this.textBox.active) {
      const label = "X   SORTIR";
      ctx.fillStyle = "rgba(10,8,16,0.72)";
      ctx.fillRect(VIEW_WIDTH / 2 - 34, VIEW_HEIGHT - 40, 68, 14);
      drawText(ctx, label, VIEW_WIDTH / 2, VIEW_HEIGHT - 39, { color: PALETTE.cream, align: "center" });
    }
    if (this.interior && nearInteriorExit(this.player.position) && !this.textBox.active) {
      const label = "X   SORTIR";
      ctx.fillStyle = "rgba(10,8,16,0.72)";
      ctx.fillRect(VIEW_WIDTH / 2 - 34, VIEW_HEIGHT - 40, 68, 14);
      drawText(ctx, label, VIEW_WIDTH / 2, VIEW_HEIGHT - 39, { color: PALETTE.cream, align: "center" });
    }
    if (this.noticeFrames > 0) this.drawNotice();

    this.choices.draw(this.renderer);
    this.shop.draw(this.renderer, this.player);
    this.textBox.draw(this.renderer);
    this.menu.draw(this.renderer, this.inventory, this.mapScreen, this.quests,
      this.camera.zone, waypoint?.zone, waypoint?.label, this.frame);
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

  private drawDragonBar(): void {
    const { ctx } = this.renderer;
    const dragon = this.dragon!;
    const width = 220;
    const x = (VIEW_WIDTH - width) / 2;
    ctx.save();
    drawText(ctx, "LE DRAGON DE LA CALDEIRA", VIEW_WIDTH / 2, 24, {
      color: PALETTE.red, align: "center", outline: "rgba(10,8,16,0.9)", shadow: null,
    });
    ctx.fillStyle = "rgba(10,8,16,0.8)";
    ctx.fillRect(x - 2, 38, width + 4, 8);
    ctx.fillStyle = PALETTE.roofDark;
    ctx.fillRect(x, 40, width, 4);
    ctx.fillStyle = dragon.isGrounded ? PALETTE.yellow : PALETTE.red;
    ctx.fillRect(x, 40, Math.round(width * dragon.healthRatio), 4);
    drawText(ctx, dragon.isGrounded ? "IL EST AU SOL — FRAPPEZ" : "HORS D'ATTEINTE",
      VIEW_WIDTH / 2, 48, {
        color: dragon.isGrounded ? PALETTE.yellow : PALETTE.stoneLight, align: "center",
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
    ctx.fillStyle = boss.isBurning ? PALETTE.red
      : boss.isExposed ? PALETTE.yellow : PALETTE.leaf;
    ctx.fillRect(x, 40, Math.round(width * boss.healthRatio), 4);
    const state = boss.isBurning && boss.isExposed ? "EN FEU — ÉCORCE OUVERTE"
      : boss.isBurning ? "EN FEU"
        : boss.isExposed ? "ÉCORCE OUVERTE" : "";
    if (state) {
      drawText(ctx, state, VIEW_WIDTH / 2, 48, {
        color: boss.isBurning ? PALETTE.red : PALETTE.yellow, align: "center",
      });
    }
    ctx.restore();
  }
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
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
