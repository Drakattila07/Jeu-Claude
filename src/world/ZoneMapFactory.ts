import type { Biome, WorldZoneData } from "../data/world";
import { INTERACTABLES } from "../data/interactables";
import type { LayerName, TiledLayer, TiledMapData } from "./TileMap";
import { TILE, TileSet } from "./TileSet";
import { ZONE_TILES_X, ZONE_TILES_Y, TILE_SIZE } from "../core/Renderer";
import type { Edge } from "../core/Camera";
import {
  EDGES, fbm, gatewayCenter, gatewayFor, isRoadEdge, isWaterEdge, neighbourOf,
  randomAt, zoneSeed,
} from "./WorldGen";

const W = ZONE_TILES_X;
const H = ZONE_TILES_Y;

/** Points du monde qui doivent rester praticables et reliés au reste. */
export interface ZoneAnchor {
  readonly x: number;
  readonly y: number;
  /** `door` fait naître un bâtiment autour ; `well` pose un puits. */
  readonly kind: "plain" | "door" | "well";
}

interface Grid {
  readonly ground: number[];
  readonly terrain: number[];
  readonly below: number[];
  readonly above: number[];
  /** Tuiles que rien ne doit jamais boucher. */
  readonly guarded: Uint8Array;
  readonly seed: number;
  readonly zone: WorldZoneData;
}

function index(x: number, y: number): number { return y * W + x; }
function inBounds(x: number, y: number): boolean { return x >= 0 && y >= 0 && x < W && y < H; }

function makeGrid(zone: WorldZoneData): Grid {
  return {
    ground: new Array<number>(W * H).fill(TILE.grass),
    terrain: new Array<number>(W * H).fill(0),
    below: new Array<number>(W * H).fill(0),
    above: new Array<number>(W * H).fill(0),
    guarded: new Uint8Array(W * H),
    seed: zoneSeed(zone),
    zone,
  };
}

function guard(grid: Grid, x: number, y: number): void {
  if (inBounds(x, y)) grid.guarded[index(x, y)] = 1;
}

function isGuarded(grid: Grid, x: number, y: number): boolean {
  return inBounds(x, y) && grid.guarded[index(x, y)] === 1;
}

/** Pose un obstacle, sauf sur une case protégée. */
function block(grid: Grid, x: number, y: number, tile: number): void {
  if (!inBounds(x, y) || isGuarded(grid, x, y)) return;
  grid.terrain[index(x, y)] = tile;
}

function decorate(grid: Grid, x: number, y: number, tile: number): void {
  if (!inBounds(x, y) || isGuarded(grid, x, y)) return;
  if (grid.terrain[index(x, y)] !== 0) return;
  grid.below[index(x, y)] = tile;
}

function clearTile(grid: Grid, x: number, y: number): void {
  if (!inBounds(x, y)) return;
  // Une porte est le point d'entrée d'un bâtiment : la déblayer ferait
  // disparaître le seul endroit où le joueur peut appuyer sur « agir ».
  if (grid.terrain[index(x, y)] === TILE.door) return;
  grid.terrain[index(x, y)] = 0;
  grid.below[index(x, y)] = 0;
  grid.above[index(x, y)] = 0;
}

// — Sols ————————————————————————————————————————————————————

interface GroundRecipe {
  readonly base: number;
  readonly accent: number;
  readonly rare: number;
  readonly road: number;
}

function groundRecipe(biome: Biome): GroundRecipe {
  switch (biome) {
    case "peaks": return { base: TILE.scree, accent: TILE.snow, rare: TILE.alpineGrass, road: TILE.gravel };
    case "cliffs": return { base: TILE.scree, accent: TILE.alpineGrass, rare: TILE.heather, road: TILE.gravel };
    case "forest": return { base: TILE.forestFloor, accent: TILE.grassAlt, rare: TILE.grass, road: TILE.path };
    case "ruins": return { base: TILE.cobble, accent: TILE.crackedPath, rare: TILE.grassAlt, road: TILE.crackedPath };
    case "canal": return { base: TILE.crackedPath, accent: TILE.gravel, rare: TILE.pebbles, road: TILE.gravel };
    case "marsh": return { base: TILE.marshGrass, accent: TILE.mud, rare: TILE.heather, road: TILE.mud };
    case "reeds": return { base: TILE.mud, accent: TILE.marshGrass, rare: TILE.shoreSand, road: TILE.dock };
    case "witch": return { base: TILE.heather, accent: TILE.mud, rare: TILE.grassAlt, road: TILE.path };
    case "fields": return { base: TILE.dryGrass, accent: TILE.grass, rare: TILE.crop, road: TILE.path };
    case "lake": return { base: TILE.shoreSand, accent: TILE.grass, rare: TILE.pebbles, road: TILE.path };
    case "river": return { base: TILE.grass, accent: TILE.shoreSand, rare: TILE.grassAlt, road: TILE.path };
    default: return { base: TILE.grass, accent: TILE.grassAlt, rare: TILE.flowers, road: TILE.path };
  }
}

/**
 * Fréquence du bruit qui choisit la matière du sol.
 *
 * À 0,11, le tirage changeait pratiquement d'une tuile à l'autre : le sol se
 * lisait comme un damier de confettis, surtout en montagne. À 0,045 une plaque
 * couvre une quinzaine de tuiles — on voit des clairières, des congères et des
 * bancs de sable, c'est-à-dire des lieux.
 */
const GROUND_FREQUENCY = 0.045;
/** Second champ, plus fin, réservé aux ponctuations rares. */
const DETAIL_FREQUENCY = 0.09;

/**
 * Sol d'une tuile.
 *
 * Une matière domine largement, la deuxième forme des plaques franches, la
 * troisième n'est qu'une ponctuation. Les deux champs de bruit sont continus :
 * deux tuiles voisines tombent presque toujours dans la même plaque.
 */
