import { CANAL_ROOMS, type WaterLevel } from "../data/dungeon";
import { PALETTE } from "../data/palette";
import { VIEW_HEIGHT, VIEW_WIDTH } from "../core/Renderer";

export class Dungeon {
  readonly valves: [WaterLevel, WaterLevel, WaterLevel, WaterLevel] = [0, 0, 0, 0];
  roomIndex = 0;
  bootsFound = false;
  leechDefeated = false;

  get room() { return CANAL_ROOMS[this.roomIndex]!; }

  waterLevel(index = this.roomIndex): WaterLevel {
    const room = CANAL_ROOMS[index]!;
    const delta = room.effects.reduce((sum, effect, valve) => sum + effect * this.valves[valve]!, 0);
    return Math.max(0, Math.min(2, room.baseWater + delta)) as WaterLevel;
  }

  turnValve(index: 0 | 1 | 2 | 3): string {
    this.valves[index] = ((this.valves[index] + 1) % 3) as WaterLevel;
    return `Vanne ${index + 1} : ${["fermée", "mi-ouverte", "ouverte"][this.valves[index]]}. Niveau ${["bas", "moyen", "haut"][this.waterLevel()]}.`;
  }

  enterRoom(index: number): string {
    this.roomIndex = Math.max(0, Math.min(CANAL_ROOMS.length - 1, index));
    if (this.room.id === "boots" && !this.bootsFound) {
      this.bootsFound = true;
      return "Vous obtenez les Bottes de Plomb ! L'épée reste utilisable sous l'eau.";
    }
    return `${this.room.name} — ${this.room.feature}.`;
  }

  drawWater(ctx: CanvasRenderingContext2D): void {
    const level = this.waterLevel();
    if (level === 0) return;
    ctx.save();
    ctx.globalAlpha = level === 1 ? 0.22 : 0.42;
    ctx.fillStyle = PALETTE.water;
    const height = level === 1 ? 72 : 160;
    ctx.fillRect(0, VIEW_HEIGHT - height, VIEW_WIDTH, height);
    ctx.strokeStyle = PALETTE.waterLight;
    for (let y = VIEW_HEIGHT - height + 5; y < VIEW_HEIGHT; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_WIDTH, y);
      ctx.stroke();
    }
    ctx.restore();
  }
}
