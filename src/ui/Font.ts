/**
 * Police bitmap 1 bit maison.
 *
 * Le jeu affichait son texte avec `ctx.fillText` en Courier New 10 px : dans un
 * tampon de 384×216 agrandi cinq fois, l'anticrénelage du navigateur produisait
 * des franges grises au milieu d'une image en pixels nets. Chaque glyphe est
 * désormais dessiné à la main sur une grille de 5×7, avec une zone d'accent
 * au-dessus et une jambage en dessous — de quoi écrire le français sans
 * compromis.
 *
 * Une cellule fait 5 colonnes sur 10 lignes :
 *   lignes 0-1  accents (aigu, grave, circonflexe, tréma)
 *   lignes 2-8  corps du glyphe (hauteur de capitale)
 *   ligne  9    jambage (g, j, p, q, y, ç)
 */

/** Hauteur d'une ligne de texte, jambages compris. */
export const GLYPH_HEIGHT = 10;
/** Première ligne du corps dans la cellule. */
export const GLYPH_TOP = 2;
/** Interligne conseillé entre deux lignes de texte. */
export const LINE_HEIGHT = 12;

type Rows = readonly string[];

/** Corps des glyphes : 7 lignes de 5 colonnes, `#` allumé. */
const BODY: Record<string, Rows> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],

  a: [".....", ".....", ".###.", "....#", ".####", "#...#", ".####"],
  b: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "####."],
  c: [".....", ".....", ".###.", "#....", "#....", "#....", ".###."],
  d: ["....#", "....#", ".####", "#...#", "#...#", "#...#", ".####"],
  e: [".....", ".....", ".###.", "#...#", "#####", "#....", ".###."],
  f: ["..##.", ".#...", "####.", ".#...", ".#...", ".#...", ".#..."],
  g: [".....", ".....", ".###.", "#...#", "#...#", ".####", "....#"],
  h: ["#....", "#....", "####.", "#...#", "#...#", "#...#", "#...#"],
  i: ["..#..", ".....", ".##..", "..#..", "..#..", "..#..", ".###."],
  j: ["...#.", ".....", "..##.", "...#.", "...#.", "...#.", "...#."],
  k: ["#....", "#....", "#..#.", "#.#..", "##...", "#.#..", "#..#."],
  l: [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
  m: [".....", ".....", "##.#.", "#.#.#", "#.#.#", "#.#.#", "#.#.#"],
  n: [".....", ".....", "####.", "#...#", "#...#", "#...#", "#...#"],
  o: [".....", ".....", ".###.", "#...#", "#...#", "#...#", ".###."],
  p: [".....", ".....", "####.", "#...#", "#...#", "####.", "#...."],
  q: [".....", ".....", ".####", "#...#", "#...#", ".####", "....#"],
  r: [".....", ".....", "#.##.", "##..#", "#....", "#....", "#...."],
  s: [".....", ".....", ".####", "#....", ".###.", "....#", "####."],
  t: [".#...", ".#...", "####.", ".#...", ".#...", ".#..#", "..##."],
  u: [".....", ".....", "#...#", "#...#", "#...#", "#..##", ".##.#"],
  v: [".....", ".....", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  w: [".....", ".....", "#...#", "#...#", "#.#.#", "#.#.#", ".#.#."],
  x: [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  y: [".....", ".....", "#...#", "#...#", "#...#", ".####", "....#"],
  z: [".....", ".....", "#####", "...#.", "..#..", ".#...", "#####"],

  "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": [".###.", "#...#", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "#...#", ".###."],

  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
  ",": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
  ":": [".....", ".....", "..#..", ".....", ".....", "..#..", "....."],
  ";": [".....", ".....", "..#..", ".....", ".....", "..#..", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
  '"': [".#.#.", ".#.#.", ".....", ".....", ".....", ".....", "....."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."],
  "—": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  "–": [".....", ".....", ".....", "####.", ".....", ".....", "....."],
  "_": [".....", ".....", ".....", ".....", ".....", ".....", "#####"],
  "+": [".....", ".....", "..#..", "#####", "..#..", ".....", "....."],
  "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "*": [".....", "..#..", "#.#.#", ".###.", "#.#.#", "..#..", "....."],
  "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "\\": ["#....", "#....", ".#...", "..#..", "...#.", "....#", "....#"],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
  ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
  "[": ["..##.", "..#..", "..#..", "..#..", "..#..", "..#..", "..##."],
  "]": [".##..", "..#..", "..#..", "..#..", "..#..", "..#..", ".##.."],
  "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."],
  ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
  "%": ["##..#", "##.#.", "...#.", "..#..", ".#...", ".#.##", "#..##"],
  "·": [".....", ".....", ".....", "..#..", ".....", ".....", "....."],
  // Le signe multiplié sert partout dans le sac (« Pomme ×4 ») : sans lui,
  // chaque quantité s'affichait précédée d'un point d'interrogation.
  "×": [".....", ".....", "#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  "÷": [".....", "..#..", ".....", "#####", ".....", "..#..", "....."],
  "°": ["..##.", "..##.", ".....", ".....", ".....", ".....", "....."],
  "±": ["..#..", "#####", "..#..", ".....", "#####", ".....", "....."],
  "•": [".....", ".....", ".###.", ".###.", ".###.", ".....", "....."],
  "«": [".....", "..#.#", ".#.#.", "#.#..", ".#.#.", "..#.#", "....."],
  "»": [".....", "#.#..", ".#.#.", "..#.#", ".#.#.", "#.#..", "....."],
  "…": [".....", ".....", ".....", ".....", ".....", ".....", "#.#.#"],
  "→": [".....", "..#..", "...#.", "#####", "...#.", "..#..", "....."],
  "←": [".....", "..#..", ".#...", "#####", ".#...", "..#..", "....."],
  "↑": [".....", "..#..", ".###.", "#.#.#", "..#..", "..#..", "....."],
  "↓": [".....", "..#..", "..#..", "#.#.#", ".###.", "..#..", "....."],
  "♥": [".....", ".#.#.", "#####", "#####", ".###.", "..#..", "....."],
  "◆": ["..#..", ".###.", "#####", ".###.", "..#..", ".....", "....."],
  // i sans point, support des accents circonflexe et tréma.
  "ı": [".....", ".....", ".##..", "..#..", "..#..", "..#..", ".###."],
  "œ": [".....", ".....", ".####", "#.#.#", "#.###", "#.#..", ".####"],
  "Œ": [".####", "#.#..", "#.#..", "#.###", "#.#..", "#.#..", ".####"],
  "æ": [".....", ".....", ".####", "#.#.#", ".####", "#.#..", ".####"],
  "Æ": [".####", "#.#..", "#.#..", "#.###", "#.#..", "#.#..", "#.###"],
};

/** Jambages, dessinés sur la ligne 9 de la cellule. */
const DESCENDER: Record<string, string> = {
  g: "####.",
  j: "###..",
  p: "#....",
  q: "....#",
  y: "###..",
  ",": ".#...",
  ";": ".#...",
  "ç": "..##.",
  "Ç": "..##.",
};

/** Signes diacritiques, deux lignes posées au-dessus du corps. */
const ACCENTS: Record<string, readonly [string, string]> = {
  acute: ["...#.", "..#.."],
  grave: [".#...", "..#.."],
  circumflex: ["..#..", ".#.#."],
  diaeresis: [".#.#.", "....."],
  tilde: [".##.#", "#..#."],
  ring: ["..#..", ".#.#."],
};

/** Lettres accentuées : base + diacritique, composés à la volée. */
const COMPOSED: Record<string, readonly [string, keyof typeof ACCENTS]> = {
  "à": ["a", "grave"], "â": ["a", "circumflex"], "ä": ["a", "diaeresis"],
  "á": ["a", "acute"], "ã": ["a", "tilde"], "å": ["a", "ring"],
  "é": ["e", "acute"], "è": ["e", "grave"], "ê": ["e", "circumflex"],
  "ë": ["e", "diaeresis"],
  "î": ["ı", "circumflex"], "ï": ["ı", "diaeresis"],
  "ì": ["ı", "grave"], "í": ["ı", "acute"],
  "ô": ["o", "circumflex"], "ö": ["o", "diaeresis"], "ò": ["o", "grave"],
  "ó": ["o", "acute"], "õ": ["o", "tilde"],
  "ù": ["u", "grave"], "û": ["u", "circumflex"], "ü": ["u", "diaeresis"],
  "ú": ["u", "acute"],
  "ÿ": ["y", "diaeresis"],
  "ç": ["c", "grave"], // le diacritique réel est la cédille, posée en jambage
  "À": ["A", "grave"], "Â": ["A", "circumflex"], "Ä": ["A", "diaeresis"],
  "É": ["E", "acute"], "È": ["E", "grave"], "Ê": ["E", "circumflex"],
  "Ë": ["E", "diaeresis"],
  "Î": ["I", "circumflex"], "Ï": ["I", "diaeresis"],
  "Ô": ["O", "circumflex"], "Ö": ["O", "diaeresis"],
  "Ù": ["U", "grave"], "Û": ["U", "circumflex"], "Ü": ["U", "diaeresis"],
  "Ç": ["C", "grave"],
};

/** La cédille n'est pas un accent supérieur : on neutralise le doublon. */
const NO_TOP_ACCENT = new Set(["ç", "Ç"]);

export interface Glyph {
  /** Colonnes allumées, indexées par ligne de cellule (0-9). */
  readonly rows: readonly number[];
  /** Largeur d'encre, en pixels. */
  readonly width: number;
  /** Avance du curseur après ce glyphe. */
  readonly advance: number;
}

function rowMask(pattern: string): number {
  let mask = 0;
  for (let column = 0; column < pattern.length; column += 1) {
    if (pattern[column] === "#") mask |= 1 << column;
  }
  return mask;
}

function buildGlyph(character: string): Glyph {
  const composed = COMPOSED[character];
  const baseKey = composed ? composed[0] : character;
  const body = BODY[baseKey] ?? BODY["?"]!;
  const rows = new Array<number>(GLYPH_HEIGHT).fill(0);

  for (let line = 0; line < body.length; line += 1) {
    rows[GLYPH_TOP + line] = rowMask(body[line]!);
  }

  const descender = DESCENDER[character] ?? DESCENDER[baseKey];
  if (descender) rows[GLYPH_HEIGHT - 1] = rowMask(descender);

  if (composed && !NO_TOP_ACCENT.has(character)) {
    // L'accent se pose deux lignes au-dessus de la première ligne encrée :
    // il suit la hauteur réelle de la lettre, minuscule comme capitale.
    let topInk = GLYPH_HEIGHT;
    for (let line = 0; line < GLYPH_HEIGHT; line += 1) {
      if (rows[line] !== 0) { topInk = line; break; }
    }
    const [upper, lower] = ACCENTS[composed[1]]!;
    const anchor = Math.max(0, Math.min(GLYPH_HEIGHT - 2, topInk - 2));
    rows[anchor] = (rows[anchor] ?? 0) | rowMask(upper);
    rows[anchor + 1] = (rows[anchor + 1] ?? 0) | rowMask(lower);
  }

  let width = 0;
  for (const mask of rows) {
    for (let column = 0; column < 5; column += 1) {
      if (mask & (1 << column)) width = Math.max(width, column + 1);
    }
  }
  // L'espace n'a pas d'encre : on lui donne quand même une chasse lisible.
  const advance = character === " " ? 4 : width + 1;
  return { rows, width, advance };
}

const CACHE = new Map<string, Glyph>();

export function glyphFor(character: string): Glyph {
  const cached = CACHE.get(character);
  if (cached) return cached;
  const glyph = buildGlyph(character);
  CACHE.set(character, glyph);
  return glyph;
}

/** Largeur d'une chaîne rendue, espacement compris. */
export function measureText(text: string, letterSpacing = 0): number {
  let width = 0;
  for (const character of text) width += glyphFor(character).advance + letterSpacing;
  return Math.max(0, width - letterSpacing);
}

export type TextAlign = "left" | "center" | "right";

export interface TextOptions {
  readonly color?: string;
  readonly align?: TextAlign;
  /** Ombre portée d'un pixel, très lisible sur un décor chargé. */
  readonly shadow?: string | null;
  readonly letterSpacing?: number;
  /** Cadre d'une couleur autour du texte : titres et alertes. */
  readonly outline?: string | null;
}

/**
 * Dessine une ligne de texte. `y` est le haut de la cellule ; la ligne de base
 * se trouve à `y + 9`.
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: TextOptions = {},
): number {
  const spacing = options.letterSpacing ?? 0;
  const width = measureText(text, spacing);
  const align = options.align ?? "left";
  const startX = Math.round(align === "center" ? x - width / 2 : align === "right" ? x - width : x);
  const startY = Math.round(y);

  if (options.outline) {
    paint(ctx, text, startX, startY, spacing, options.outline, OUTLINE_OFFSETS);
  }
  if (options.shadow !== null) {
    paint(ctx, text, startX, startY, spacing, options.shadow ?? "rgba(8,6,14,0.75)", SHADOW_OFFSETS);
  }
  paint(ctx, text, startX, startY, spacing, options.color ?? "#f4efe1", ORIGIN);
  return width;
}

const ORIGIN: readonly (readonly [number, number])[] = [[0, 0]];
const SHADOW_OFFSETS: readonly (readonly [number, number])[] = [[1, 1]];
const OUTLINE_OFFSETS: readonly (readonly [number, number])[] = [
  [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1],
];

function paint(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  color: string,
  offsets: readonly (readonly [number, number])[],
): void {
  ctx.fillStyle = color;
  for (const [offsetX, offsetY] of offsets) {
    let cursor = x + offsetX;
    for (const character of text) {
      const glyph = glyphFor(character);
      for (let line = 0; line < GLYPH_HEIGHT; line += 1) {
        const mask = glyph.rows[line]!;
        if (mask === 0) continue;
        // Les pixels contigus d'une même ligne partent en un seul fillRect :
        // trois fois moins d'appels canvas sur un écran de dialogue plein.
        let column = 0;
        while (column < 5) {
          if ((mask & (1 << column)) === 0) { column += 1; continue; }
          let run = 1;
          while (column + run < 5 && (mask & (1 << (column + run))) !== 0) run += 1;
          ctx.fillRect(cursor + column, y + offsetY + line, run, 1);
          column += run;
        }
      }
      cursor += glyph.advance + spacing;
    }
  }
}

/**
 * Découpe un texte en lignes tenant dans `maxWidth` pixels, sans couper de mot.
 * Les retours à la ligne explicites sont respectés.
 */
export function wrapText(text: string, maxWidth: number, letterSpacing = 0): readonly string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let current = "";
    for (const word of paragraph.split(" ")) {
      const candidate = current === "" ? word : `${current} ${word}`;
      if (measureText(candidate, letterSpacing) <= maxWidth || current === "") {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}