function groundTile(biome: Biome, x: number, y: number, seed: number): number {
  const recipe = groundRecipe(biome);
  const patch = fbm(x, y, seed, GROUND_FREQUENCY);
  const detail = fbm(x, y, seed ^ 0x2c9f, DETAIL_FREQUENCY);

  if (biome === "peaks") {
    // Étagement franc du haut vers le bas, avec une limite qui ondule : une
    // ligne droite trahirait la grille.
    const altitude = (y + (patch - 0.5) * 7) / (H - 1);
    if (altitude < 0.3) return detail > 0.74 ? TILE.scree : TILE.snow;
    if (altitude < 0.46) return detail > 0.66 ? TILE.snowdrift : TILE.snow;
    if (altitude < 0.7) return detail > 0.78 ? TILE.snowdrift : TILE.scree;
    if (altitude < 0.86) return detail > 0.72 ? TILE.heather : TILE.alpineGrass;
    return detail > 0.8 ? TILE.scree : TILE.alpineGrass;
  }

  if (patch > 0.6) return recipe.accent;
  if (detail > 0.84) return recipe.rare;
  return recipe.base;
}

/**
 * Fondu de biome sur les bords : la matière de la voisine s'invite peu à peu.
 * Sans ce dégradé, franchir une frontière donnait une couture nette de forêt
 * contre montagne, comme deux papiers peints collés bout à bout. Le seuil suit
 * le bruit et non un tirage par tuile, sinon la couture se remplaçait par un
 * moucheté tout aussi voyant.
 */
function blendedGround(zone: WorldZoneData, x: number, y: number, seed: number): number {
  const own = groundTile(zone.biome, x, y, seed);
  // Quatre cases suffisent à coudre deux biomes : à six, un hameau bordé de
  // trois rives se retrouvait couvert de sable jusqu'au centre.
  const depth = 4;
  const candidates: { readonly edge: Edge; readonly distance: number }[] = [
    { edge: "west", distance: x },
    { edge: "east", distance: W - 1 - x },
    { edge: "north", distance: y },
    { edge: "south", distance: H - 1 - y },
  ];
  for (const candidate of candidates) {
    if (candidate.distance >= depth) continue;
    const neighbour = neighbourOf(zone, candidate.edge);
    if (!neighbour || neighbour.biome === zone.biome) continue;
    const strength = 1 - candidate.distance / depth;
    const edge = fbm(x, y, seed ^ 0x51f3, 0.07);
    if (edge < strength * 0.85) return groundTile(neighbour.biome, x, y, seed);
  }
  return own;
}

// — Ceinture et passages ———————————————————————————————————————

function barrierTile(biome: Biome): number {
  switch (biome) {
    case "peaks": return TILE.crag;
    case "cliffs": return TILE.cliff;
    case "forest": return TILE.treeCrown;
    case "witch": return TILE.deadTree;
    case "ruins": return TILE.ruinColumn;
    case "canal": return TILE.cliff;
    case "marsh":
    case "reeds": return TILE.reeds;
    case "lake":
    case "river": return TILE.boulder;
    case "fields": return TILE.hedge;
    case "village": return TILE.fence;
    default: return TILE.boulder;
  }
}

interface GateInfo { readonly edge: Edge; readonly center: number; readonly road: boolean }

function paintBorder(grid: Grid): readonly GateInfo[] {
  const barrier = barrierTile(grid.zone.biome);
  const gates: GateInfo[] = [];

  for (let x = 0; x < W; x += 1) {
    grid.terrain[index(x, 0)] = barrier;
    grid.terrain[index(x, H - 1)] = barrier;
  }
  for (let y = 0; y < H; y += 1) {
    grid.terrain[index(0, y)] = barrier;
    grid.terrain[index(W - 1, y)] = barrier;
  }

  for (const edge of EDGES) {
    const gateway = gatewayFor(grid.zone, edge);
    if (!gateway) continue;
    const center = gatewayCenter(gateway);
    gates.push({ edge, center, road: gateway.road });
    for (let offset = gateway.start; offset <= gateway.end; offset += 1) {
      if (offset < 1 || offset > (edge === "north" || edge === "south" ? W : H) - 2) continue;
      if (edge === "west") clearTile(grid, 0, offset);
      else if (edge === "east") clearTile(grid, W - 1, offset);
      else if (edge === "north") clearTile(grid, offset, 0);
      else clearTile(grid, offset, H - 1);
    }
  }
  return gates;
}

/** Point d'arrivée d'un passage, une tuile à l'intérieur de la ceinture. */
function gateAnchor(gate: GateInfo): { readonly x: number; readonly y: number } {
  if (gate.edge === "west") return { x: 1, y: gate.center };
  if (gate.edge === "east") return { x: W - 2, y: gate.center };
  if (gate.edge === "north") return { x: gate.center, y: 1 };
  return { x: gate.center, y: H - 2 };
}

function outerAnchor(gate: GateInfo): { readonly x: number; readonly y: number } {
  if (gate.edge === "west") return { x: 0, y: gate.center };
  if (gate.edge === "east") return { x: W - 1, y: gate.center };
  if (gate.edge === "north") return { x: gate.center, y: 0 };
  return { x: gate.center, y: H - 1 };
}

/** Trace un couloir praticable entre deux points, en L. */
function carve(grid: Grid, from: { x: number; y: number }, to: { x: number; y: number },
  halfWidth: number, groundTileId: number | null, horizontalFirst: boolean): void {
  const paint = (x: number, y: number): void => {
    for (let dy = -halfWidth; dy <= halfWidth; dy += 1) {
      for (let dx = -halfWidth; dx <= halfWidth; dx += 1) {
        const tx = x + dx;
        const ty = y + dy;
        if (!inBounds(tx, ty)) continue;
        clearTile(grid, tx, ty);
        guard(grid, tx, ty);
        if (groundTileId !== null && Math.abs(dx) <= halfWidth - 1 && Math.abs(dy) <= halfWidth - 1) {
          grid.ground[index(tx, ty)] = groundTileId;
        }
      }
    }
  };

  const corner = horizontalFirst ? { x: to.x, y: from.y } : { x: from.x, y: to.y };
  let cursor = { x: from.x, y: from.y };
  for (const target of [corner, to]) {
    while (cursor.x !== target.x || cursor.y !== target.y) {
      paint(cursor.x, cursor.y);
      if (cursor.x !== target.x) cursor = { x: cursor.x + Math.sign(target.x - cursor.x), y: cursor.y };
      else cursor = { x: cursor.x, y: cursor.y + Math.sign(target.y - cursor.y) };
    }
  }
  paint(to.x, to.y);
}

