import { PALETTE } from "../data/palette";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../core/Renderer";
import type { Camera } from "../core/Camera";
import type { Weather } from "../core/Clock";
import type { Biome } from "../data/world";

interface Mote { x: number; y: number; vx: number; vy: number; size: number; tone: number }

const MOTE_COUNT = 46;
const RAIN_COUNT = 90;

/**
 * Couche atmosphérique dessinée par-dessus le monde : pluie, neige, brume,
 * pollen, lucioles. Elle défile légèrement avec la caméra, ce qui donne une
 * profondeur que la vieille grille d'éclats fixes n'avait pas.
 */
export class WeatherOverlay {
  private readonly motes: Mote[] = [];
  private readonly drops: Mote[] = [];
  private frame = 0;
  /** Éclair : compte à rebours d'un flash blanc pendant l'orage. */
  private flash = 0;
  private nextFlash = 600;

  constructor() {
    for (let index = 0; index < MOTE_COUNT; index += 1) {
      this.motes.push(this.spawnMote(index));
    }
    for (let index = 0; index < RAIN_COUNT; index += 1) {
      this.drops.push({
        x: (index * 71) % VIEW_WIDTH,
        y: (index * 43) % VIEW_HEIGHT,
        vx: -1.4, vy: 7 + (index % 3), size: 6 + (index % 4), tone: index % 3,
      });
    }
  }

  private spawnMote(seed: number): Mote {
    return {
      x: (seed * 53) % VIEW_WIDTH,
      y: (seed * 37) % VIEW_HEIGHT,
      vx: 0.12 + ((seed % 5) * 0.06),
      vy: -0.05 + ((seed % 7) * 0.02),
      size: seed % 6 === 0 ? 2 : 1,
      tone: seed % 4,
    };
  }

  update(weather: Weather, biome: Biome | undefined): void {
    this.frame += 1;
    const wind = biome === "peaks" || biome === "cliffs" ? 1.7 : 1;

    for (const mote of this.motes) {
      mote.x += mote.vx * wind + Math.sin((this.frame + mote.y) / 60) * 0.25;
      mote.y += mote.vy + Math.cos((this.frame + mote.x) / 90) * 0.18;
      if (mote.x > VIEW_WIDTH + 4) mote.x = -4;
      if (mote.x < -4) mote.x = VIEW_WIDTH + 4;
      if (mote.y > VIEW_HEIGHT + 4) mote.y = -4;
      if (mote.y < -4) mote.y = VIEW_HEIGHT + 4;
    }

    // Pluie et orage font tomber de l'eau ; l'orage la fait tomber de biais et
    // beaucoup plus vite, et sa foudre ne se fait pas attendre.
    if (weather === "rain" || weather === "storm") {
      const gust = weather === "storm" ? 2.4 : 1;
      for (const drop of this.drops) {
        drop.x += drop.vx * gust;
        drop.y += drop.vy * gust;
        if (drop.y > VIEW_HEIGHT) { drop.y = -8; drop.x = (drop.x + 137) % VIEW_WIDTH; }
        if (drop.x < -8) drop.x += VIEW_WIDTH + 16;
      }
      if (this.flash > 0) this.flash -= 1;
      else if (this.frame > this.nextFlash) {
        this.flash = weather === "storm" ? 14 : 8;
        const wait = weather === "storm" ? 150 : 520;
        this.nextFlash = this.frame + wait + (this.frame % (wait / 2));
      }
    }

    // La neige tombe droit et lentement : elle se distingue de la pluie à
    // l'œil, ce qui est le minimum qu'on attende d'une neige.
    if (weather === "snow") {
      for (const drop of this.drops) {
        drop.x += Math.sin((this.frame + drop.y) / 40) * 0.3;
        drop.y += 0.5 + (drop.tone * 0.18);
        if (drop.y > VIEW_HEIGHT) { drop.y = -6; drop.x = (drop.x + 89) % VIEW_WIDTH; }
      }
    }
  }

  /** Vrai pendant l'éclair : le jeu s'en sert pour frapper au bon moment. */
  get lightning(): boolean { return this.flash > 0; }

  draw(ctx: CanvasRenderingContext2D, camera: Camera, weather: Weather,
    biome: Biome | undefined, night: boolean): void {
    ctx.save();
    // Léger parallaxe : la couche flotte devant le décor.
    const driftX = -(camera.x * 0.12) % VIEW_WIDTH;
    const driftY = -(camera.y * 0.12) % VIEW_HEIGHT;

    // Le temps qu'il fait passe avant le décor : une neige d'hiver doit tomber
    // sur les champs comme sur les cimes, sinon la saison ne se voit nulle part.
    if (weather === "snow") this.drawSnowfall(ctx);
    else if (biome === "peaks") this.drawSnow(ctx, driftX, driftY);
    else if (weather === "fog" || biome === "marsh" || biome === "reeds") this.drawMist(ctx);
    else if (night && (biome === "forest" || biome === "witch")) this.drawFireflies(ctx, driftX, driftY);
    else this.drawMotes(ctx, driftX, driftY, biome);

    if (weather === "rain" || weather === "storm") this.drawRain(ctx, weather === "storm");
    if (weather === "fog") this.drawFogBank(ctx);
    ctx.restore();
  }

