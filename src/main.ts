import "./style.css";
import { Game } from "./core/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Le canvas #game est introuvable.");

const game = new Game(canvas);
declare global {
  interface Window { __RACINES_GAME__?: Game }
}
window.__RACINES_GAME__ = game;
game.start();
canvas.focus();