// — Cours d'eau ————————————————————————————————————————————

/**
 * Creuse un cours d'eau entre les bords aquatiques de la zone. Les rives
 * reçoivent du sable, et un gué de planches enjambe l'eau là où une route
 * doit passer.
 */
function carveWaterway(grid: Grid, gates: readonly GateInfo[]): void {
  const waterEdges = EDGES.filter((edge) => isWaterEdge(grid.zone, edge));
  if (waterEdges.length < 2) return;

  const points = waterEdges.map((edge) => {
    const gate = gates.find((candidate) => candidate.edge === edge);
    const center = gate?.center ?? Math.floor((edge === "north" || edge === "south" ? W : H) / 2);
    return outerAnchor({ edge, center, road: false });
  });

  const hub = { x: Math.floor(W / 2), y: Math.floor(H / 2) };
  for (const point of points) {
    let cursor = { x: point.x, y: point.y };
    const steps = Math.abs(hub.x - cursor.x) + Math.abs(hub.y - cursor.y);
    for (let step = 0; step <= steps; step += 1) {
      const wobble = Math.round((fbm(cursor.x * 2, cursor.y * 2, grid.seed ^ 0x2f11, 0.25) - 0.5) * 4);
      const radius = 2 + Math.round(fbm(cursor.x, cursor.y, grid.seed ^ 0x71, 0.2) * 1.6);
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const tx = cursor.x + dx + (Math.abs(dy) > Math.abs(dx) ? wobble : 0);
          const ty = cursor.y + dy;
          if (!inBounds(tx, ty)) continue;
          const distance = Math.hypot(dx, dy);
          if (distance > radius) continue;
          grid.ground[index(tx, ty)] = distance > radius - 1 ? TILE.water : TILE.deepWater;
          grid.terrain[index(tx, ty)] = 0;
          grid.below[index(tx, ty)] = 0;
        }
      }
      if (cursor.x !== hub.x && (step % 2 === 0 || cursor.y === hub.y)) {
        cursor = { x: cursor.x + Math.sign(hub.x - cursor.x), y: cursor.y };
      } else if (cursor.y !== hub.y) {
        cursor = { x: cursor.x, y: cursor.y + Math.sign(hub.y - cursor.y) };
      }
    }
  }

  // Berges sableuses au contact de la terre.
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      const id = grid.ground[index(x, y)]!;
      if (id === TILE.water || id === TILE.deepWater) continue;
      const touchesWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const tile = inBounds(x + dx!, y + dy!) ? grid.ground[index(x + dx!, y + dy!)] : 0;
        return tile === TILE.water || tile === TILE.deepWater;
      });
      if (touchesWater) grid.ground[index(x, y)] = TILE.shoreSand;
    }
  }
}

/** Remplace l'eau profonde par un pont partout où un couloir la traverse. */
function bridgeGuardedWater(grid: Grid): void {
  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) {
      if (!isGuarded(grid, x, y)) continue;
      const id = grid.ground[index(x, y)]!;
      if (id === TILE.deepWater || id === TILE.water) grid.ground[index(x, y)] = TILE.bridge;
    }
  }
}

// — Ambiances de biome ————————————————————————————————————————

/** Part de la zone couverte d'obstacles, une fois les clairières déduites. */
function scatterDensity(biome: Biome): number {
  switch (biome) {
    case "forest": return 0.62;
    // Les gradins rocheux fournissent déjà toute la structure en altitude :
    // y ajouter des blocs à la pelle ne faisait qu'un mur gris uniforme.
    case "peaks": return 0.18;
    case "cliffs": return 0.16;
    case "ruins": return 0.3;
    case "marsh": return 0.34;
    case "witch": return 0.4;
    case "reeds": return 0.3;
    case "lake": return 0.16;
    case "river": return 0.22;
    case "fields": return 0.14;
    case "canal": return 0.2;
    case "village": return 0.08;
    default: return 0.26;
  }
}

interface Furnishing {
  readonly obstacles: readonly number[];
  readonly decor: readonly number[];
}

function furnishingFor(biome: Biome): Furnishing {
  switch (biome) {
    case "forest": return {
      obstacles: [TILE.treeCrown, TILE.treeCrown, TILE.treeTrunk, TILE.stump, TILE.log, TILE.bush],
      decor: [TILE.fern, TILE.mushroom, TILE.tallGrass, TILE.flowerPatch, TILE.pebbles],
    };
    case "peaks": return {
      obstacles: [TILE.boulder, TILE.crag, TILE.snowPine, TILE.boulder],
      decor: [TILE.snowdrift, TILE.pebbles, TILE.heather],
    };
    case "cliffs": return {
      obstacles: [TILE.boulder, TILE.rubble, TILE.crag],
      decor: [TILE.pebbles, TILE.heather, TILE.fern],
    };
    case "ruins": return {
      obstacles: [TILE.ruinColumn, TILE.rubble, TILE.mossStone, TILE.grave],
      decor: [TILE.vines, TILE.pebbles, TILE.tallGrass, TILE.flowerPatch],
    };
    case "marsh": return {
      obstacles: [TILE.deadTree, TILE.reeds, TILE.log],
      decor: [TILE.cattail, TILE.mushroom, TILE.tallGrass],
    };
    case "reeds": return {
      obstacles: [TILE.reeds, TILE.log],
      decor: [TILE.cattail, TILE.tallGrass, TILE.lilypad],
    };
    case "witch": return {
      obstacles: [TILE.deadTree, TILE.stump, TILE.mossStone],
      decor: [TILE.mushroom, TILE.flowerPatch, TILE.vines, TILE.tallGrass],
    };
    case "lake": return {
      obstacles: [TILE.boulder, TILE.reeds],
      decor: [TILE.pebbles, TILE.cattail, TILE.tallGrass],
    };
    case "river": return {
      obstacles: [TILE.treeCrown, TILE.boulder, TILE.log],
      decor: [TILE.tallGrass, TILE.flowerPatch, TILE.pebbles, TILE.fern],
    };
    case "fields": return {
      obstacles: [TILE.haystack, TILE.fence, TILE.crate],
      decor: [TILE.wheat, TILE.crop, TILE.flowerPatch],
    };
    case "canal": return {
      obstacles: [TILE.cliff, TILE.rubble, TILE.barrel],
      decor: [TILE.pebbles, TILE.vines],
    };
    case "village": return {
      obstacles: [TILE.fence, TILE.barrel, TILE.crate, TILE.haystack],
      decor: [TILE.flowerPatch, TILE.crop, TILE.tallGrass],
    };
    default: return { obstacles: [TILE.boulder], decor: [TILE.tallGrass] };
  }
}