  private drawMotes(ctx: CanvasRenderingContext2D, dx: number, dy: number, biome: Biome | undefined): void {
    const palette = biome === "lake" || biome === "river" || biome === "canal"
      ? [PALETTE.waterLight, PALETTE.white, PALETTE.cream]
      : [PALETTE.leafLight, PALETTE.grassLight, PALETTE.cream];
    ctx.globalAlpha = 0.4;
    for (const mote of this.motes) {
      ctx.fillStyle = palette[mote.tone % palette.length]!;
      ctx.fillRect(wrap(mote.x + dx, VIEW_WIDTH), wrap(mote.y + dy, VIEW_HEIGHT), mote.size, mote.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawSnow(ctx: CanvasRenderingContext2D, dx: number, dy: number): void {
    ctx.globalAlpha = 0.8;
    for (const mote of this.motes) {
      ctx.fillStyle = mote.tone === 0 ? PALETTE.white : PALETTE.cream;
      const x = wrap(mote.x * 1.6 + this.frame * 0.9 + dx, VIEW_WIDTH);
      const y = wrap(mote.y + this.frame * 0.7 + dy, VIEW_HEIGHT);
      ctx.fillRect(x, y, mote.size, mote.size);
    }
    ctx.globalAlpha = 1;
  }

  private drawMist(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = PALETTE.cream;
    for (let band = 0; band < 6; band += 1) {
      const x = ((this.frame * 0.4 + band * 91) % (VIEW_WIDTH + 160)) - 160;
      const y = 20 + band * 34 + Math.sin((this.frame + band * 40) / 90) * 6;
      ctx.fillRect(x, y, 150, 3);
      ctx.fillRect(x + 30, y + 3, 110, 2);
    }
    ctx.globalAlpha = 1;
  }

  private drawFireflies(ctx: CanvasRenderingContext2D, dx: number, dy: number): void {
    for (const mote of this.motes) {
      // Chaque luciole a son propre rythme : le champ ne clignote pas en chœur.
      const pulse = (Math.sin((this.frame + mote.x * 3) / 26) + 1) / 2;
      if (pulse < 0.25) continue;
      const x = wrap(mote.x + dx, VIEW_WIDTH);
      const y = wrap(mote.y + dy, VIEW_HEIGHT);
      ctx.globalAlpha = pulse * 0.35;
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x - 1, y - 1, 4, 4);
      ctx.globalAlpha = pulse;
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  /** Chute de neige plein cadre : flocons ronds, lents, sans traînée. */
  private drawSnowfall(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = 0.85;
    for (const drop of this.drops) {
      ctx.fillStyle = drop.tone === 0 ? PALETTE.white : PALETTE.cream;
      const size = drop.tone === 0 ? 2 : 1;
      ctx.fillRect(Math.round(drop.x), Math.round(drop.y), size, size);
    }
    ctx.globalAlpha = 1;
  }

  /** Nappe de brouillard : elle mange le fond de l'image, pas les bords. */
  private drawFogBank(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = PALETTE.stoneLight;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = PALETTE.white;
    for (let band = 0; band < 5; band += 1) {
      const y = ((this.frame * 0.22 + band * 47) % (VIEW_HEIGHT + 40)) - 20;
      ctx.fillRect(0, Math.round(y), VIEW_WIDTH, 12);
    }
    ctx.globalAlpha = 1;
  }

  private drawRain(ctx: CanvasRenderingContext2D, storm = false): void {
    if (this.flash > 0) {
      ctx.globalAlpha = this.flash / (storm ? 18 : 14);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
    ctx.globalAlpha = storm ? 0.68 : 0.5;
    ctx.strokeStyle = PALETTE.waterLight;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const drop of this.drops) {
      const slant = storm ? 6 : 2;
      ctx.moveTo(Math.round(drop.x), Math.round(drop.y));
      ctx.lineTo(Math.round(drop.x - slant), Math.round(drop.y + drop.size * (storm ? 1.6 : 1)));
    }
    ctx.stroke();
    // Impacts au sol : la pluie touche quelque chose, elle ne traverse pas.
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = PALETTE.waterLight;
    for (const drop of this.drops) {
      if ((drop.y | 0) % 37 !== 0) continue;
      ctx.fillRect(Math.round(drop.x) - 2, Math.round(drop.y), 5, 1);
    }
    ctx.globalAlpha = 1;
  }
}

function wrap(value: number, limit: number): number {
  const wrapped = value % limit;
  return Math.round(wrapped < 0 ? wrapped + limit : wrapped);
}

/** Bordure sombre qui referme l'image et concentre le regard. */
export function drawVignette(ctx: CanvasRenderingContext2D, strength = 0.45): void {
  const gradient = ctx.createRadialGradient(
    VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_HEIGHT * 0.34,
    VIEW_WIDTH / 2, VIEW_HEIGHT / 2, VIEW_WIDTH * 0.72,
  );
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, `rgba(8,6,14,${strength})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}
