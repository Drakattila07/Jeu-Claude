import { PALETTE } from "../data/palette";
import type { InteractableData } from "../data/interactables";
import type { Vec2 } from "./Entity";
import { Entity } from "./Entity";

export type InteractionResult = { readonly message: string; readonly changed: boolean };

export class ZoneObjectState {
  private readonly values = new Map<string, boolean>();
  get(zoneId: string, entityId: string): boolean { return this.values.get(`${zoneId}:${entityId}`) ?? false; }
  set(zoneId: string, entityId: string): void { this.values.set(`${zoneId}:${entityId}`, true); }
  entries(): readonly [string, boolean][] { return [...this.values.entries()]; }
  restore(entries: readonly [string, boolean][]): void {
    this.values.clear();
    for (const [key, value] of entries) this.values.set(key, value);
  }
}

export class Interactable extends Entity {
  constructor(
    readonly data: InteractableData,
    private readonly state: ZoneObjectState,
  ) {
    super({ x: data.x, y: data.y }, { x: 1, y: 5, width: 14, height: 11 });
    this.depth = 8;
  }

  update(): void {}

  distanceTo(position: Readonly<Vec2>): number {
    return Math.hypot(this.position.x - position.x, this.position.y - position.y);
  }

  bounds(): { x: number; y: number; width: number; height: number } {
    return { x: this.position.x + this.hitbox.x, y: this.position.y + this.hitbox.y,
      width: this.hitbox.width, height: this.hitbox.height };
  }

  /** Kinds qui ne se déclenchent qu'une fois puis restent consommés. */
  private static readonly ONE_SHOT = new Set<string>([
    "chest", "seal", "roots", "mechanism", "footprints", "pickup", "secret",
    "offering", "shrine",
  ]);

  get isSpent(): boolean { return this.state.get(this.data.zone, this.data.id); }

  /**
   * Objets qui disparaissent une fois consommés. Tant qu'ils restaient
   * interrogeables, appuyer sur « agir » devant une racine déjà tranchée
   * rouvrait sans fin sa réplique — « des racines bloquent la vanne » — sur un
   * emplacement vide. On avait toutes les raisons de croire à un blocage.
   */
  private static readonly VANISHING = new Set<string>(["roots", "bush", "pickup"]);

  /** Faux quand l'objet a été consommé et n'est plus dessiné. */
  get isPresent(): boolean {
    return !this.isSpent || !Interactable.VANISHING.has(this.data.kind);
  }