/**
 * Sème obstacles et détails.
 *
 * Le tirage précédent était quasi uniforme : chaque zone se couvrait d'une
 * grêle régulière de rochers, sans un seul dégagement — un damier, pas un
 * paysage. Le bruit de regroupement est maintenant élevé à une puissance, ce
 * qui creuse de vraies clairières entre des bosquets vraiment denses. Le choix
 * de la matière suit lui aussi le bruit : on obtient une pinède, puis un chaos
 * de blocs, au lieu d'une salade d'objets isolés.
 */
function scatter(grid: Grid): void {
  const { obstacles, decor } = furnishingFor(grid.zone.biome);
  const density = scatterDensity(grid.zone.biome);
  for (let y = 2; y < H - 2; y += 1) {
    for (let x = 2; x < W - 2; x += 1) {
      if (isGuarded(grid, x, y)) continue;
      if (grid.terrain[index(x, y)] !== 0) continue;
      const ground = grid.ground[index(x, y)]!;
      if (ground === TILE.water || ground === TILE.deepWater || ground === TILE.bridge) continue;

      const clump = fbm(x, y, grid.seed ^ 0x3c4d, 0.07);
      const roll = randomAt(x, y, grid.seed ^ 0x8f21);
      // `clump³` : au-dessus de 0,7 le massif est dense, en dessous de 0,4 il
      // ne reste presque rien. C'est ce contraste qui dessine le terrain.
      const chance = density * clump * clump * clump * 3.2;
      // Interdit les blocs pleins de deux cases sur deux : sans cette règle,
      // un bosquet dense devenait un mur d'arbres tous identiques, collés,
      // sans un pouce de sol entre eux.
      const packed = grid.terrain[index(x - 1, y)] !== 0
        && grid.terrain[index(x, y - 1)] !== 0
        && grid.terrain[index(x - 1, y - 1)] !== 0;
      if (roll < chance && !packed) {
        // Le massif garde une essence dominante, mais pas exclusive.
        const pick = fbm(x, y, grid.seed ^ 0x5d13, 0.05) * 0.65
          + randomAt(x, y, grid.seed ^ 0x99b1) * 0.35;
        const tile = obstacles[Math.min(obstacles.length - 1,
          Math.floor(pick * obstacles.length))]!;
        block(grid, x, y, tile);
        // Une frondaison au-dessus du tronc : on passe derrière l'arbre.
        if (tile === TILE.treeCrown && y > 1 && !isGuarded(grid, x, y - 1)
          && grid.terrain[index(x, y - 1)] === 0) {
          grid.above[index(x, y - 1)] = TILE.canopy;
        }
      } else if (roll < chance + 0.16) {
        decorate(grid, x, y, decor[Math.floor(randomAt(x, y, grid.seed ^ 0x2ae7) * decor.length)]!);
      }
    }
  }
}

// — Bâtiments ————————————————————————————————————————————————

interface House { readonly x: number; readonly y: number; readonly width: number; readonly height: number }

/** Bâtit une maison dont la porte tombe sur `doorX`, dernière rangée du mur. */
function placeHouse(grid: Grid, house: House): { readonly doorX: number; readonly doorY: number } | null {
  const { x, y, width, height } = house;
  if (x < 1 || y < 1 || x + width > W - 1 || y + height > H - 1) return null;
  const doorX = x + Math.floor(width / 2);
  const doorY = y + height - 1;
  // Une maison ne doit jamais tomber sur un couloir : on abandonne plutôt.
  for (let ty = y; ty < y + height; ty += 1) {
    for (let tx = x; tx < x + width; tx += 1) if (isGuarded(grid, tx, ty)) return null;
  }
  for (let ty = y; ty < y + height; ty += 1) {
    for (let tx = x; tx < x + width; tx += 1) {
      grid.terrain[index(tx, ty)] = ty < y + Math.max(1, height - 3) ? TILE.roof : TILE.wall;
      grid.below[index(tx, ty)] = 0;
    }
  }
  grid.terrain[index(doorX, doorY)] = TILE.door;
  if (width >= 4) {
    grid.terrain[index(x + 1, doorY)] = TILE.window;
    grid.terrain[index(x + width - 2, doorY)] = TILE.window;
  }
  grid.above[index(x + 1, y)] = TILE.chimney;
  // Le seuil et son pas de porte restent dégagés.
  for (let step = 1; step <= 2; step += 1) {
    clearTile(grid, doorX, doorY + step);
    guard(grid, doorX, doorY + step);
    grid.ground[index(doorX, Math.min(H - 1, doorY + step))] = TILE.path;
  }
  return { doorX, doorY };
}

/**
 * Village : place pavée, maisons serrées, jardins et lanternes.
 *
 * La première version posait un rectangle de pavés de onze cases sur neuf au
 * centre d'un pré : vu de haut, une dalle de béton. La place est désormais
 * ronde et resserrée, les maisons se tournent vers elle, et le pavé s'effrite
 * vers la terre battue à mesure qu'on s'en éloigne.
 */
