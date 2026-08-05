import { describe, expect, it } from "vitest";
import { MotherTreeBoss } from "../entities/Boss";
import type { Player } from "../entities/Player";

function makePlayer(): Player {
  return { position: { x: 240, y: 320 } } as Player;
}

describe("Arbre-Mère", () => {
  it("passe par trois phases selon ses cœurs", () => {
    const boss = new MotherTreeBoss(makePlayer());
    expect(boss.phase).toBe(1);
    boss.hearts = 12;
    expect(boss.phase).toBe(2);
    boss.hearts = 5;
    expect(boss.phase).toBe(3);
  });

  it("encaisse sans dommage tant que son écorce est fermée", () => {
    // Le combat se gagnait en martelant sans réfléchir : elle refuse
    // désormais les coups portés hors de sa fenêtre de faiblesse.
    const boss = new MotherTreeBoss(makePlayer());
    boss.exposedFrames = 0;
    boss.flashFrames = 0;
    expect(boss.hit()).toBe(false);
    expect(boss.hearts).toBe(boss.maxHearts);
  });

  it("tombe quand on frappe chacune de ses ouvertures", () => {
    const boss = new MotherTreeBoss(makePlayer());
    for (let index = 0; index < boss.maxHearts; index += 1) {
      boss.flashFrames = 0;
      boss.exposedFrames = 10;
      boss.hit();
    }
    expect(boss.active).toBe(false);
  });

  it("tient compte de la force du coup", () => {
    // La quantité était ignorée : un coup tournoyant chargé retirait autant
    // qu'une pichenette, et aucune amélioration d'épée ne se sentait.
    const light = new MotherTreeBoss(makePlayer());
    light.exposedFrames = 10;
    light.hit(1);
    const heavy = new MotherTreeBoss(makePlayer());
    heavy.exposedFrames = 10;
    heavy.hit(4);
    expect(heavy.hearts).toBeLessThan(light.hearts);
  });

  it("brûle sur la durée, écorce ouverte ou non", () => {
    // C'est la réponse de la forme démoniaque : le bois sec ne se protège pas.
    const boss = new MotherTreeBoss(makePlayer());
    expect(boss.ignite()).toBe(true);
    expect(boss.isBurning).toBe(true);
    const before = boss.hearts;
    boss.exposedFrames = 0;
    for (let frame = 0; frame < 100; frame += 1) boss.update();
    expect(boss.hearts).toBeLessThan(before);
  });

  it("mord davantage sur un arbre déjà en flammes", () => {
    const plain = new MotherTreeBoss(makePlayer());
    plain.exposedFrames = 10;
    plain.hit(2);

    const ablaze = new MotherTreeBoss(makePlayer());
    ablaze.ignite();
    ablaze.exposedFrames = 10;
    ablaze.hit(2);
    expect(ablaze.hearts).toBe(plain.hearts - 1);
  });

  it("finit par s'éteindre : le feu ne gagne pas seul indéfiniment", () => {
    const boss = new MotherTreeBoss(makePlayer());
    boss.ignite();
    for (let frame = 0; frame < 600; frame += 1) boss.update();
    if (boss.active) expect(boss.isBurning).toBe(false);
  });

  it("répand ses flammes sur toute la silhouette", () => {
    // Le semis était calculé — et se repliait sur une seule colonne : l'arbre
    // brûlait par la tranche, invisible de face.
    function rectangles(burning: boolean): string[] {
      const boss = new MotherTreeBoss(makePlayer());
      if (burning) boss.ignite();
      const drawn: string[] = [];
      const ctx = {
        save() {}, restore() {},
        globalAlpha: 1, fillStyle: "",
        fillRect(x: number, y: number, w: number, h: number) { drawn.push(`${x},${y},${w},${h}`); },
      } as unknown as CanvasRenderingContext2D;
      boss.draw(ctx);
      return drawn;
    }
    // La différence entre l'arbre nu et l'arbre en feu, c'est l'incendie.
    const nu = new Set(rectangles(false));
    const flammes = rectangles(true)
      .filter((rect) => !nu.has(rect))
      .map((rect) => rect.split(",").map(Number) as [number, number, number, number]);

    // Le corps d'une flamme fait quatre pixels de large ; la fumée, cinq. Il
    // faut les séparer, sinon le panache comble les trous et l'on ne voit
    // plus que les foyers sont massés au même endroit.
    const foyers = flammes.filter(([, , largeur]) => largeur === 4);
    expect(foyers.length).toBeGreaterThan(8);

    // L'étendue ne suffit pas à juger : deux foyers aux extrémités la
    // remplissent aussi. On exige du feu dans chaque quart de la silhouette —
    // c'est ce que le semis calculé ne faisait pas.
    const gauche = Math.min(...foyers.map(([x]) => x));
    const quarts = new Set(foyers.map(([x]) => Math.min(3, Math.floor((x - gauche) / 16))));
    expect(quarts.size, "foyers massés sur un bord").toBe(4);

    const lignes = foyers.map(([, y]) => y);
    expect(Math.max(...lignes) - Math.min(...lignes), "feu cantonné à une hauteur")
      .toBeGreaterThan(40);
  });

  it("ouvre son écorce après chaque salve", () => {
    const boss = new MotherTreeBoss(makePlayer());
    let opened = false;
    for (let frame = 0; frame < 200 && !opened; frame += 1) {
      boss.update();
      if (boss.isExposed) opened = true;
    }
    expect(opened).toBe(true);
    expect(boss.seeds.length).toBeGreaterThan(0);
  });

  it("annonce ses racines avant qu'elles ne blessent", () => {
    const boss = new MotherTreeBoss(makePlayer());
    boss.hearts = 4; // troisième phase
    for (let frame = 0; frame < 100; frame += 1) boss.update();
    expect(boss.spikes.length).toBeGreaterThan(0);
    // Une racine qui vient de percer ne touche pas encore.
    const fresh = boss.spikes.filter((spike) => spike.timer > 26);
    if (fresh.length > 0) expect(boss.spikeBounds().length).toBeLessThan(boss.spikes.length);
  });
});
