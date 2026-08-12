import { PALETTE } from "../data/palette";
import { Input } from "./Input";
import {
  Renderer, VIEW_HEIGHT, VIEW_WIDTH, ZONE_HEIGHT, ZONE_WIDTH, TILE_SIZE,
} from "./Renderer";
import { TileMap } from "../world/TileMap";
import { TileSet, TILE } from "../world/TileSet";
import { Player, RIPOSTE_FRAMES } from "../entities/Player";
import type { Rect, Vec2 } from "../entities/Entity";
import { Camera, type Edge } from "./Camera";
import { Transition } from "../ui/Transition";
import { ZoneRegistry } from "../world/Zone";
import { ALL_INTERACTABLES } from "../data/interactables";
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
import { Clock, WIND_VECTORS } from "./Clock";
import { Affinity } from "../systems/Affinity";
import { NPCS } from "../data/npcs/core";
import { Npc } from "../entities/Npc";
import { residentOf } from "../data/npcs/residents";
import { ZoneVariants } from "../world/ZoneVariants";
import { VARIANT_LABELS } from "../data/zoneVariants";
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
import { Progression, FORGE_FLAGS } from "../systems/Progression";
import { Requirements, type WorldState } from "../systems/Requirements";
import { createZoneMap, TIDAL_ZONES } from "../world/ZoneMapFactory";
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
import { Journal } from "../systems/Journal";
import { Campfires, CAMPFIRE_WARD } from "../systems/Campfire";
import { PigeonPost, acceptedByPost } from "../systems/PigeonPost";
import { TUNES, knownTunes, nextTuneToTeach, type TuneId } from "../systems/Flute";
import { nextTier, tierAt } from "../systems/Forge";
import { dreamFor } from "../systems/Dreams";
import { CAMP_RECIPES } from "../data/recipes";
import { Garden, CROPS, cropBySeed, PLOT_COUNT } from "../systems/Garden";
import { ComboTracker, TECHNIQUES, knownTechniques, nextTechnique } from "../systems/Techniques";
import { CHRONICLE, CHRONICLE_TOTAL } from "../data/chronicle";
import { festivalAt } from "../data/festivals";
import { pickFish } from "../data/fish";
import { HERBALIST_STOCK } from "../data/shop";
import { CAT_REACH } from "../entities/LanternCat";
import { Fortress } from "../systems/Fortress";
import {
  createRoomMap, nearFortressExit, roomEntry, ROOM_TILES_X, ROOM_TILES_Y,
} from "../world/Dungeons";
import { Dragon } from "../entities/Dragon";
import { drawText } from "../ui/Font";
import { HollowGuardian } from "../entities/HollowGuardian";
import { Companion, COMPANION_REACH } from "../entities/Companion";

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
  private hollowBoss: HollowGuardian | null = null;
  private companion: Companion | null = null;
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
  private readonly journal = new Journal();
  private readonly campfires = new Campfires();
  private readonly post = new PigeonPost();
  private readonly garden = new Garden();
  private readonly combo = new ComboTracker();
  /** Planche du potager devant laquelle on se tient. */
  private plotIndex = 0;
  /** Dernier jour où la pluie a arrosé le potager. */
  private lastRainDay = -1;
  /** Dernière fête célébrée, pour ne pas la rejouer à chaque pas. */
  private lastFestival = "";
  /** Image de la dernière roulade : l'Estoc s'arme dessus. */
  private lastRollFrame = -999;
  private interior: InteriorKind | null = null;
  /** Puits devant lequel on se tient, pour y revenir après le menu. */
  private wellPosition: Vec2 | null = null;
  /**
   * Ce que la liste de choix ouverte est en train de demander. La boîte ne
   * servait qu'au puits et son résultat partait droit dans `resolveWellChoice` ;
   * cinq menus plus tard, il faut savoir à qui l'on parle.
   */
  private choiceContext: "well" | "forge" | "camp" | "flute" | "post"
  | "plot" | "travel" | "dye" | "kerdec" = "well";
  /** Marée à laquelle la carte courante a été bâtie, pour savoir quand la refaire. */
  private tideLevelOfMap = 1;
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

  /** Remplit le sac : sert aux planches de contrôle. */
  debugGive(item: string, count = 1): void {
    if (!(item in ITEMS)) return;
    this.inventory.add(item as ItemId, count);
  }

  /** Cale le jour : la marée et le vent en dépendent. */
  debugSetDay(day: number): void {
    this.clock.day = Math.max(1, Math.floor(day));
  }

  /** Marée et vent courants : contrôle des ajouts côtiers. */
  debugSea(): { tide: string; level: number; wind: string } {
    return {
      tide: this.clock.tide,
      level: Number(this.clock.tideLevel.toFixed(2)),
      wind: this.clock.wind,
    };
  }

  /** Avancement du carnet : régions, gens, bêtes, secrets, titre. */
  debugJournal(): { regions: number; gens: number; betes: number; secrets: number;
    rang: string; complet: number } {
    return {
      regions: this.journal.count("regions"),
      gens: this.journal.count("gens"),
      betes: this.journal.count("betes"),
      secrets: this.journal.count("secrets"),
      rang: this.journal.rank.title,
      complet: Number((this.journal.completion * 100).toFixed(1)),
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
      if (picked) this.resolveChoice(picked);
      this.input.endFrame();
      return;
    }
    if (this.shop.active) {
      this.updateShop();
      this.input.endFrame();
      return;
    }
    if (this.menu.active) {
      this.menu.update(this.input, this.inventory, this.journal);
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
      if (result === "caught") this.landFish();
      this.input.endFrame();
      return;
    }
    if (this.endingPending) {
      this.updateEndingChoice();
      this.input.endFrame();
      return;
    }
    if (this.input.wasPressed("B")) {
      if (this.canFishHere()) {
        if (this.flags.has("fishing_unlocked")) this.fishing.start(this.clock.day, this.frame);
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
    this.player.wind = WIND_VECTORS[this.clock.wind];
    this.player.update();
    if (this.player.splashed) {
      this.particles.emit(this.player.position.x + 8, this.player.position.y + 14, "splash", 5);
      if (this.frame % 20 === 0) this.audio.playSfx("splash");
    }
    if (this.player.isRolling && this.frame % 3 === 0) {
      this.particles.emit(this.player.position.x + 8, this.player.position.y + 14, "dust", 3);
    }
    // On retient la fin de la roulade : c'est elle qui arme l'Estoc.
    if (this.player.isRolling) this.lastRollFrame = this.frame;
    this.burnOnLava();
    this.waterGardenWithRain();
    this.checkFestival();
    this.sufferWeather();
    this.familiar?.update();
    this.companion?.update();
    this.updateNpcs();
    this.updateEnemies();
    this.updateBoss();
    this.updateHollowGuardian();
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

  /**
   * Ce que le ciel vous fait.
   *
   * La météo n'était qu'un filtre : il pleuvait, on voyait moins bien, fin.
   * L'orage frappe à découvert, la neige mord si l'on reste immobile, et la
   * brume ne se contente pas d'être jolie — elle rapproche les créatures sans
   * qu'on les voie venir.
   */
  private sufferWeather(): void {
    if (this.indoors) return;
    const weather = this.clock.weather;
    if (weather === "storm" && this.weather.lightning
      && this.currentZone()?.safe !== true && this.frame % 7 === 0) {
      // La foudre ne tombe qu'à découvert : sous un feu de camp, on est à l'abri.
      const zoneId = this.currentZone()?.id ?? "";
      const now = Campfires.absoluteHour(this.clock.day, this.clock.hour, this.clock.minute);
      if (this.campfires.wards(zoneId, this.player.position, now)) return;
      if (this.player.takeDamage(1, { x: 0, y: 1 })) {
        this.onPlayerHurt(1);
        this.combat.impact(5, 18);
        this.showNotice("La foudre tombe tout près. Trouvez un toit ou un feu.", 170);
      }
      return;
    }
    if (weather === "snow" && this.frame % 90 === 0) {
      // Le froid ronge l'élan, pas les cœurs : on continue, plus lentement.
      this.player.stamina = Math.max(0, this.player.stamina - 4);
    }
  }

  /**
   * On pêche là où l'on borde de l'eau.
   *
   * La pêche n'existait qu'au Quai du Lac, ce qui en faisait une curiosité
   * plutôt qu'une activité. Il suffit maintenant d'avoir de l'eau devant soi.
   */
  private canFishHere(): boolean {
    if (this.indoors || this.player.sailing) return false;
    return this.tilesAround().some(([x, y]) => this.map.isWater(x, y));
  }

  /**
   * Une prise.
   *
   * L'espèce dépend du lieu, de l'heure, de la saison, du ciel et de la marée.
   * Chaque première prise entre au carnet : la pêche devient une collection
   * plutôt qu'un distributeur de huit rubis.
   */
  private landFish(): void {
    const context = {
      biome: this.currentZone()?.biome,
      night: this.clock.isNight,
      season: this.clock.season,
      weather: this.clock.weather,
      tide: this.clock.tide,
    };
    const roll = ((Math.imul(this.frame, 0x9e3779b1) >>> 8) % 10000) / 10000;
    const fish = pickFish(context, roll);
    this.player.rupees = Math.min(this.progression.rupeeCap, this.player.rupees + fish.value);
    this.floaters.reward(this.player.position.x + 8, this.player.position.y - 6,
      `${fish.name}  +${fish.value}`);
    this.quests.notify("collect", "fish", this.frame);
    this.audio.playSfx("secret");
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "splash", 10);
    const fresh = this.journal.record("betes", `fish:${fish.id}`, fish.name, fish.note,
      this.clock.day);
    if (fresh) {
      this.showNotice(`PREMIÈRE PRISE — ${fish.name}. ${fish.note}`, 240);
      this.checkRankUp();
    }
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
    const zoneId = this.currentZone()?.id ?? "";
    const now = Campfires.absoluteHour(this.clock.day, this.clock.hour, this.clock.minute);
    const warded = !this.indoors && this.campfires.wards(zoneId, this.player.position, now);

    for (const enemy of this.enemies) {
      enemy.update();
      if (!enemy.active) continue;
      if (enemy.spawn.type === "ink_heron") { this.observeHeron(enemy); continue; }

      // Sous la garde d'un feu, les créatures rôdent mais ne frappent pas :
      // c'est ce qui fait d'un bivouac autre chose qu'une animation.
      if (warded && Math.hypot(enemy.position.x - this.player.position.x,
        enemy.position.y - this.player.position.y) <= CAMPFIRE_WARD) {
        if (this.frame % 30 === 0) {
          this.particles.emit(enemy.position.x + 8, enemy.position.y, "smoke", 2);
        }
        continue;
      }

      const strike = enemy.takeStrike();
      if (strike) {
        if (strike.ranged) {
          this.projectiles.push(new Projectile(
            { x: strike.x, y: strike.y }, strike.direction,
            enemy.spawn.type === "frost_wisp" ? "frost" : "ember", "foe"));
          this.audio.playSfx("charge");
        } else {
          const blade = { x: strike.x - 12, y: strike.y - 12, width: 24, height: 24 };
          if (overlaps(blade, playerBox) && !this.tryBlock(strike.direction, enemy)
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
        const push = { x: dx / length, y: dy / length };
        if (!this.tryBlock(push, enemy)
          && this.player.takeDamage(enemy.definition.damage, push)) {
          this.onPlayerHurt(enemy.definition.damage);
        }
      }
    }
    this.updateFamiliarCombat();
    this.updateCompanionCombat();
  }

  /**
   * Bouclier.
   *
   * Rend vrai quand le coup a été arrêté — auquel cas il ne blesse pas. Une
   * parade parfaite sonne la créature et ouvre la fenêtre de riposte : c'est
   * la seule façon d'obtenir un avantage plutôt que de simplement survivre.
   */
  private tryBlock(direction: Readonly<Vec2>, enemy?: Enemy): boolean {
    const result = this.player.block(direction);
    if (!result) return false;
    const at = { x: this.player.position.x + 8, y: this.player.position.y + 8 };
    if (result === "parfait") {
      this.audio.playSfx("secret");
      this.combat.impact(3, 10);
      this.particles.emit(at.x, at.y, "spark", 18);
      this.floaters.push(at.x, at.y - 10, "PARADE !", PALETTE.yellow);
      if (enemy) enemy.stagger(RIPOSTE_FRAMES);
      this.journal.noteSecret("parade", "La parade parfaite",
        "Lever le bouclier au dernier moment sonne l'adversaire et ouvre une riposte.",
        this.clock.day);
      return true;
    }
    this.audio.playSfx("deny");
    this.combat.impact(1, 4);
    this.particles.emit(at.x, at.y, "dust", 8);
    this.floaters.push(at.x, at.y - 10, "bloqué", PALETTE.stoneLight);
    return true;
  }

  /**
   * Le familier au combat.
   *
   * Une fois nourri, le Chat-Lanterne suit et lâche une flammèche sur ce qui
   * approche. Il n'abat rien seul — c'est un compagnon, pas une seconde épée.
   */
  private updateFamiliarCombat(): void {
    const cat = this.familiar;
    if (!cat?.isFollowing || !cat.ready) return;
    const target = this.enemies.find((enemy) => enemy.active
      && cat.distanceTo(enemy.position) <= CAT_REACH);
    if (!target || !cat.spark()) return;
    const dx = target.position.x - cat.position.x;
    const dy = target.position.y - cat.position.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.projectiles.push(new Projectile(
      { x: cat.position.x + 8, y: cat.position.y + 6 },
      { x: dx / length, y: dy / length }, "ember", "player"));
    this.particles.emit(cat.position.x + 8, cat.position.y, "ember", 5);
  }

  /**
   * Liane au combat.
   *
   * Une ronce sur ce qui approche, la Gardienne comprise — elle ne perce pas
   * son écorce fermée, mais Liane n'a pas besoin de le savoir pour essayer.
   */
  private updateCompanionCombat(): void {
    const liane = this.companion;
    if (!liane?.isFollowing || !liane.ready) return;
    const bossCentre = this.hollowBoss?.active
      ? { x: this.hollowBoss.position.x + 24, y: this.hollowBoss.position.y + 34 } : null;
    const target = (bossCentre && liane.distanceTo(bossCentre) <= COMPANION_REACH)
      ? bossCentre
      : this.enemies.find((enemy) => enemy.active
        && liane.distanceTo(enemy.position) <= COMPANION_REACH)?.position;
    if (!target || !liane.spark()) return;
    const dx = target.x - liane.position.x;
    const dy = target.y - liane.position.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.projectiles.push(new Projectile(
      { x: liane.position.x + 8, y: liane.position.y + 6 },
      { x: dx / length, y: dy / length }, "seed", "player"));
    this.particles.emit(liane.position.x + 8, liane.position.y, "leaf", 5);
  }

  /**
   * Le Héron d'Encre.
   *
   * C'est la seule bête du jeu qu'on ne gagne rien à tuer : elle se note. En
   * approchant assez près sans la faire fuir, on obtient le croquis — et le
   * bestiaire y gagne la seule entrée qui ne se paie pas en coups.
   */
  private observeHeron(heron: Enemy): void {
    const distance = Math.hypot(heron.position.x - this.player.position.x,
      heron.position.y - this.player.position.y);
    if (distance > 44) return;
    heron.active = false;
    this.particles.emit(heron.position.x + 8, heron.position.y, "leaf", 18);
    this.audio.playSfx("secret");
    if (this.inventory.count("heron_sketch") === 0) this.inventory.add("heron_sketch");
    this.flags.set("heron_observed");
    this.journal.noteBeast("ink_heron", this.clock.day);
    this.journal.noteSecret("heron", "Le Héron d'Encre",
      "Approché au gué, à l'aube, sans un bruit. Il est reparti sans se presser.",
      this.clock.day);
    this.showNotice("Vous croquez le Héron d'Encre avant qu'il ne s'envole.", 240);
    this.checkRankUp();
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

  private updateHollowGuardian(): void {
    const guardian = this.hollowBoss;
    if (!guardian?.active) return;
    guardian.update();
    const playerBox = {
      x: this.player.position.x + this.player.hitbox.x,
      y: this.player.position.y + this.player.hitbox.y,
      width: this.player.hitbox.width,
      height: this.player.hitbox.height,
    };
    for (const spore of guardian.spores) {
      if (!spore.active) continue;
      const box = { x: spore.x - 3, y: spore.y - 3, width: 6, height: 6 };
      if (!overlaps(box, playerBox)) continue;
      spore.active = false;
      const dx = this.player.position.x - spore.x;
      const dy = this.player.position.y - spore.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      if (this.player.takeDamage(1, { x: dx / length, y: dy / length })) this.onPlayerHurt(1);
    }
    for (const eruption of guardian.eruptionBounds()) {
      if (!overlaps(eruption, playerBox)) continue;
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

  /** Nomme la technique qui vient de porter, et consomme ce qui l'armait. */
  private announceTechnique(technique: "estoc" | "fauche" | "riposte" | null): void {
    this.combo.strike(this.frame);
    if (!technique) return;
    const names: Readonly<Record<string, string>> = {
      estoc: "ESTOC", fauche: "FAUCHE", riposte: "RIPOSTE",
    };
    this.floaters.push(this.player.position.x + 8, this.player.position.y - 16,
      names[technique]!, PALETTE.yellow);
    this.combat.impact(technique === "riposte" ? 4 : 2, 10);
    this.audio.playSfx("spin");
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "ring", 12);
    if (technique === "riposte") this.player.riposteFrames = 0;
    if (technique === "fauche") this.combo.break();
    if (technique === "estoc") this.lastRollFrame = -999;
    this.journal.noteSecret(`tech:${technique}`, names[technique]!,
      TECHNIQUES.find((entry) => entry.id === technique)!.effect, this.clock.day);
  }

  private castFireball(): void {
    const facing = this.player.facingVector();
    this.projectiles.push(new Projectile(
      { x: this.player.position.x + 8 + facing.x * 10, y: this.player.position.y + 8 + facing.y * 10 },
      facing, "fireball", "player"));
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "ember", 10);
    this.igniteAround(this.player.position.x + 8, this.player.position.y + 8);
  }

  /**
   * Technique armée par la situation courante.
   *
   * Une technique ne s'active pas au bouton : elle récompense un placement.
   * L'estoc suit une roulade, la riposte suit une parade, la fauche vient au
   * troisième coup d'un enchaînement.
   */
  private activeTechnique(): "estoc" | "fauche" | "riposte" | null {
    if (this.flags.has("tech_riposte") && this.player.canRiposte) return "riposte";
    if (this.flags.has("tech_estoc") && this.frame - this.lastRollFrame <= 22) return "estoc";
    if (this.flags.has("tech_fauche") && this.combo.rank >= 3) return "fauche";
    return null;
  }

  private resolveSwordHits(): void {
    const sword = this.player.attackHitbox();
    const spinning = this.player.isSpinning;
    this.resolveDragonHit(sword, spinning);
    // La technique multiplie ; le coup tournoyant multipliait déjà. Les deux
    // ne se cumulent pas : on ne veut pas d'un coup à douze.
    const technique = this.activeTechnique();
    const bonus = technique === "riposte" ? 3 : technique === "estoc" ? 2 : 1;
    const damage = this.player.attackDamage * (spinning ? 2 : bonus);

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

    if (this.hollowBoss?.active) {
      const guardian = this.hollowBoss;
      if (overlaps(sword, guardian.bounds) && this.combat.confirmHit("hollow_guardian", true)) {
        const wasExposed = guardian.isExposed;
        const defeated = guardian.hit(damage);
        this.audio.playSfx(wasExposed ? "hit" : "deny");
        if (wasExposed) {
          this.floaters.damage(guardian.position.x + 24, guardian.position.y + 10, damage, true);
          this.particles.emit(guardian.position.x + 24, guardian.position.y + 34, "spark", 10);
        } else {
          this.floaters.push(guardian.position.x + 24, guardian.position.y + 10, "écorce",
            PALETTE.stoneLight);
        }
        if (defeated) this.onHollowGuardianDefeated();
      }
    }

    // La Fauche balaie : au troisième coup, la portée devient un cercle.
    const sweep = technique === "fauche"
      ? { x: this.player.position.x - 22, y: this.player.position.y - 20,
        width: 60, height: 56 }
      : null;
    let touched = false;

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      const inWave = this.player.isDemon
        && Math.hypot(enemy.position.x - this.player.position.x,
          enemy.position.y - this.player.position.y) <= this.player.fireRadius;
      const reached = overlaps(sword, enemy.bounds)
        || (sweep !== null && overlaps(sweep, enemy.bounds));
      if (!reached && !inWave) continue;
      // Interrompre une annonce compte comme un contre : le coup fait mal.
      const parry = enemy.isTelegraphing;
      if (!this.combat.confirmHit(enemy.spawn.id, spinning || parry)) continue;
      touched = true;
      const total = damage + (parry ? 1 : 0);
      const defeated = enemy.hit(total, this.player.position);
      this.audio.playSfx("hit");
      this.floaters.damage(enemy.position.x + 8, enemy.position.y - 2, total,
        spinning || parry || technique !== null);
      this.particles.spray(enemy.position.x + 8, enemy.position.y + 8, "blood", {
        x: enemy.position.x - this.player.position.x,
        y: enemy.position.y - this.player.position.y,
      }, 5);
      if (defeated) this.onEnemyDefeated(enemy);
    }

    if (touched) this.announceTechnique(technique);

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
    const guardian = nightGuardianFor(zoneId, this.clock.hour,
      (flag) => this.flags.has(flag), this.clock.tide);
    if (guardian && enemy.spawn.type === guardian.type) {
      const message = this.campaign.trigger(guardian.trigger, this.frame);
      if (message) {
        this.textBox.open(message, "LA CLAIRIÈRE");
        this.combat.impact(4, 22);
        this.audio.playSfx("secret");
      }
      // Certains gardiens n'ont pas de suite scénarisée : leur drapeau doit
      // tout de même tomber, sinon ils reviennent à chaque visite.
      this.flags.set(guardian.until);
    }
    // Toute créature abattue entre au bestiaire, avec sa faiblesse.
    if (this.journal.noteBeast(enemy.spawn.type, this.clock.day)) this.checkRankUp();
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

  /**
   * La Gardienne des Racines n'a pas de choix binaire à offrir : elle gardait
   * un lieu, pas un destin. La refermer suffit à finir ce que l'Arbre-Mère
   * avait laissé en plan sous la Cime.
   */
  private onHollowGuardianDefeated(): void {
    if (this.flags.has("hollow_guardian_felled")) return;
    this.flags.set("hollow_guardian_felled");
    this.quests.notify("defeat", "hollow_guardian", this.frame);
    this.inventory.add("root_charm");
    this.progression.apply(this.player);
    this.combat.impact(5, 26);
    this.particles.emit(this.player.position.x + 8, this.player.position.y, "ring", 30);
    this.audio.playSfx("secret");
    this.showNotice("LA GARDIENNE SE TAIT — les Racines Creuses sont franchies.", 300);
    this.textBox.open(
      "La Gardienne s'affaisse en un nœud de racines mortes. Le silence qui suit "
      + "n'est pas vide : c'est celui d'un lieu enfin sans travail à faire.",
      "Les Racines Creuses");
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
        if (this.hollowBoss?.active && overlaps(projectile.bounds, this.hollowBoss.bounds)) {
          const wasExposed = this.hollowBoss.isExposed;
          const defeated = this.hollowBoss.hit(projectile.damage);
          this.particles.emit(projectile.position.x, projectile.position.y, "spark", 14);
          projectile.destroy();
          if (wasExposed) {
            this.floaters.damage(this.hollowBoss.position.x + 24, this.hollowBoss.position.y + 10,
              projectile.damage);
          }
          if (defeated) this.onHollowGuardianDefeated();
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
  /**
   * Récolte dans les trois nouveaux lieux.
   *
   * Un verger où l'on ne cueille rien, une bibliothèque où l'on ne lit rien et
   * une grotte où l'on ne ramasse rien sont trois décors. Chacun rend ce qu'il
   * a, une fois par jour : c'est la raison d'y revenir.
   */
  /**
   * Lire la Chronique.
   *
   * Les feuillets se ramassent partout et ne disent rien tant qu'on ne les
   * relie pas. Le pupitre de la Bibliothèque Noyée les lit dans l'ordre : un
   * par visite, tant qu'il en reste au sac.
   */
  private tryReadChronicle(): boolean {
    if (this.interior !== "library") return false;
    const atLectern = this.tilesAround()
      .some(([x, y]) => this.map.tileAt("terrain", x, y) === TILE.shrineStone);
    if (!atLectern) return false;

    const read = CHRONICLE.filter((page) => this.flags.has(`page:${page.number}`)).length;
    if (this.inventory.count("chronicle_page") === 0) {
      this.showNotice(read === 0
        ? "Le pupitre attend un feuillet. Il en traîne douze dans la vallée."
        : `${read}/${CHRONICLE_TOTAL} feuillets reliés. Il en manque encore.`, 200);
      this.audio.playSfx("deny");
      return true;
    }
    const page = CHRONICLE.find((candidate) => !this.flags.has(`page:${candidate.number}`));
    if (!page) {
      this.showNotice("La Chronique est complète. Les cairns, maintenant.", 200);
      return true;
    }
    this.inventory.remove("chronicle_page");
    this.flags.set(`page:${page.number}`);
    this.audio.playSfx("secret");
    this.particles.emit(this.player.position.x + 8, this.player.position.y, "spark", 12);
    this.textBox.open(page.text, `CHRONIQUE ${page.number}/${CHRONICLE_TOTAL} — ${page.title}`);
    this.journal.noteSecret(`chronicle:${page.number}`,
      `Chronique ${page.number} — ${page.title}`, page.text, this.clock.day);
    if (read + 1 === CHRONICLE_TOTAL) {
      this.flags.set("chronicle_complete");
      this.showNotice("LA CHRONIQUE EST COMPLÈTE — les quatre cairns vous attendent.", 300);
    }
    this.checkRankUp();
    return true;
  }

  private tryHarvestIndoors(): boolean {
    if (this.interior === null) return false;
    const table: Partial<Record<InteriorKind,
    { tile: number; item: ItemId; count: number; line: string }>> = {
      orchard: {
        tile: TILE.treeTrunk, item: "night_pear", count: 2,
        line: "Deux poires de nuit se détachent sans résistance.",
      },
      library: {
        tile: TILE.bookshelf, item: "drowned_page", count: 1,
        line: "Un feuillet se décolle du rayon. L'encre a coulé, le sens tient.",
      },
      strand_cave: {
        tile: TILE.driftwood, item: "tide_pearl", count: 1,
        line: "Sous le bois flotté, une perle d'estran.",
      },
    };
    const rule = table[this.interior];
    if (!rule) return false;

    for (const [tileX, tileY] of this.tilesAround()) {
      if (this.map.tileAt("terrain", tileX, tileY) !== rule.tile) continue;
      const key = `${this.interior}:${tileX},${tileY}`;
      if (!this.clock.canHarvest(key, 1)) {
        this.showNotice("Vous avez déjà pris ce qu'il y avait ici aujourd'hui.", 140);
        this.audio.playSfx("deny");
        return true;
      }
      this.clock.harvest(key);
      this.inventory.add(rule.item, rule.count);
      this.floaters.reward(this.player.position.x + 8, this.player.position.y - 6,
        `${ITEMS[rule.item].name} ×${rule.count}`);
      this.particles.emit(this.player.position.x + 8, this.player.position.y, "leaf", 12);
      this.audio.playSfx("secret");
      this.showNotice(rule.line, 180);
      this.journal.noteSecret(`harvest:${this.interior}`,
        INTERIOR_NAMES[this.interior], rule.line, this.clock.day);
      return true;
    }
    return false;
  }

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
    // On rêve. Le rêve suit l'avancement et dit l'objectif autrement que la
    // liste de quêtes — par une image, ce qui se retient mieux qu'une consigne.
    const dream = dreamFor((flag) => this.flags.has(flag));
    this.textBox.open(
      `${dream.text}\n\nVous vous réveillez au matin du jour ${this.clock.day}.`,
      dream.title.toUpperCase());
    this.journal.noteSecret(`dream:${dream.title}`, dream.title, dream.text, this.clock.day);
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
      this.hollowBoss = null;
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
    if (this.companion && this.companion.distanceTo(this.player.position) <= 34) {
      this.talkToLiane();
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
      if (this.tryReadChronicle()) return;
      if (this.tryHarvestIndoors()) return;
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
    // Les gestes qui ouvrent une liste plutôt qu'une réplique.
    if (nearest.data.kind === "anvil") { this.openForgeMenu(); return; }
    if (nearest.data.kind === "dovecote") { this.openPostMenu(); return; }
    if (nearest.data.kind === "campfire") { this.openCampMenu(); return; }
    if (nearest.data.kind === "plot") {
      const index = Number(nearest.data.id.replace("plot_", "")) - 1;
      this.openPlotMenu(Math.max(0, Math.min(PLOT_COUNT - 1, index)));
      return;
    }
    if (nearest.data.kind === "door") {
      // Une porte sous condition — la nuit, la marée, le lest — refuse
      // d'abord et dit ce qui manque, au lieu de s'ouvrir en silence.
      const gate = this.requirements.check(nearest.data.requires, this.worldState());
      if (!gate.ok) {
        this.showNotice(gate.reason, 170);
        this.textBox.open(gate.reason);
        this.audio.playSfx("deny");
        return;
      }
      if (nearest.data.id === "fortress_gate") this.enterFortress("vertepierre");
      else if (nearest.data.id === "hollow_gate") this.enterFortress("racines_creuses");
      else {
        this.enterInterior(nearest.data.id === "hermitage_door" ? "hermitage"
          : nearest.data.id === "castle_gate" ? "castle"
            : nearest.data.id === "witch_tower_door" ? "tower"
              : nearest.data.id === "library_hatch" ? "library"
                : nearest.data.id === "orchard_gate" ? "orchard"
                  : nearest.data.id === "strand_cave_mouth" ? "strand_cave" : "cottage");
      }
      return;
    }
    this.useInteractable(nearest);
  }

  private talkTo(npc: Npc): void {
    const postgameLine = this.flags.has("act2_complete")
      ? epilogueLine("hollow", npc.data.id)
      : this.flags.has("ending_release")
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
    if (npc.data.id === "wren") this.teachTune();
    if (npc.data.id === "odile") this.taunt();
    if (npc.data.id === "fennec") this.ferry();
    if (npc.data.id === "soeur_aubel") this.tendWounds();
    if (npc.data.id === "kerdec") this.openKerdecMenu();
    if (npc.data.id === "mira") this.shop.open(HERBALIST_STOCK);
    if (npc.data.id === "doyenne_maree") this.tellTide();
    if (npc.data.id === "jardinier") this.explainGarden();
    // Une tête rencontrée est une tête notée : le carnet ne se remplit pas
    // tout seul, il se remplit en allant voir les gens.
    this.journal.notePerson(npc.data.id, npc.data.name,
      `Rencontrée ${this.zoneName()}. « ${npc.data.chatter[0]} »`, this.clock.day);
    this.events.publish({ type: "talk", id: npc.data.id, frame: this.frame });
  }

  /**
   * Les cairns.
   *
   * Trois d'entre eux ne font que parler ; le quatrième exige les douze
   * feuillets. Toucher les quatre referme la Chronique et donne à la vallée
   * le dernier mot qu'elle n'avait jamais eu.
   */
  private onCairnTouched(id: string): void {
    this.flags.set(`cairn:${id}`);
    const touched = ["cairn_nord", "cairn_sud", "cairn_est", "cairn_ouest"]
      .filter((cairn) => this.flags.has(`cairn:${cairn}`)).length;
    this.journal.noteSecret(id, "Le Cairn des Douze",
      `Pierre ${touched}/4 relevée. Le dernier n'accepte que la Chronique complète.`,
      this.clock.day);
    this.audio.playSfx("secret");
    if (touched < 4) {
      this.showNotice(`CAIRN ${touched}/4. Les autres pierres attendent.`, 220);
      return;
    }
    this.flags.set("cairn_complete");
    this.combat.impact(5, 30);
    this.particles.emit(this.player.position.x + 8, this.player.position.y, "ring", 30);
    this.textBox.open(
      "Les quatre cairns s'accordent, et la vallée dit enfin ce qu'elle taisait : "
      + "elle n'a jamais eu besoin d'être sauvée. Elle avait besoin d'être lue. "
      + "Votre carnet vient de finir le travail que douze scribes ont laissé en plan.",
      "LE CAIRN DES DOUZE");
    this.showNotice("LE CAIRN DES DOUZE — la Chronique est close.", 320);
    this.checkRankUp();
  }

  /** Nom de la région courante, pour les notes du carnet. */
  private zoneName(): string {
    if (this.interior) return `à ${INTERIOR_NAMES[this.interior]}`;
    if (this.fortress.active) return `à ${this.fortress.name}`;
    return `à ${this.currentZone()?.name ?? "un endroit sans nom"}`;
  }

  /**
   * Wren enseigne un air par visite, dans l'ordre. Elle ne réclame rien : sa
   * seule condition est d'être venue jusqu'à elle, et elle bouge assez pour
   * que ce soit une condition.
   */
  private teachTune(): void {
    if (this.inventory.count("willow_flute") === 0) {
      this.showNotice("Wren mime trois doigts sur une flûte que vous n'avez pas.", 190);
      return;
    }
    const tune = nextTuneToTeach((flag) => this.flags.has(flag));
    if (!tune) {
      this.showNotice("« Vous les avez tous les trois. Le reste, c'est du bruit. »", 190);
      return;
    }
    this.flags.set(tune.learnedFlag);
    this.audio.playSfx("secret");
    this.particles.emit(this.player.position.x + 8, this.player.position.y, "spark", 18);
    this.showNotice(`${tune.name.toUpperCase()} appris — ${tune.notes.join(" ")}. ${tune.effect}`, 260);
    this.journal.noteSecret(`tune_${tune.id}`, tune.name,
      `${tune.notes.join(" ")} — ${tune.effect}`, this.clock.day);
    if (knownTunes((flag) => this.flags.has(flag)).length === TUNES.length) {
      this.journal.noteSecret("tunes_all", "Le répertoire complet",
        "Trois airs, appris auprès de Wren. Elle n'en connaît pas d'autres.", this.clock.day);
    }
  }

  /**
   * Fennec passe le lac à la rame.
   *
   * Il comble le trou entre « on voit l'autre rive » et « on a une coque » :
   * deux rubis, et la traversée se fait. Le jour où la barque de Sarn est à
   * vous, il refuse — un passeur ne rame pas pour un armateur.
   */
  private ferry(): void {
    if (this.flags.has("boat")) {
      this.showNotice("« Vous avez votre coque. Je ne rame pas pour la concurrence. »", 200);
      return;
    }
    const here = this.currentZone()?.id;
    const target = here === "quai_lac" ? { x: 9, y: 5 }
      : here === "criques" ? { x: 3, y: 4 } : null;
    if (!target) return;
    if (this.player.rupees < 2) {
      this.showNotice("« Deux rubis la traversée. Le lac ne fait pas crédit. »", 200);
      this.audio.playSfx("deny");
      return;
    }
    this.player.rupees -= 2;
    this.textBox.close();
    this.transition.start(() => {
      this.camera.zone = { ...target };
      this.player.position = { x: ZONE_WIDTH / 2, y: ZONE_HEIGHT / 2 };
      this.loadZoneObjects();
      this.player.unstick();
      this.camera.snapTo(this.player.position);
      this.mapScreen.reveal(this.camera.zone);
      this.announceZone();
      this.audio.playSfx("splash");
      this.showNotice("Fennec rame en silence. La rive d'en face approche.", 190);
    });
    this.journal.noteSecret("ferry", "Le passeur du lac",
      "Fennec traverse pour deux rubis, tant qu'on n'a pas de coque à soi.",
      this.clock.day);
  }

  /**
   * Sœur Aubel soigne contre des fleurs-œil. Elle est la seule à rendre des
   * cœurs loin d'un puits ou d'un lit, ce qui vaut le détour par les vergers.
   */
  private tendWounds(): void {
    if (this.inventory.count("eye_flower") < 3) {
      this.showNotice("« Trois fleurs-œil, et je vous remets debout. C'est le tarif. »", 200);
      return;
    }
    this.inventory.consume([{ item: "eye_flower", count: 3 }]);
    this.inventory.add("red_potion");
    this.player.hearts = this.player.maxHearts;
    this.particles.emit(this.player.position.x + 8, this.player.position.y, "heal", 18);
    this.audio.playSfx("secret");
    this.showNotice("Sœur Aubel vous remet d'aplomb, et glisse une potion rouge dans le sac.", 220);
    this.journal.noteSecret("aubel", "L'herboristerie d'Aubel",
      "Trois fleurs-œil valent un soin complet et une potion rouge.", this.clock.day);
  }

  /**
   * La Doyenne compte les marées.
   *
   * Attendre la mer basse en tournant en rond était la seule façon de savoir
   * quand la Grotte de l'Estran s'ouvrait. Elle donne l'heure, et c'est tout
   * ce qu'elle sait faire.
   */
  private tellTide(): void {
    const wait = this.clock.hoursUntilLowTide();
    const line = wait <= 0
      ? "« La mer est basse en ce moment même. Ne traînez pas. »"
      : wait < 2
        ? `« Elle se retire bientôt. Comptez ${wait.toFixed(1)} heure. »`
        : `« Pas avant ${wait.toFixed(0)} heures. Allez faire autre chose. »`;
    this.showNotice(line, 220);
    this.journal.noteSecret("doyenne", "La Doyenne des Marées",
      "Elle donne l'heure du prochain reflux. Elle ne prédit rien : elle compte.",
      this.clock.day);
  }

  /** Sévère explique le potager — une fois, sèchement. */
  private explainGarden(): void {
    const ripe = Array.from({ length: PLOT_COUNT }, (_, index) =>
      this.garden.status(index, this.clock.day)).filter((status) => status === "mûre").length;
    const thirsty = Array.from({ length: PLOT_COUNT }, (_, index) =>
      this.garden.status(index, this.clock.day)).filter((status) => status === "assoiffée").length;
    this.showNotice(ripe > 0
      ? `« ${ripe} planche(s) sont mûres. Vous comptez les laisser pourrir ? »`
      : thirsty > 0
        ? `« ${thirsty} planche(s) ont soif. L'arrosoir est là pour ça. »`
        : "« Six planches. Semez, arrosez, revenez. Ce n'est pas un métier compliqué. »", 220);
  }

  /** Odile mesure votre carnet au sien, et le fait savoir. */
  private taunt(): void {
    const filled = Math.round(this.journal.completion * 100);
    const line = filled < 20
      ? "« Vingt régions relevées pour moi ce mois-ci. Et vous ? »"
      : filled < 50
        ? "« Vous progressez. Lentement, mais dans le bon sens. »"
        : filled < 85
          ? "« Je commence à vérifier mes marges après votre passage. C'est nouveau. »"
          : "« Votre carnet vaut le mien. Je déteste l'écrire, mais je l'écris. »";
    this.showNotice(line, 220);
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
    // Trois objets ne se rangent pas au sac : ils changent ce qu'on est.
    if (opened && nearest.data.grants?.item === "oak_shield") {
      this.player.hasShield = true;
      this.showNotice("RONDACHE DE CHÊNE — E ou Q pour lever la garde. Au dernier moment, elle pare.", 300);
      this.journal.noteSecret("bouclier", "La rondache de chêne",
        "Lever la garde ralentit ; la lever au dernier moment pare et ouvre une riposte.",
        this.clock.day);
    }
    if (opened && nearest.data.grants?.item === "mule_bridle") {
      this.player.mounted = true;
      this.showNotice("GROGNON accepte le licol. Vous allez nettement plus vite sur les chemins.", 280);
    }
    if (opened && nearest.data.grants?.item === "bigger_satchel") {
      this.flags.set("satchel_upgraded");
      this.inventory.setRoomy(true);
      this.showNotice("BESACE DOUBLÉE — chaque pile monte d'une moitié.", 240);
    }
    if (opened && nearest.data.kind === "cairn") this.onCairnTouched(nearest.data.id);
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
    this.choiceContext = "well";
    // Toucher une margelle l'inscrit au réseau : c'est ce qui rend le voyage
    // rapide progressif plutôt que donné.
    const zoneId = this.currentZone()?.id;
    if (zoneId && this.flags.set(`well:${zoneId}`)) {
      this.journal.noteSecret("puits", "Le réseau des puits",
        "Un puits touché devient une destination. L'eau communique.", this.clock.day);
    }
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
      { id: "travel", label: "Partir d'un trait", note: "vers un autre puits" },
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
    if (choice === "travel") {
      this.openTravelMenu();
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

  /** Aiguille la liste de choix vers le lieu qui l'a ouverte. */
  private resolveChoice(choice: string): void {
    if (this.choiceContext === "forge") this.resolveForgeChoice(choice);
    else if (this.choiceContext === "camp") this.resolveCampChoice(choice);
    else if (this.choiceContext === "flute") this.resolveFluteChoice(choice);
    else if (this.choiceContext === "post") this.resolvePostChoice(choice);
    else if (this.choiceContext === "plot") this.resolvePlotChoice(choice);
    else if (this.choiceContext === "travel") this.resolveTravelChoice(choice);
    else if (this.choiceContext === "dye") this.resolveDyeChoice(choice);
    else if (this.choiceContext === "kerdec") this.resolveKerdecChoice(choice);
    else this.resolveWellChoice(choice);
  }

  // — La forge de Bram —————————————————————————————————————————

  private openForgeMenu(): void {
    this.choiceContext = "forge";
    const level = this.progression.swordLevel;
    const tier = tierAt(level);
    const next = nextTier(level);
    if (!next) {
      this.choices.open(`FORGE — ${tier.name.toUpperCase()}`, [
        { id: "cancel", label: "Bram hoche la tête", note: "rien à ajouter" },
      ]);
      return;
    }
    const ore = this.inventory.count("moon_ore");
    const enough = ore >= next.ore && this.player.rupees >= next.rupees;
    this.choices.open(`FORGE — ${tier.name.toUpperCase()}`, [
      {
        id: "temper",
        label: `Forger : ${next.name}`,
        note: enough ? `${next.ore} minerai · ${next.rupees} r`
          : `manque ${Math.max(0, next.ore - ore)} min. · ${Math.max(0, next.rupees - this.player.rupees)} r`,
        disabled: !enough,
      },
      { id: "look", label: "Regarder la lame", note: `${tier.damage} dégât${tier.damage > 1 ? "s" : ""}` },
      { id: "cancel", label: "Remercier et sortir" },
    ]);
  }

  private resolveForgeChoice(choice: string): void {
    if (choice === "look") {
      const tier = tierAt(this.progression.swordLevel);
      this.textBox.open(tier.line, "Bram", "bram");
      return;
    }
    if (choice !== "temper") return;
    const next = nextTier(this.progression.swordLevel);
    if (!next) return;
    this.inventory.consume([{ item: "moon_ore", count: next.ore }]);
    this.player.rupees -= next.rupees;
    this.flags.set(FORGE_FLAGS[next.level - 1]!);
    this.progression.apply(this.player);
    this.particles.emit(this.player.position.x + 8, this.player.position.y, "spark", 22);
    this.audio.playSfx("secret");
    this.showNotice(`${next.name} — ${next.damage} dégâts par coup.`, 200);
    this.textBox.open(next.line, "Bram", "bram");
    this.journal.noteSecret("forge", "La forge de Bram",
      `${next.name} sortie de l'enclume au jour ${this.clock.day}.`, this.clock.day);
  }

  // — Le feu de camp ———————————————————————————————————————————

  private openCampMenu(): void {
    this.choiceContext = "camp";
    const zone = this.currentZone();
    const now = Campfires.absoluteHour(this.clock.day, this.clock.hour, this.clock.minute);
    const lit = zone !== null && this.campfires.in(zone.id, now).length > 0;
    const cookable = CAMP_RECIPES.filter((recipe) => this.inventory.hasAll(recipe.ingredients));
    this.choices.open(lit ? "LE FEU" : "ALLUMER UN FEU", [
      {
        id: "light", label: lit ? "Raviver les braises" : "Battre le briquet",
        note: this.inventory.count("tinder_kit") > 0 ? "6 h de flamme" : "sans nécessaire",
        disabled: this.inventory.count("tinder_kit") === 0,
      },
      {
        id: "cook", label: "Faire cuire",
        note: cookable.length > 0 ? cookable[0]!.id.replace("camp_", "") : "rien à cuire",
        disabled: !lit || cookable.length === 0,
      },
      { id: "wait:matin", label: "Veiller jusqu'au matin", note: "09:00", disabled: !lit },
      { id: "wait:nuit", label: "Veiller jusqu'à la nuit", note: "22:00", disabled: !lit },
      { id: "cancel", label: "Laisser le feu tranquille" },
    ]);
  }

  private resolveCampChoice(choice: string): void {
    const zone = this.currentZone();
    if (!zone) return;
    const now = Campfires.absoluteHour(this.clock.day, this.clock.hour, this.clock.minute);
    if (choice === "light") {
      // Un feu allumé sous ses propres pieds reste caché par le personnage :
      // on le pose devant, si la case est libre, et à ses pieds sinon.
      const facing = this.player.facingVector();
      const ahead = {
        x: this.player.position.x + facing.x * 20,
        y: this.player.position.y + facing.y * 20,
      };
      const tileX = Math.floor((ahead.x + 8) / TILE_SIZE);
      const tileY = Math.floor((ahead.y + 12) / TILE_SIZE);
      const spot = this.map.solidFor(tileX, tileY, false) ? this.player.position : ahead;
      this.campfires.light(zone.id, spot, now);
      this.particles.emit(spot.x + 8, spot.y + 8, "ember", 24);
      this.audio.playSfx("secret");
      this.showNotice("Le feu prend. Il tiendra six heures.", 180);
      this.journal.noteSecret("campfire", "Le premier feu",
        "On peut camper n'importe où, avec de l'amadou sec.", this.clock.day);
      return;
    }
    if (choice === "cook") {
      const recipe = CAMP_RECIPES.find((candidate) => this.inventory.hasAll(candidate.ingredients));
      if (!recipe) return;
      this.inventory.consume(recipe.ingredients);
      this.inventory.add(recipe.result);
      this.particles.emit(this.player.position.x + 8, this.player.position.y, "smoke", 14);
      this.audio.playSfx("secret");
      this.showNotice(recipe.message, 200);
      return;
    }
    if (!choice.startsWith("wait:")) return;
    const moment = choice.slice(5) as "matin" | "nuit";
    const before = this.clock.day;
    this.clock.waitUntil(moment);
    this.lastScheduleHour = -1;
    this.reloadNpcs();
    if (this.clock.day !== before) this.populate();
    this.player.stamina = 100;
    this.showNotice(`Vous veillez près du feu. ${capitalise(moment)}, il est ${this.clock.hour}h.`, 190);
  }

  // — La flûte de saule ————————————————————————————————————————

  private openFluteMenu(): void {
    this.choiceContext = "flute";
    const known = knownTunes((flag) => this.flags.has(flag));
    if (known.length === 0) {
      this.showNotice("Vous savez tenir la flûte, pas en jouer. Wren, peut-être.", 190);
      this.audio.playSfx("deny");
      return;
    }
    this.choices.open("FLÛTE DE SAULE", [
      ...known.map((tune) => ({
        id: `tune:${tune.id}`, label: tune.name, note: tune.notes.join(" "),
      })),
      { id: "cancel", label: "Ranger la flûte" },
    ]);
  }

  private resolveFluteChoice(choice: string): void {
    if (!choice.startsWith("tune:")) return;
    const id = choice.slice(5) as TuneId;
    this.audio.playSfx("secret");
    this.particles.emit(this.player.position.x + 8, this.player.position.y, "spark", 16);
    if (id === "pluie") {
      this.flags.set("flute_rain");
      this.showNotice("Le ciel s'assombrit. La pluie prend l'air au mot.", 200);
      return;
    }
    if (id === "couchant") {
      const before = this.clock.day;
      this.clock.waitUntil("soir");
      this.lastScheduleHour = -1;
      this.reloadNpcs();
      if (this.clock.day !== before) this.populate();
      this.showNotice("Trois notes, et le jour bascule. Il est 19h.", 200);
      return;
    }
    // L'air du chat : le familier arrive où que l'on soit, et suit s'il est
    // déjà des vôtres.
    this.familiar = new LanternCat({ x: this.player.position.x + 40, y: this.player.position.y });
    if (this.flags.has("cat_follows")) this.familiar.follow(this.player.position);
    this.showNotice("Un miaulement, une lueur : le Chat-Lanterne vous a entendue.", 200);
  }

  // — La poste aux pigeons —————————————————————————————————————

  private openPostMenu(): void {
    this.choiceContext = "post";
    const waiting = this.post.collect(this.clock.day);
    if (waiting) {
      this.inventory.add(waiting.item, waiting.count);
      this.particles.emit(this.player.position.x + 8, this.player.position.y, "spark", 18);
      this.audio.playSfx("secret");
      this.floaters.reward(this.player.position.x + 8, this.player.position.y - 6,
        `${ITEMS[waiting.item].name} ×${waiting.count}`);
      this.textBox.open(waiting.text, waiting.from, "colombin");
      this.journal.noteSecret("post", "La poste aux pigeons",
        "Un objet confié le matin revient transformé le lendemain.", this.clock.day);
      return;
    }
    if (this.post.pending) {
      this.textBox.open(this.post.status(this.clock.day), "Colombin", "colombin");
      return;
    }
    const sendable = this.inventory.snapshot()
      .filter((entry) => acceptedByPost(entry.id))
      .slice(0, 5);
    if (sendable.length === 0) {
      this.textBox.open("« Rien dans votre sac ne trouverait preneur. Revenez chargée. »",
        "Colombin", "colombin");
      return;
    }
    this.choices.open("CONFIER AU PIGEON", [
      ...sendable.map((entry) => ({
        id: `send:${entry.id}`, label: ITEMS[entry.id].name, note: `×${entry.count}`,
      })),
      { id: "cancel", label: "Garder son sac" },
    ]);
  }

  private resolvePostChoice(choice: string): void {
    if (!choice.startsWith("send:")) return;
    const item = choice.slice(5) as ItemId;
    if (!this.inventory.remove(item)) return;
    if (!this.post.send(item, this.clock.day)) {
      this.inventory.add(item);
      return;
    }
    this.particles.emit(this.player.position.x + 8, this.player.position.y - 8, "smoke", 12);
    this.audio.playSfx("secret");
    this.showNotice("Le pigeon part vers le nord. Repassez demain.", 190);
  }

  // — Le potager ————————————————————————————————————————————

  private openPlotMenu(index: number): void {
    this.choiceContext = "plot";
    this.plotIndex = index;
    const day = this.clock.day;
    const status = this.garden.status(index, day);
    const seeds = CROPS.filter((crop) => this.inventory.count(crop.seed) > 0);
    const canWater = this.inventory.count("watering_can") > 0;

    this.choices.open(`PLANCHE ${index + 1} — ${status.toUpperCase()}`, [
      ...seeds.map((crop) => ({
        id: `sow:${crop.seed}`,
        label: `Semer : ${crop.name}`,
        note: `${crop.days} j · ${crop.season}`,
        disabled: status !== "vide",
      })),
      {
        id: "water", label: "Arroser",
        note: canWater ? (status === "assoiffée" ? "elle en réclame" : "un peu d'eau") : "pas d'arrosoir",
        disabled: !canWater || status === "vide",
      },
      {
        id: "harvest", label: "Récolter",
        note: status === "mûre" ? "prête" : "pas encore",
        disabled: status !== "mûre",
      },
      { id: "cancel", label: "Laisser pousser" },
    ]);
  }

  private resolvePlotChoice(choice: string): void {
    const day = this.clock.day;
    const index = this.plotIndex;
    if (choice.startsWith("sow:")) {
      const seed = choice.slice(4) as ItemId;
      const crop = cropBySeed(seed);
      if (!crop || !this.inventory.remove(seed)) return;
      this.garden.sow(index, crop, day);
      this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "leaf", 10);
      this.audio.playSfx("pickup");
      this.showNotice(`${crop.name} semée. ${crop.days} jour(s) et de l'eau.`, 180);
      this.journal.noteSecret("potager", "Le potager de Sévère",
        "Six planches au Hameau Sud. Semer, arroser, récolter — la pluie compte pour un arrosage.",
        day);
      return;
    }
    if (choice === "water") {
      if (!this.garden.water(index, day)) {
        this.showNotice("Cette planche a eu son eau aujourd'hui.", 150);
        this.audio.playSfx("deny");
        return;
      }
      this.particles.emit(this.player.position.x + 8, this.player.position.y + 10, "bubble", 8);
      this.audio.playSfx("splash");
      this.showNotice("L'eau pénètre lentement. C'est bon signe.", 150);
      return;
    }
    if (choice !== "harvest") return;
    const picked = this.garden.harvest(index, day, this.clock.season);
    if (!picked) return;
    this.inventory.add(picked.crop.harvest, picked.count);
    this.floaters.reward(this.player.position.x + 8, this.player.position.y - 6,
      `${ITEMS[picked.crop.harvest].name} ×${picked.count}`);
    this.particles.emit(this.player.position.x + 8, this.player.position.y, "leaf", 16);
    this.audio.playSfx("secret");
    this.showNotice(picked.crop.season === this.clock.season
      ? picked.crop.line
      : `${picked.crop.line} La saison n'y était pas : la récolte est maigre.`, 200);
  }

  /** La pluie arrose le potager une fois par jour, sans qu'on y soit. */
  private waterGardenWithRain(): void {
    if (this.lastRainDay === this.clock.day) return;
    this.lastRainDay = this.clock.day;
    const soaked = this.garden.rainfall(this.clock.day, this.clock.weather);
    if (soaked > 0 && this.currentZone()?.id === "hameau_sud") {
      this.showNotice(`La pluie a arrosé ${soaked} planche(s) pour vous.`, 170);
    }
  }

  // — Les fêtes ——————————————————————————————————————————————

  /**
   * Fête du jour. Le jour de jeu s'affichait sans jamais rien signifier :
   * quatre fois par cycle, il désigne un lieu où quelque chose se passe.
   */
  private checkFestival(): void {
    const zone = this.currentZone();
    if (!zone || this.indoors) return;
    const festival = festivalAt(zone.id, this.clock.season, this.clock.dayOfSeason);
    if (!festival || this.lastFestival === `${festival.id}:${this.clock.day}`) return;
    this.lastFestival = `${festival.id}:${this.clock.day}`;
    this.hud.announce(festival.name.toUpperCase(), "aujourd'hui");
    this.showNotice(festival.announce, 260);
    if (this.flags.has(`festival:${festival.id}`)) return;
    this.flags.set(`festival:${festival.id}`);
    this.inventory.add(festival.gift.item, festival.gift.count);
    this.textBox.open(festival.text, festival.name.toUpperCase());
    this.floaters.reward(this.player.position.x + 8, this.player.position.y - 6,
      `${ITEMS[festival.gift.item].name} ×${festival.gift.count}`);
    this.audio.playSfx("secret");
    this.journal.noteSecret(`festival:${festival.id}`, festival.name,
      festival.text, this.clock.day);
    this.checkRankUp();
  }

  // — Voyage entre puits ————————————————————————————————————

  /**
   * Le réseau des puits.
   *
   * La vallée fait quatre-vingt-dix régions et l'on traverse la même forêt
   * pour la vingtième fois. Un puits déjà touché devient une destination :
   * c'est le seul raccourci du jeu, et il se mérite région par région.
   */
  private openTravelMenu(): void {
    this.choiceContext = "travel";
    const here = this.camera.zone;
    const known = WORLD_ZONES.filter((zone) =>
      this.flags.has(`well:${zone.id}`) && !(zone.x === here.x && zone.y === here.y));
    if (known.length === 0) {
      this.showNotice("Vous n'avez encore bu qu'à ce puits-ci.", 170);
      this.audio.playSfx("deny");
      return;
    }
    this.choices.open("PARTIR D'UN TRAIT", [
      ...known.slice(0, 8).map((zone) => ({
        id: `go:${zone.x},${zone.y}`,
        label: zone.name,
        note: zone.safe ? "refuge" : "à découvert",
      })),
      { id: "cancel", label: "Rester ici" },
    ]);
  }

  private resolveTravelChoice(choice: string): void {
    if (!choice.startsWith("go:")) return;
    const [x, y] = choice.slice(3).split(",").map(Number);
    if (x === undefined || y === undefined) return;
    this.textBox.close();
    this.transition.start(() => {
      this.camera.zone = { x, y };
      this.player.position = { x: ZONE_WIDTH / 2, y: ZONE_HEIGHT / 2 };
      this.loadZoneObjects();
      this.player.unstick();
      this.camera.snapTo(this.player.position);
      this.mapScreen.reveal(this.camera.zone);
      this.announceZone();
      this.audio.playSfx("secret");
      this.showNotice("L'eau des puits communique. Vous aussi, maintenant.", 190);
    });
  }

  // — Teintures ——————————————————————————————————————————————

  private openDyeMenu(): void {
    this.choiceContext = "dye";
    const dyes: readonly { id: string; label: string; note: string }[] = [
      { id: "dye:garance", label: "Garance", note: "rouge profond" },
      { id: "dye:guede", label: "Guède", note: "bleu d'orage" },
      { id: "dye:safran", label: "Safran", note: "jaune de midi" },
      { id: "dye:none", label: "Retour au vert d'origine", note: "" },
    ];
    this.choices.open("TEINDRE LE MANTEAU", [
      ...dyes.map((dye) => ({ ...dye, disabled: this.inventory.count("dye_pot") === 0 })),
      { id: "cancel", label: "Garder celui-là" },
    ]);
  }

  private resolveDyeChoice(choice: string): void {
    if (!choice.startsWith("dye:")) return;
    if (!this.inventory.remove("dye_pot")) return;
    const tone = choice.slice(4);
    for (const flag of ["dye:garance", "dye:guede", "dye:safran"]) this.flags.delete(flag);
    if (tone !== "none") this.flags.set(`dye:${tone}`);
    this.player.cloak = tone === "none" ? null : tone;
    this.particles.emit(this.player.position.x + 8, this.player.position.y + 8, "spark", 14);
    this.audio.playSfx("secret");
    this.showNotice(tone === "none"
      ? "Le manteau retrouve son vert de départ."
      : `Le manteau prend la teinte : ${tone}.`, 170);
  }

  // — Kerdec, maître d'armes ————————————————————————————————

  private openKerdecMenu(): void {
    this.choiceContext = "kerdec";
    const next = nextTechnique((flag) => this.flags.has(flag));
    const known = knownTechniques((flag) => this.flags.has(flag));
    if (!next) {
      this.textBox.open("« Je n'ai plus rien. Va t'en servir, c'est tout ce qui reste. »",
        "Kerdec le Manchot", "kerdec");
      return;
    }
    this.choices.open(`LEÇON — ${known.length}/${TECHNIQUES.length}`, [
      {
        id: "learn", label: next.name,
        note: this.player.rupees >= next.price ? `${next.price} r` : `manque ${next.price - this.player.rupees} r`,
        disabled: this.player.rupees < next.price,
      },
      { id: "ask", label: "Demander à quoi ça sert", note: "" },
      { id: "cancel", label: "Saluer et partir" },
    ]);
  }

  private resolveKerdecChoice(choice: string): void {
    const next = nextTechnique((flag) => this.flags.has(flag));
    if (!next) return;
    if (choice === "ask") {
      this.textBox.open(`${next.trigger} ${next.effect}`, "Kerdec le Manchot", "kerdec");
      return;
    }
    if (choice !== "learn" || this.player.rupees < next.price) return;
    this.player.rupees -= next.price;
    this.flags.set(next.learnedFlag);
    this.player.techniques.add(next.id);
    this.audio.playSfx("secret");
    this.particles.emit(this.player.position.x + 8, this.player.position.y, "ring", 16);
    this.showNotice(`${next.name.toUpperCase()} apprise — ${next.trigger}`, 260);
    this.textBox.open(next.lesson, "Kerdec le Manchot", "kerdec");
    this.journal.noteSecret(`lesson:${next.id}`, next.name,
      `${next.trigger} ${next.effect}`, this.clock.day);
  }

  private blessFromFamiliar(): void {
    const alreadyBlessed = this.flags.has("lantern_cat_blessing");
    this.flags.set("lantern_cat_blessing");
    this.player.hearts = this.player.maxHearts;
    this.player.stamina = 100;
    // Un poisson fumé achète sa fidélité : il quitte son perchoir et suit.
    if (this.inventory.count("smoked_fish") > 0 && !this.flags.has("cat_follows")) {
      this.inventory.remove("smoked_fish");
      this.flags.set("cat_follows");
      this.familiar!.follow(this.player.position);
      this.showNotice("Le Chat-Lanterne avale le poisson et vous emboîte le pas.", 240);
      this.journal.noteSecret("chat", "Le Chat-Lanterne",
        "Un poisson fumé et il vous suit. Il lâche une flammèche sur ce qui approche.",
        this.clock.day);
    }
    this.textBox.open(this.familiar!.blessingMessage(alreadyBlessed), "Chat-Lanterne", "chat");
    this.showNotice("La bénédiction féline restaure tous vos cœurs.", 120);
    this.particles.emit(this.familiar!.position.x + 8, this.familiar!.position.y + 8, "heal", 18);
    this.audio.playSfx("secret");
  }

  /**
   * Liane.
   *
   * Deux répliques avant qu'elle ne se décide, puis elle suit — sans jamais
   * s'effacer au changement de région, contrairement au Chat-Lanterne. Une
   * fois recrutée, la même touche fait juste tourner son bavardage.
   */
  private talkToLiane(): void {
    const liane = this.companion;
    if (!liane) return;
    if (liane.isFollowing) {
      this.textBox.open(liane.nextBanter(), "Liane", "liane");
      return;
    }
    if (!this.flags.has("liane_met")) {
      this.flags.set("liane_met");
      this.textBox.open(
        "« ...Vous voyez encore la lumière ? Je suis restée ici pendant que l'Arbre-Mère "
        + "rêvait de racines. Je crois qu'elle m'a oubliée, en se réveillant. »",
        "Liane", "liane");
      return;
    }
    this.flags.set("liane_recruited");
    liane.follow(this.player.position);
    this.quests.notify("talkTo", "liane", this.frame);
    this.audio.playSfx("secret");
    this.particles.emit(liane.position.x + 8, liane.position.y + 8, "leaf", 16);
    this.journal.notePerson("liane", "Liane",
      "Une graine de l'Arbre-Mère, oubliée sous la Cime. Elle vous suit, désormais.",
      this.clock.day);
    this.textBox.open(
      "« Alors je viens. Je n'ai jamais vu la vallée d'en haut — juste ses racines. »",
      "Liane", "liane");
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
    if (purchase.entry.flag === "satchel_upgraded") this.inventory.setRoomy(true);
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
    // La flûte ne se consomme pas : elle ouvre son répertoire. C'est aussi le
    // seul endroit où l'on pense à la chercher, faute d'une touche libre.
    if (id === "willow_flute") {
      this.menu.active = false;
      this.openFluteMenu();
      return;
    }
    if (id === "dye_pot") {
      this.menu.active = false;
      this.openDyeMenu();
      return;
    }
    if (id === "tinder_kit") {
      this.menu.active = false;
      if (this.indoors || this.player.sailing) {
        this.showNotice("Pas de feu ici. Il faut de la terre sous les pieds.", 150);
        this.audio.playSfx("deny");
        return;
      }
      this.openCampMenu();
      return;
    }
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
      this.hud.announce(this.fortress.name,
        id === "racines_creuses" ? "Ce que l'Arbre-Mère laisse derrière elle" : "Trois portes, trois clés");
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

    // Les Racines Creuses : la Gardienne se réveille dans sa salle, et Liane
    // n'existe que dans la sienne tant qu'elle n'a pas choisi de vous suivre.
    this.hollowBoss = (definition.id === "racines_creuses" && room.kind === "boss"
      && !this.flags.has("hollow_guardian_felled")) ? new HollowGuardian(this.player) : null;
    if (this.companion && !this.companion.isFollowing) this.companion = null;
    if (definition.id === "racines_creuses" && room.x === 0 && room.y === 0
      && !this.flags.has("liane_recruited")) {
      this.companion = new Companion({ x: 120, y: 96 });
      this.showNotice("Quelque chose remue entre les racines, au fond de la salle.", 200);
    }
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

  /** Chaque donjon a sa propre clé : Vertepierre ne doit rien aux Racines. */
  private dungeonKeyItem(): ItemId {
    return this.fortress.definition?.id === "racines_creuses" ? "root_key" : "fortress_key";
  }

  private dungeonKeyName(): string {
    return this.fortress.definition?.id === "racines_creuses" ? "Clé-Racine" : "clé de Vertepierre";
  }

  /**
   * « Agir » dans une forteresse : sortir par la herse d'entrée, ou ouvrir une
   * porte verrouillée si l'on porte une clé.
   */
  private interactInFortress(): void {
    if (this.companion && this.companion.distanceTo(this.player.position) <= 34) {
      this.talkToLiane();
      return;
    }
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

    if (!this.inventory.remove(this.dungeonKeyItem())) {
      this.showNotice(`La herse est verrouillée. Il faudrait une ${this.dungeonKeyName()}.`, 160);
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
      this.inventory.add(this.dungeonKeyItem());
      this.floaters.reward(this.player.position.x + 8, this.player.position.y - 8,
        ITEMS[this.dungeonKeyItem()].name);
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
      tide: this.clock.tide,
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
    // Un identifiant de variante n'est pas un sous-titre : « v_niveau_bas »
    // s'affichait tel quel sous le nom de la région.
    const danger = zone.safe ? "Refuge" : `Menace ${"·".repeat(Math.max(1, zone.danger))}`;
    this.hud.announce(zone.name, VARIANT_LABELS[variant] ?? danger);

    // La région passe au carnet à la première traversée. C'est le relevé de
    // terrain : ce qu'on a vu, à quelle heure, par quel temps.
    const fresh = this.journal.noteRegion(zone.id, zone.name,
      `${zone.safe ? "Refuge." : `Menace ${zone.danger}/3.`} Relevée ${this.clock.phase}, `
      + `${this.clock.weather === "rain" ? "sous la pluie" : "par temps clair"}.`,
      this.clock.day);
    if (fresh) this.checkRankUp();
  }

  /** Annonce un titre franchi. Le carnet décerne, le récit se tait. */
  private checkRankUp(): void {
    const rank = this.journal.rank;
    if (this.flags.has(`rank:${rank.title}`) || rank.at === 0) return;
    this.flags.set(`rank:${rank.title}`);
    this.showNotice(`TITRE : ${rank.title.toUpperCase()} — ${rank.motto}`, 280);
    this.audio.playSfx("secret");
    this.particles.emit(this.player.position.x + 8, this.player.position.y, "spark", 20);
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

  /**
   * Refait la carte quand la mer a bougé pour de bon.
   *
   * On ne régénère pas à chaque frame : seul un franchissement de palier — la
   * grève se découvre, ou l'eau revient — vaut une reconstruction. Le joueur
   * n'est jamais déplacé, et comme la marée ne fait qu'ajouter du praticable
   * en descendant, on ne peut pas se retrouver noyé dans un mur.
   */
  private refreshTideIfNeeded(): void {
    const zone = this.currentZone();
    if (!zone || this.indoors || this.transition.active) return;
    if (!TIDAL_ZONES.has(zone.id)) return;
    const level = this.clock.tideLevel;
    const band = (value: number): number => value < 0.25 ? 0 : value < 0.4 ? 1 : value < 0.6 ? 2 : 3;
    if (band(level) === band(this.tideLevelOfMap)) return;
    const rising = level > this.tideLevelOfMap;
    this.tideLevelOfMap = level;
    this.useMap(new TileMap(createZoneMap(zone, level), this.tileSet));
    // En remontant, la mer peut reprendre la case où l'on se tenait.
    this.player.unstick();
    this.showNotice(rising
      ? "La mer remonte sur l'estran."
      : "La mer se retire. Le sable apparaît.", 170);
  }

  private refreshScheduleIfNeeded(): void {
    this.refreshTideIfNeeded();
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
      this.useMap(new TileMap(createZoneMap(zone, this.clock.tideLevel), this.tileSet));
      this.tideLevelOfMap = this.clock.tideLevel;
    }
    this.interactables = zone
      ? ALL_INTERACTABLES.filter((data) => data.zone === zone.id)
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
      (flag) => this.flags.has(flag), this.clock.tide);
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
      this.hollowBoss = null;
      this.hud.announce(INTERIOR_NAMES[kind]);
      // Chaque lieu dit ce qu'il est. La cascade retombait sur la réplique du
      // Château, si bien qu'on entrait dans la Bibliothèque en lisant que les
      // Gardes de Cendre fermaient les rangs.
      const arrivals: Readonly<Record<InteriorKind, string>> = {
        cottage: "Le tapis rouge et le feu rendent la pièce accueillante.",
        hermitage: "L'ermitage sent la pierre chaude, le bois et les cartes anciennes.",
        tower: "Les fioles tintent. Maëlis et son Chat-Lanterne vous observent.",
        library: "L'eau court entre les rayonnages. Le papier a tenu, allez savoir comment.",
        orchard: "Les poires de nuit pèsent aux branches. Elles n'étaient pas là ce matin.",
        strand_cave: "Le sable est encore mouillé. La mer reviendra la chercher.",
        castle: this.flags.has("half_demon_skull")
          ? "Le château vaincu résonne encore de votre ancienne bataille."
          : "Les Gardes de Cendre ferment les rangs devant le trône.",
      };
      this.showNotice(arrivals[kind], 150);
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
    // Mourir dans un donjon ne devait pas laisser sa progression à moitié en
    // suspens : sans ce retrait, la région rechargée croyait encore être une
    // salle de forteresse et refusait toute interaction du dehors.
    this.fortress.leave();
    this.camera.zone = { ...point.zone };
    this.player.position = { x: point.x, y: point.y };
    this.projectiles = [];
    this.pickups = [];
    this.boss = null;
    this.hollowBoss = null;
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
    this.hollowBoss = null;
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
      journal: this.journal.snapshot(),
      campfires: this.campfires.snapshot(),
      post: this.post.snapshot(),
      garden: this.garden.snapshot(),
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
    this.journal.restore(data.journal);
    this.campfires.restore(data.campfires);
    this.post.restore(data.post);
    this.garden.restore(data.garden);
    // Ce qui n'est pas dans le sac se relit dans les drapeaux.
    this.inventory.setRoomy(this.flags.has("satchel_upgraded"));
    this.player.hasShield = this.inventory.count("oak_shield") > 0;
    this.player.mounted = this.inventory.count("mule_bridle") > 0;
    this.player.cloak = ["garance", "guede", "safran"]
      .find((tone) => this.flags.has(`dye:${tone}`)) ?? null;
    this.progression.apply(this.player);
    this.quests.refresh();
    // Liane ne se rappelle pas au son d'une flûte : une fois recrutée, une
    // sauvegarde rechargée la retrouve déjà à vos côtés.
    if (this.flags.has("liane_recruited")) {
      this.companion = new Companion({ x: this.player.position.x - 24, y: this.player.position.y });
      this.companion.follow(this.player.position);
    }
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

    this.map.drawBase(ctx, this.camera, this.frame, WIND_VECTORS[this.clock.wind]);
    this.drawSortedEntities(ctx);
    this.map.drawOver(ctx, this.camera, this.frame, WIND_VECTORS[this.clock.wind]);
    const ptx = Math.floor(this.player.position.x / 16);
    const pty = Math.floor((this.player.position.y - 8) / 16);
    const overTileId = this.map.tileAt("decor_above", ptx, pty);
    const kind = this.tileSet.properties(overTileId).kind;
    if (kind !== "empty") {
       this.player.drawSilhouette(ctx);
    }
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

    this.combat.drawFlash(ctx);
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
    // Les feux allumés par le joueur : ils ne viennent pas des données du
    // monde, donc ils ne passent pas par la liste des objets interactifs.
    const zone = this.currentZone();
    if (zone && !this.indoors) {
      const now = Campfires.absoluteHour(this.clock.day, this.clock.hour, this.clock.minute);
      for (const fire of this.campfires.in(zone.id, now)) {
        if (!this.camera.isVisible(fire.x, fire.y, 16, 16)) continue;
        drawables.push({
          entity: { draw: (target) => this.drawCampfire(target, fire.x, fire.y) },
          y: fire.y + 14,
        });
      }
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
    if (this.companion) drawables.push({ entity: this.companion, y: this.companion.position.y + 16 });
    if (this.boss?.active) drawables.push({ entity: this.boss, y: this.boss.position.y + 74 });
    if (this.hollowBoss?.active) {
      drawables.push({ entity: this.hollowBoss, y: this.hollowBoss.position.y + 62 });
    }
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

  /** Un feu de bivouac : bûches croisées, flamme qui bat, cercle de pierres. */
  private drawCampfire(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.fillStyle = PALETTE.stoneDark;
    for (const [dx, dy] of [[-1, 12], [4, 14], [10, 13], [14, 11]] as const) {
      ctx.fillRect(x + dx, y + dy, 3, 2);
    }
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x + 1, y + 9, 14, 3);
    ctx.fillRect(x + 4, y + 6, 8, 3);
    const beat = Math.floor(this.frame / 5) % 3;
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(x + 4, y - beat, 8, 9 + beat);
    ctx.fillStyle = PALETTE.yellow;
    ctx.fillRect(x + 5, y + 2 - beat, 6, 6);
    ctx.fillStyle = PALETTE.cream;
    ctx.fillRect(x + 7, y + 4 - beat, 2, 3);
    ctx.restore();
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
    // Un bivouac doit se voir de loin dans le noir : c'est ce qui le rend
    // utile, et ce qui donne envie d'en allumer un avant la nuit.
    if (zone && !this.indoors) {
      const now = Campfires.absoluteHour(this.clock.day, this.clock.hour, this.clock.minute);
      for (const fire of this.campfires.in(zone.id, now)) {
        lights.push({ x: fire.x + 8, y: fire.y + 8, radius: 118, color: "#ffb45a" });
      }
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
    if (this.companion) {
      lights.push({ x: this.companion.position.x + 8, y: this.companion.position.y + 8,
        radius: 64, color: "#7cffc4" });
    }
    if (this.boss?.active && this.boss.isBurning) {
      lights.push({ x: this.boss.position.x + 32, y: this.boss.position.y + 34,
        radius: 150, color: "#ff8a3c" });
    } else if (this.boss?.active && this.boss.isExposed) {
      lights.push({ x: this.boss.position.x + 32, y: this.boss.position.y + 40,
        radius: 120, color: "#ffe07a" });
    }
    if (this.hollowBoss?.active && this.hollowBoss.isExposed) {
      lights.push({ x: this.hollowBoss.position.x + 24, y: this.hollowBoss.position.y + 34,
        radius: 110, color: "#7cffc4" });
    }

    const denseForest = zone?.id === "lisiere_carrefour" && !this.flags.has("lantern");
    this.lighting.draw(this.renderer, this.camera, lights, {
      frame: this.frame,
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
    const fighting = this.boss?.active === true || this.dragon?.active === true
      || this.hollowBoss?.active === true;
    if (fighting) this.hud.clearAnnouncement();
    const heading = waypoint && !this.indoors
      ? { dx: waypoint.zone.x - this.camera.zone.x, dy: waypoint.zone.y - this.camera.zone.y }
      : null;
    this.hud.draw(this.renderer, this.player, this.clock,
      interiorName ?? zone?.name ?? "INCONNU",
      fighting ? undefined : this.quests.activeObjective()?.hint,
      heading,
      !this.indoors && zone !== null && TIDAL_ZONES.has(zone.id));
    if (!this.indoors && !this.menu.active) {
      this.mapScreen.drawMini(ctx, this.camera.zone, VIEW_WIDTH - 74, VIEW_HEIGHT - 70,
        waypoint?.zone, this.frame);
    }
    if (this.boss?.active) this.drawBossBar();
    if (this.dragon?.active) this.drawDragonBar();
    if (this.hollowBoss?.active) this.drawHollowGuardianBar();

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
      this.camera.zone, waypoint?.zone, waypoint?.label, this.frame, this.journal);
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

  private drawHollowGuardianBar(): void {
    const { ctx } = this.renderer;
    const guardian = this.hollowBoss!;
    const width = 200;
    const x = (VIEW_WIDTH - width) / 2;
    ctx.save();
    drawText(ctx, "LA GARDIENNE DES RACINES", VIEW_WIDTH / 2, 24, {
      color: "#7cffc4", align: "center", outline: "rgba(10,8,16,0.9)", shadow: null,
    });
    ctx.fillStyle = "rgba(10,8,16,0.8)";
    ctx.fillRect(x - 2, 38, width + 4, 8);
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(x, 40, width, 4);
    ctx.fillStyle = guardian.isExposed ? PALETTE.yellow : PALETTE.wood;
    ctx.fillRect(x, 40, Math.round(width * guardian.healthRatio), 4);
    if (guardian.isExposed) {
      drawText(ctx, "LE CŒUR EST OUVERT", VIEW_WIDTH / 2, 48, { color: PALETTE.yellow, align: "center" });
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