function buildVillage(grid: Grid, gates: readonly GateInfo[]): void {
  const hubX = Math.floor(W / 2);
  const hubY = Math.floor(H / 2);

  for (let y = hubY - 5; y <= hubY + 5; y += 1) {
    for (let x = hubX - 6; x <= hubX + 6; x += 1) {
      if (!inBounds(x, y)) continue;
      // Ellipse plutôt que rectangle, avec un bord rongé par le bruit.
      const distance = Math.hypot((x - hubX) / 6, (y - hubY) / 4.2)
        + (fbm(x, y, grid.seed ^ 0x3311, 0.3) - 0.5) * 0.28;
      if (distance > 1) continue;
      clearTile(grid, x, y);
      guard(grid, x, y);
      grid.ground[index(x, y)] = distance > 0.66 ? TILE.path : TILE.cobble;
    }
  }

  const spots: readonly House[] = [
    { x: 3, y: 4, width: 6, height: 5 },
    { x: 11, y: 3, width: 7, height: 5 },
    { x: W - 9, y: 5, width: 6, height: 5 },
    { x: 4, y: H - 9, width: 6, height: 5 },
    { x: 13, y: H - 8, width: 6, height: 5 },
    { x: W - 10, y: H - 10, width: 7, height: 5 },
  ];
  for (const [order, spot] of spots.entries()) {
    const door = placeHouse(grid, spot);
    if (!door) continue;
    carve(grid, { x: door.doorX, y: Math.min(H - 2, door.doorY + 2) }, { x: hubX, y: hubY },
      1, TILE.path, order % 2 === 0);
    // Un potager clos derrière chaque maison.
    for (let dy = 0; dy < 2; dy += 1) {
      for (let dx = 0; dx < spot.width; dx += 1) {
        const tx = spot.x + dx;
        const ty = spot.y - 2 + dy;
        if (!inBounds(tx, ty) || isGuarded(grid, tx, ty)) continue;
        if (grid.terrain[index(tx, ty)] !== 0) continue;
        if (dy === 0 && dx % 2 === 0) block(grid, tx, ty, TILE.fence);
        else grid.below[index(tx, ty)] = TILE.crop;
      }
    }
  }

  // Mobilier de place : lanternes, étal, tonneaux, un arbre pour l'ombre.
  const furniture: readonly (readonly [number, number, number])[] = [
    [-5, -3, TILE.lanternPost], [5, -3, TILE.lanternPost],
    [-5, 3, TILE.lanternPost], [5, 3, TILE.lanternPost],
    [3, -3, TILE.marketStall], [-3, 3, TILE.barrel], [-4, 3, TILE.crate],
    [4, 3, TILE.haystack], [-4, -3, TILE.treeCrown],
  ];
  for (const [dx, dy, tile] of furniture) {
    const tx = hubX + dx;
    const ty = hubY + dy;
    if (!inBounds(tx, ty)) continue;
    grid.guarded[index(tx, ty)] = 0;
    grid.terrain[index(tx, ty)] = tile;
    if (tile === TILE.treeCrown && inBounds(tx, ty - 1)) grid.above[index(tx, ty - 1)] = TILE.canopy;
  }

  for (const gate of gates) {
    carve(grid, gateAnchor(gate), { x: hubX, y: hubY }, 1, TILE.path,
      gate.edge === "west" || gate.edge === "east");
  }
}

/** Champs : parcelles closes de haies, séparées par des chemins de terre. */
function buildFields(grid: Grid): void {
  for (let plotY = 3; plotY < H - 5; plotY += 7) {
    for (let plotX = 3; plotX < W - 6; plotX += 9) {
      const width = 7;
      const height = 5;
      const crop = randomAt(plotX, plotY, grid.seed ^ 0x4411) > 0.45 ? TILE.wheat : TILE.crop;
      for (let dy = 0; dy < height; dy += 1) {
        for (let dx = 0; dx < width; dx += 1) {
          const tx = plotX + dx;
          const ty = plotY + dy;
          if (!inBounds(tx, ty) || isGuarded(grid, tx, ty)) continue;
          const border = dx === 0 || dy === 0 || dx === width - 1 || dy === height - 1;
          if (border) {
            if ((dx + dy) % 3 !== 0) block(grid, tx, ty, TILE.fence);
          } else {
            grid.ground[index(tx, ty)] = TILE.dryGrass;
            grid.below[index(tx, ty)] = crop;
          }
        }
      }
    }
  }
}

/** Ruines : pans de murs, colonnades et dallage envahi. */
function buildRuins(grid: Grid): void {
  const hubX = Math.floor(W / 2);
  const hubY = Math.floor(H / 2);
  for (let y = hubY - 6; y <= hubY + 6; y += 1) {
    for (let x = hubX - 9; x <= hubX + 9; x += 1) {
      if (!inBounds(x, y) || isGuarded(grid, x, y)) continue;
      grid.ground[index(x, y)] = (x + y) % 7 === 0 ? TILE.crackedPath : TILE.cobble;
    }
  }
  for (const dx of [-9, -5, 0, 5, 9]) {
    for (const dy of [-6, 6]) {
      const tx = hubX + dx;
      const ty = hubY + dy;
      if (inBounds(tx, ty)) block(grid, tx, ty, TILE.ruinColumn);
      if (inBounds(tx, ty - 1) && !isGuarded(grid, tx, ty - 1)) {
        grid.above[index(tx, ty - 1)] = TILE.archTop;
      }
    }
  }
  for (let y = hubY - 6; y <= hubY + 6; y += 2) {
    block(grid, hubX - 10, y, TILE.mossStone);
    block(grid, hubX + 10, y, TILE.mossStone);
  }
}

