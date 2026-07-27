import "./style.css";
import { Game } from "./core/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#game");
if (!canvas) throw new Error("Le canvas #game est introuvable.");

const game = new Game(canvas);
game.start();
canvas.focus();