  interact(): InteractionResult {
    if (Interactable.ONE_SHOT.has(this.data.kind)) {
      if (this.state.get(this.data.zone, this.data.id)) return { message: "Il n'y a plus rien ici.", changed: false };
      this.state.set(this.data.zone, this.data.id);
      return { message: this.data.text, changed: true };
    }
    if (this.data.kind === "bush") {
      this.state.set(this.data.zone, this.data.id);
      return { message: "Le buisson se disperse en feuilles.", changed: true };
    }
    return { message: this.data.text, changed: false };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    // Un objet consommé qui disparaît ne se dessine pas — et surtout, on sort
    // AVANT `save()`.
    //
    // Les branches « racines » et « ramassage » sortaient après, sans
    // `restore()` : la pile d'états du canvas gagnait un cran à chaque image.
    // Le `restore()` du rendu dépilait alors le mauvais état, la translation
    // de caméra restait appliquée, et toute l'interface — cœurs, horloge,
    // minicarte, encarts — se dessinait hors de l'écran. Le jeu paraissait
    // figé sur un décor nu, juste après avoir tranché une racine.
    if (!this.isPresent) return;
    const x = Math.round(this.position.x);
    const y = Math.round(this.position.y);
    ctx.save();
    if (this.data.kind === "well") {
      // Le puits n'avait aucun dessin : la Place du Puits n'en montrait
      // aucun. Margelle, poteaux, toiture et seau, sur deux cases de haut.
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x - 2, y + 12, 20, 4);
      ctx.globalAlpha = 1;
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(x - 3, y + 2, 22, 12);
      ctx.fillStyle = PALETTE.stone;
      ctx.fillRect(x - 2, y + 1, 20, 11);
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(x - 1, y + 1, 18, 2);
      for (let block = 0; block < 5; block += 1) {
        ctx.fillStyle = PALETTE.stoneDark;
        ctx.fillRect(x - 2 + block * 4, y + 4, 1, 8);
      }
      // Gueule d'eau sombre au centre.
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 1, y + 3, 14, 7);
      ctx.fillStyle = PALETTE.deepWater;
      ctx.fillRect(x + 2, y + 4, 12, 5);
      ctx.fillStyle = PALETTE.waterLight;
      ctx.fillRect(x + 4, y + 5, 5, 1);
      // Poteaux et toiture.
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x - 1, y - 14, 3, 16);
      ctx.fillRect(x + 14, y - 14, 3, 16);
      ctx.fillStyle = PALETTE.roofDark;
      ctx.fillRect(x - 4, y - 18, 24, 6);
      ctx.fillStyle = PALETTE.roof;
      ctx.fillRect(x - 3, y - 17, 22, 4);
      ctx.fillStyle = PALETTE.rose;
      ctx.fillRect(x - 2, y - 17, 20, 1);
      // Treuil et seau suspendu.
      ctx.fillStyle = PALETTE.woodLight;
      ctx.fillRect(x, y - 11, 16, 3);
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(x + 7, y - 8, 1, 5);
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 5, y - 4, 6, 5);
      ctx.fillStyle = PALETTE.wood;
      ctx.fillRect(x + 6, y - 3, 4, 3);
    } else if (this.data.kind === "sign") {
      // Panneau : planche clouée sur un piquet, texte suggéré par deux traits.
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 3, y + 13, 10, 3);
      ctx.globalAlpha = 1;
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 6, y + 2, 4, 13);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x - 2, y - 8, 20, 12);
      ctx.fillStyle = PALETTE.wood;
      ctx.fillRect(x - 1, y - 7, 18, 10);
      ctx.fillStyle = PALETTE.woodLight;
      ctx.fillRect(x - 1, y - 7, 18, 2);
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 1, y - 4, 13, 1);
      ctx.fillRect(x + 1, y - 1, 9, 1);
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(x - 1, y - 8, 2, 2);
      ctx.fillRect(x + 15, y - 8, 2, 2);
    } else if (this.data.kind === "chest") {
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 1, y + 5, 14, 10);
      ctx.fillStyle = this.state.get(this.data.zone, this.data.id) ? PALETTE.stone : PALETTE.woodLight;
      ctx.fillRect(x + 2, y + 4, 12, 5);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 7, y + 8, 2, 3);
    } else if (this.data.kind === "pot") {
      ctx.fillStyle = PALETTE.sandLight;
      ctx.fillRect(x + 4, y + 3, 8, 3);
      ctx.fillStyle = PALETTE.soil;
      ctx.fillRect(x + 2, y + 6, 12, 8);
    } else if (this.data.kind === "bush") {
      ctx.fillStyle = PALETTE.leafDark;
      ctx.fillRect(x + 1, y + 6, 14, 9);
      ctx.fillStyle = PALETTE.leaf;
      ctx.fillRect(x + 3, y + 3, 6, 9);
      ctx.fillRect(x + 8, y + 2, 5, 10);
    } else if (this.data.kind === "cauldron") {
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 1, y + 6, 14, 8);
      ctx.fillStyle = PALETTE.purple;
      ctx.fillRect(x + 3, y + 5, 10, 3);
      ctx.fillStyle = PALETTE.leafLight;
      ctx.fillRect(x + 5, y + 2, 2, 2);
      ctx.fillRect(x + 10, y, 2, 2);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x + 5, y + 14, 6, 2);
    } else if (this.data.kind === "valve") {
      ctx.strokeStyle = PALETTE.stoneLight;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.roof;
      ctx.fillRect(x + 7, y + 2, 2, 12);
      ctx.fillRect(x + 2, y + 7, 12, 2);
    } else if (this.data.kind === "roots") {
      ctx.strokeStyle = PALETTE.woodDark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y + 2);
      ctx.bezierCurveTo(x + 14, y + 4, x + 1, y + 12, x + 16, y + 15);
      ctx.moveTo(x + 16, y + 1);
      ctx.bezierCurveTo(x + 2, y + 5, x + 15, y + 10, x, y + 15);
      ctx.stroke();
    } else if (this.data.kind === "footprints") {
      ctx.fillStyle = PALETTE.soil;
      ctx.fillRect(x + 2, y + 9, 5, 7);
      ctx.fillRect(x + 10, y + 1, 5, 7);
    } else if (this.data.kind === "seal") {
      ctx.fillStyle = this.state.get(this.data.zone, this.data.id) ? PALETTE.leafLight : PALETTE.stoneDark;
      ctx.fillRect(x + 2, y + 2, 12, 12);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 7, y + 4, 2, 8);
      ctx.fillRect(x + 4, y + 7, 8, 2);
    } else if (this.data.kind === "mechanism") {
      ctx.strokeStyle = this.state.get(this.data.zone, this.data.id) ? PALETTE.waterLight : PALETTE.stoneLight;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x + 8, y + 8, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 6, y + 6, 4, 4);
    } else if (this.data.kind === "pickup") {
      ctx.fillStyle = PALETTE.woodLight;
      ctx.fillRect(x + 7, y, 2, 13);
      ctx.strokeStyle = PALETTE.cream;
      ctx.beginPath();
      ctx.arc(x + 11, y + 11, 4, 0, Math.PI);
      ctx.stroke();
    } else if (this.data.kind === "secret") {
      ctx.fillStyle = this.state.get(this.data.zone, this.data.id) ? PALETTE.yellow : PALETTE.purple;
      ctx.fillRect(x + 5, y + 5, 6, 6);
      ctx.fillRect(x + 7, y + 2, 2, 12);
      ctx.fillRect(x + 2, y + 7, 12, 2);
    } else if (this.data.kind === "offering") {
      // Un petit autel : socle de pierre et coupe qui s'allume une fois servie.
      const served = this.state.get(this.data.zone, this.data.id);
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(x + 2, y + 10, 12, 5);
      ctx.fillStyle = PALETTE.stone;
      ctx.fillRect(x + 3, y + 7, 10, 4);
      ctx.fillStyle = served ? PALETTE.yellow : PALETTE.stoneLight;
      ctx.fillRect(x + 5, y + 4, 6, 4);
      if (served) {
        ctx.fillStyle = PALETTE.cream;
        ctx.fillRect(x + 7, y + 1, 2, 3);
      }
    } else if (this.data.kind === "shrine") {
      // Trois pierres levées ; la centrale s'ouvre quand l'énigme cède.
      const solved = this.state.get(this.data.zone, this.data.id);
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(x + 1, y + 6, 3, 9);
      ctx.fillRect(x + 12, y + 6, 3, 9);
      ctx.fillStyle = solved ? PALETTE.leafLight : PALETTE.stone;
      ctx.fillRect(x + 5, y + 2, 6, 13);
      ctx.fillStyle = solved ? PALETTE.yellow : PALETTE.stoneDark;
      ctx.fillRect(x + 7, y + 6, 2, 5);
    } else if (this.data.kind === "anvil") {
      // Billot, enclume, marteau posé dessus. Une forge se reconnaît de loin.
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 3, y + 10, 10, 6);
      ctx.fillStyle = PALETTE.stoneDark;
      ctx.fillRect(x + 2, y + 5, 12, 5);
      ctx.fillRect(x + 5, y + 8, 6, 3);
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(x + 3, y + 5, 10, 2);
      ctx.fillStyle = PALETTE.wood;
      ctx.fillRect(x + 9, y + 1, 2, 5);
      ctx.fillStyle = PALETTE.stone;
      ctx.fillRect(x + 7, y, 6, 3);
    } else if (this.data.kind === "dovecote") {
      // Pigeonnier sur son mât, avec une bête à l'entrée.
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 7, y + 9, 2, 7);
      ctx.fillStyle = PALETTE.wood;
      ctx.fillRect(x + 2, y + 3, 12, 7);
      ctx.fillStyle = PALETTE.roofDark;
      ctx.fillRect(x + 1, y + 1, 14, 3);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(x + 6, y + 5, 4, 4);
      ctx.fillStyle = PALETTE.stoneLight;
      ctx.fillRect(x + 10, y + 6, 3, 3);
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(x + 12, y + 6, 1, 1);
    } else if (this.data.kind === "campfire") {
      ctx.fillStyle = PALETTE.woodDark;
      ctx.fillRect(x + 2, y + 11, 12, 3);
      ctx.fillRect(x + 4, y + 9, 8, 3);
      ctx.fillStyle = PALETTE.red;
      ctx.fillRect(x + 5, y + 4, 6, 6);
      ctx.fillStyle = PALETTE.yellow;
      ctx.fillRect(x + 6, y + 5, 4, 4);
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(x + 7, y + 6, 2, 2);
    }
    ctx.restore();
  }
}