/** Falaises et sommets : gradins rocheux percés de cols. */
function buildTerraces(grid: Grid, gates: readonly GateInfo[]): void {
  const passes = new Set<number>(gates
    .filter((gate) => gate.edge === "north" || gate.edge === "south")
    .map((gate) => gate.center));
  if (passes.size === 0) passes.add(Math.floor(W / 2));

  for (const ridgeY of [6, 13, 20]) {
    for (let x = 1; x < W - 1; x += 1) {
      if (isGuarded(grid, x, ridgeY)) continue;
      if ([...passes].some((pass) => Math.abs(x - pass) <= 2)) continue;
      const wobble = Math.round((fbm(x, ridgeY, grid.seed ^ 0x18d, 0.3) - 0.5) * 3);
      const y = Math.max(2, Math.min(H - 3, ridgeY + wobble));
      block(grid, x, y, grid.zone.biome === "peaks" ? TILE.crag : TILE.cliff);
      if (!isGuarded(grid, x, y - 1) && grid.terrain[index(x, y - 1)] === 0) {
        grid.ground[index(x, y - 1)] = grid.zone.biome === "peaks" ? TILE.snowdrift : TILE.scree;
      }
    }
  }
}

/** Marais et roselières : mares peu profondes et pontons. */
function buildBogs(grid: Grid): void {
  for (let y = 3; y < H - 3; y += 1) {
    for (let x = 3; x < W - 3; x += 1) {
      if (isGuarded(grid, x, y)) continue;
      // Un marais doit être mouillé : le seuil précédent n'y laissait que
      // quelques flaques perdues dans une prairie verte.
      const wetness = fbm(x, y, grid.seed ^ 0x6b2, 0.1);
      if (wetness > 0.58) {
        grid.ground[index(x, y)] = wetness > 0.72 ? TILE.deepWater : TILE.water;
        grid.terrain[index(x, y)] = 0;
        grid.below[index(x, y)] = 0;
      } else if (wetness > 0.46) {
        grid.ground[index(x, y)] = TILE.mud;
      }
    }
  }
}

/** Lacs : une grande étendue et sa rive, avec un ponton. */
function buildLake(grid: Grid): void {
  const centreX = Math.floor(W / 2) + Math.round((randomAt(1, 2, grid.seed) - 0.5) * 6);
  const centreY = Math.floor(H / 2) + Math.round((randomAt(3, 4, grid.seed) - 0.5) * 4);
  const radiusX = 10;
  const radiusY = 7;
  for (let y = 1; y < H - 1; y += 1) {
    for (let x = 1; x < W - 1; x += 1) {
      if (isGuarded(grid, x, y)) continue;
      const nx = (x - centreX) / radiusX;
      const ny = (y - centreY) / radiusY;
      const distance = Math.hypot(nx, ny) + (fbm(x, y, grid.seed ^ 0xa5, 0.18) - 0.5) * 0.35;
      if (distance < 0.72) {
        grid.ground[index(x, y)] = TILE.deepWater;
        clearTile(grid, x, y);
      } else if (distance < 0.95) {
        grid.ground[index(x, y)] = TILE.water;
        clearTile(grid, x, y);
      } else if (distance < 1.12) {
        grid.ground[index(x, y)] = TILE.shoreSand;
      }
    }
  }
  // Un ponton qui avance sur l'eau : la rive cesse d'être une simple limite.
  const dockY = centreY;
  for (let x = centreX - radiusX - 1; x < centreX - 2; x += 1) {
    if (!inBounds(x, dockY)) continue;
    grid.ground[index(x, dockY)] = TILE.dock;
    clearTile(grid, x, dockY);
    guard(grid, x, dockY);
  }
  for (let y = centreY + 2; y <= centreY + 4; y += 1) {
    if (inBounds(centreX + 4, y)) grid.ground[index(centreX + 4, y)] = TILE.lilypad;
  }
}

/** Canaux : deux bajoyers de pierre et un chenal central. */
function buildCanal(grid: Grid): void {
  const channelX = Math.floor(W / 2);
  for (let y = 1; y < H - 1; y += 1) {
    for (let dx = -3; dx <= 3; dx += 1) {
      const x = channelX + dx;
      if (!inBounds(x, y) || isGuarded(grid, x, y)) continue;
      if (Math.abs(dx) === 3) { block(grid, x, y, TILE.cliff); continue; }
      grid.ground[index(x, y)] = Math.abs(dx) >= 2 ? TILE.gravel : TILE.crackedPath;
      clearTile(grid, x, y);
    }
  }
  for (const y of [7, 20]) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const x = channelX + dx;
      if (inBounds(x, y) && !isGuarded(grid, x, y)) block(grid, x, y, TILE.rubble);
    }
  }
}

// — Lieux remarquables ————————————————————————————————————————

/**
 * Grand bâtiment repérable de loin : château, tour, ermitage.
 *
 * Le bâtiment se construit *autour* de la porte annoncée par le contenu, et
 * non à un endroit choisi par le générateur : sans cela, le joueur appuyait
 * sur « agir » devant une prairie et entrait pourtant dans un château.
 */
function placeLandmark(grid: Grid, kind: "castle" | "tower" | "hermitage" | "arena",
  doorTile: { readonly x: number; readonly y: number } | null): void {
  const hubX = doorTile?.x ?? Math.floor(W / 2);
  const hubY = Math.floor(H / 2);

  if (kind === "arena") {
    for (let y = 4; y < H - 4; y += 1) {
      for (let x = 4; x < W - 4; x += 1) {
        clearTile(grid, x, y);
        guard(grid, x, y);
        const rim = x === 4 || y === 4 || x === W - 5 || y === H - 5;
        grid.ground[index(x, y)] = rim ? TILE.cobble : (x + y) % 11 === 0 ? TILE.alpineGrass : TILE.gravel;
      }
    }
    for (const [x, y] of [[5, 5], [W - 6, 5], [5, H - 6], [W - 6, H - 6]] as const) {
      grid.terrain[index(x, y)] = TILE.brazier;
      grid.guarded[index(x, y)] = 0;
    }
    return;
  }

  const width = kind === "castle" ? 16 : kind === "tower" ? 8 : 9;
  const height = kind === "castle" ? 10 : kind === "tower" ? 11 : 7;
  const left = Math.max(1, Math.min(W - 1 - width, hubX - Math.floor(width / 2)));
  const top = doorTile
    ? Math.max(1, Math.min(H - 3 - height, doorTile.y - height + 1))
    : Math.max(2, hubY - Math.floor(height / 2) - 2);

  for (let y = top; y < top + height; y += 1) {
    for (let x = left; x < left + width; x += 1) {
      if (!inBounds(x, y)) continue;
      grid.guarded[index(x, y)] = 0;
      grid.below[index(x, y)] = 0;
      grid.above[index(x, y)] = 0;
      const fromTop = y - top;
      grid.terrain[index(x, y)] = fromTop < 2 ? TILE.roof
        : kind === "castle" && (x === left || x === left + width - 1) ? TILE.ruinColumn
          : fromTop < height - 2 ? TILE.wall : TILE.cliff;
    }
  }
  const doorX = Math.max(left + 1, Math.min(left + width - 2, hubX));
  const doorY = top + height - 1;
  grid.terrain[index(doorX, doorY)] = TILE.door;
  if (inBounds(doorX - 1, doorY)) grid.terrain[index(doorX - 1, doorY)] = TILE.wall;
  if (inBounds(doorX + 1, doorY)) grid.terrain[index(doorX + 1, doorY)] = TILE.wall;
  for (const wx of [left + 2, left + width - 3]) {
    if (inBounds(wx, top + 2)) grid.terrain[index(wx, top + 2)] = TILE.window;
  }
  if (kind === "castle") {
    for (const bx of [left + 1, left + width - 2]) {
      if (inBounds(bx, top - 1)) grid.above[index(bx, top - 1)] = TILE.banner;
    }
  }
  // Parvis : la porte reste accessible, quoi qu'il arrive ensuite.
  for (let y = doorY + 1; y < Math.min(H - 1, doorY + 4); y += 1) {
    for (let x = doorX - 2; x <= doorX + 2; x += 1) {
      if (!inBounds(x, y)) continue;
      clearTile(grid, x, y);
      guard(grid, x, y);
      grid.ground[index(x, y)] = TILE.cobble;
    }
  }
  if (kind !== "hermitage") {
    for (const [dx, dy] of [[-3, 1], [3, 1]] as const) {
      const tx = doorX + dx;
      const ty = doorY + dy;
      if (inBounds(tx, ty)) { grid.terrain[index(tx, ty)] = TILE.brazier; grid.guarded[index(tx, ty)] = 0; }
    }
  }
}

// — Assemblage ————————————————————————————————————————————————

const LANDMARKS: Readonly<Record<string, "castle" | "tower" | "hermitage" | "arena">> = {
  portail_scelle: "castle",
  cabane_iris: "tower",
  ermitage_gorm: "hermitage",
  boss_arena: "arena",
};

/**
 * Vérifie que toutes les sorties communiquent, et perce un couloir droit vers
 * celles qui seraient restées isolées. C'est la garantie finale : quoi qu'ait
 * produit le hasard, on ne peut pas entrer dans une zone et s'y retrouver
 * enfermé.
 */
function repairConnectivity(grid: Grid, points: readonly { x: number; y: number }[],
  solid: (x: number, y: number) => boolean): void {
  if (points.length === 0) return;
  const root = points[0]!;
  // Deux passes suffisent : la première perce, la seconde vérifie que percer
  // n'a pas laissé un îlot derrière.
  for (let pass = 0; pass < 2; pass += 1) {
    const reachable = floodFrom(root, solid);
    let repaired = false;
    for (const point of points.slice(1)) {
      if (reachable.has(index(point.x, point.y))) continue;
      carve(grid, root, point, 1, null, true);
      repaired = true;
    }
    if (!repaired) return;
  }
}

function floodFrom(start: { x: number; y: number }, solid: (x: number, y: number) => boolean): Set<number> {
  const seen = new Set<number>();
  if (solid(start.x, start.y)) return seen;
  const queue: { x: number; y: number }[] = [start];
  seen.add(index(start.x, start.y));
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (!inBounds(nx, ny) || solid(nx, ny)) continue;
      const key = index(nx, ny);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

/**
 * Solidité lue directement dans le jeu de tuiles.
 *
 * Le générateur maintenait sa propre liste de tuiles bloquantes, qui a
 * naturellement divergé de celle du moteur : il croyait fermé ce qui était
 * ouvert, et perçait des couloirs inutiles au travers des bâtiments.
 */
const SOLIDITY = new TileSet();

function gridSolid(grid: Grid): (x: number, y: number) => boolean {
  const solid = (id: number): boolean => SOLIDITY.properties(id).solid === true;
  return (x, y) => {
    if (!inBounds(x, y)) return true;
    const key = index(x, y);
    return solid(grid.terrain[key]!) || solid(grid.below[key]!) || solid(grid.ground[key]!);
  };
}

/**
 * Dégage les points d'ancrage du contenu narratif et les relie au réseau.
 * Un coffre muré ou une porte inaccessible rendrait sa quête impossible.
 */
function applyAnchors(grid: Grid, anchors: readonly ZoneAnchor[], hub: { x: number; y: number },
  hasLandmark: boolean): void {
  for (const anchor of anchors) {
    const tx = Math.max(1, Math.min(W - 2, Math.floor(anchor.x / TILE_SIZE)));
    const ty = Math.max(1, Math.min(H - 2, Math.floor(anchor.y / TILE_SIZE)));
    // Un lieu remarquable a déjà bâti sa propre façade autour de la porte.
    if (anchor.kind === "door" && !hasLandmark) {
      // Une façade se dresse juste au-dessus de la porte annoncée.
      for (let dy = -4; dy <= -1; dy += 1) {
        for (let dx = -3; dx <= 3; dx += 1) {
          const hx = tx + dx;
          const hy = ty + dy;
          if (!inBounds(hx, hy)) continue;
          grid.guarded[index(hx, hy)] = 0;
          grid.below[index(hx, hy)] = 0;
          grid.terrain[index(hx, hy)] = dy < -2 ? TILE.roof : TILE.wall;
        }
      }
      if (inBounds(tx - 2, ty - 2)) grid.terrain[index(tx - 2, ty - 2)] = TILE.window;
      if (inBounds(tx + 2, ty - 2)) grid.terrain[index(tx + 2, ty - 2)] = TILE.window;
      if (inBounds(tx, ty - 5)) grid.above[index(tx, ty - 5)] = TILE.chimney;
    } else if (anchor.kind === "well") {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          clearTile(grid, tx + dx, ty + dy);
          guard(grid, tx + dx, ty + dy);
          if (inBounds(tx + dx, ty + dy)) grid.ground[index(tx + dx, ty + dy)] = TILE.cobble;
        }
      }
    }

    // Devant chaque objet, un seuil dégagé pour venir s'en approcher. Une
    // porte reste pleine : c'est en face d'elle qu'il faut de la place.
    const firstRow = anchor.kind === "door" ? 1 : 0;
    for (let dy = firstRow; dy <= firstRow + 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        clearTile(grid, tx + dx, ty + dy);
        guard(grid, tx + dx, ty + dy);
      }
    }
    carve(grid, { x: tx, y: Math.min(H - 2, ty + firstRow + 1) }, hub, 1, null,
      randomAt(tx, ty, grid.seed) > 0.5);
  }
}

function doorAnchorOf(anchors: readonly ZoneAnchor[]): { readonly x: number; readonly y: number } | null {
  const door = anchors.find((anchor) => anchor.kind === "door");
  if (!door) return null;
  return {
    x: Math.max(1, Math.min(W - 2, Math.floor(door.x / TILE_SIZE))),
    y: Math.max(1, Math.min(H - 2, Math.floor(door.y / TILE_SIZE))),
  };
}

export function createProceduralMap(zone: WorldZoneData, anchors: readonly ZoneAnchor[] = []): TiledMapData {
  const grid = makeGrid(zone);

  for (let y = 0; y < H; y += 1) {
    for (let x = 0; x < W; x += 1) grid.ground[index(x, y)] = blendedGround(zone, x, y, grid.seed);
  }

  const gates = paintBorder(grid);
  const hub = {
    x: Math.floor(W / 2) + Math.round((randomAt(7, 3, grid.seed) - 0.5) * 6),
    y: Math.floor(H / 2) + Math.round((randomAt(5, 9, grid.seed) - 0.5) * 4),
  };

  // Un cours d'eau traverse la zone avant qu'on ne trace les chemins : le
  // couloir passera dessus, et c'est là que naîtra le pont.
  if (zone.biome === "river") carveWaterway(grid, gates);

  // Couloirs : chaque passage rejoint le cœur de la zone.
  for (const gate of gates) {
    const road = isRoadEdge(zone, gate.edge);
    carve(grid, outerAnchor(gate), hub, road ? 2 : 1,
      road ? groundRecipe(zone.biome).road : null,
      gate.edge === "west" || gate.edge === "east");
  }
  bridgeGuardedWater(grid);

  // Les grandes étendues d'eau se forment ensuite, autour des chemins déjà
  // tracés : en les creusant avant, le couloir les traversait de part en part
  // et toute la zone devenait un plancher de planches.
  if (zone.biome === "lake") buildLake(grid);
  else if (zone.biome === "marsh" || zone.biome === "reeds") buildBogs(grid);
  else if (zone.biome === "canal") buildCanal(grid);

  if (zone.biome === "village") buildVillage(grid, gates);
  else if (zone.biome === "fields") buildFields(grid);
  else if (zone.biome === "ruins") buildRuins(grid);
  else if (zone.biome === "peaks" || zone.biome === "cliffs") buildTerraces(grid, gates);

  scatter(grid);

  const landmark = LANDMARKS[zone.id];
  if (landmark) placeLandmark(grid, landmark, doorAnchorOf(anchors));

  applyAnchors(grid, anchors, hub, landmark !== undefined);
  bridgeGuardedWater(grid);

  // Tout doit communiquer : les quatre passages, le cœur de la zone et chaque
  // point de contenu. C'est l'invariant qui remplace l'ancienne loterie.
  const mustConnect = [
    ...gates.map(gateAnchor),
    hub,
    ...anchors.map((anchor) => ({
      x: Math.max(1, Math.min(W - 2, Math.floor(anchor.x / TILE_SIZE))),
      // Devant une porte, c'est le parvis qu'il faut rejoindre : viser la
      // porte elle-même ferait creuser un couloir au travers de la façade.
      y: Math.max(1, Math.min(H - 2,
        Math.floor(anchor.y / TILE_SIZE) + (anchor.kind === "door" ? 2 : 0))),
    })),
  ];
  repairConnectivity(grid, mustConnect, gridSolid(grid));

  const layers: Record<LayerName, number[]> = {
    ground: grid.ground,
    terrain: grid.terrain,
    decor_below: grid.below,
    decor_above: grid.above,
  };
  const tiledLayers = (Object.keys(layers) as LayerName[]).map((name): TiledLayer => ({
    name, width: W, height: H, data: layers[name],
  }));
  return { width: W, height: H, tilewidth: 16, tileheight: 16, layers: tiledLayers };
}

/** Points de contenu à préserver dans une zone, déduits des objets déclarés. */
export function anchorsFor(zoneId: string): readonly ZoneAnchor[] {
  return INTERACTABLES
    .filter((entry) => entry.zone === zoneId)
    .map((entry): ZoneAnchor => ({
      x: entry.x,
      y: entry.y,
      kind: entry.kind === "door" ? "door" : entry.kind === "well" ? "well" : "plain",
    }));
}

/** Carte complète d'une zone, contenu narratif compris. */
export function createZoneMap(zone: WorldZoneData): TiledMapData {
  return createProceduralMap(zone, anchorsFor(zone.id));
}
