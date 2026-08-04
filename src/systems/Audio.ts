export type SoundEffect =
  | "sword" | "hit" | "text" | "splash" | "anvil" | "secret"
  | "roll" | "pickup" | "hurt" | "charge" | "spin" | "step" | "deny";

export const SOUND_DEFINITIONS: Readonly<Record<SoundEffect, {
  readonly frequency: number; readonly duration: number;
  readonly type: OscillatorType; readonly volume: number;
  /** Glissando : rapport entre fréquence d'arrivée et de départ. */
  readonly slide?: number;
}>> = {
  sword: { frequency: 320, duration: 0.07, type: "square", volume: 0.05, slide: 0.4 },
  hit: { frequency: 120, duration: 0.06, type: "sawtooth", volume: 0.09, slide: 0.5 },
  text: { frequency: 620, duration: 0.02, type: "square", volume: 0.014 },
  splash: { frequency: 180, duration: 0.14, type: "triangle", volume: 0.05, slide: 0.35 },
  anvil: { frequency: 880, duration: 0.1, type: "square", volume: 0.035, slide: 0.7 },
  secret: { frequency: 660, duration: 0.22, type: "triangle", volume: 0.055, slide: 2 },
  roll: { frequency: 240, duration: 0.09, type: "triangle", volume: 0.035, slide: 0.55 },
  pickup: { frequency: 880, duration: 0.07, type: "square", volume: 0.03, slide: 1.5 },
  hurt: { frequency: 200, duration: 0.16, type: "sawtooth", volume: 0.075, slide: 0.35 },
  charge: { frequency: 300, duration: 0.3, type: "triangle", volume: 0.028, slide: 2.2 },
  spin: { frequency: 420, duration: 0.24, type: "square", volume: 0.05, slide: 1.7 },
  step: { frequency: 90, duration: 0.03, type: "triangle", volume: 0.016 },
  deny: { frequency: 160, duration: 0.09, type: "square", volume: 0.03, slide: 0.6 },
};

export type Mood = "village" | "forest" | "dungeon" | "boss" | "night" | "title";

/**
 * Progressions harmoniques par ambiance.
 *
 * La musique se limitait à un arpège unique de huit notes en boucle. Elle a
 * désormais une basse, une ligne mélodique et une nappe, sur des accords qui
 * tournent — de quoi tenir plus de trente secondes sans lasser.
 */
const PROGRESSIONS: Readonly<Record<Mood, readonly (readonly number[])[]>> = {
  village: [[262, 330, 392], [220, 262, 330], [294, 349, 440], [196, 247, 294]],
  forest: [[220, 262, 330], [175, 220, 262], [196, 247, 294], [147, 175, 220]],
  night: [[196, 233, 294], [175, 220, 262], [147, 185, 233], [165, 196, 247]],
  dungeon: [[110, 131, 165], [98, 117, 147], [104, 123, 156], [87, 110, 131]],
  boss: [[98, 117, 147], [104, 131, 156], [110, 139, 165], [93, 117, 139]],
  title: [[262, 330, 392], [233, 294, 349], [247, 311, 370], [220, 277, 330]],
};

export class Audio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private unlocked = false;
  private lastBeat = -1;
  private mood: Mood = "village";
  private muted = false;

  unlock(): void {
    if (this.unlocked || typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext;
    if (!AudioContextClass) return;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.context.destination);
    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = 0.5;
    this.musicGain.connect(this.master);
    void this.context.resume();
    this.unlocked = true;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  get isMuted(): boolean { return this.muted; }

  playSfx(effect: SoundEffect): void {
    if (this.muted) return;
    const definition = SOUND_DEFINITIONS[effect];
    this.tone(definition.frequency, definition.duration, definition.type,
      definition.volume, definition.slide, this.master);
  }

  /**
   * Avance la musique d'un pas. Un pas dure vingt frames ; l'accord change
   * toutes les huit mesures et la basse marque les temps forts.
   */
  update(frame: number, mood: Mood): void {
    if (!this.unlocked || this.muted) return;
    if (mood !== this.mood) {
      this.mood = mood;
      this.lastBeat = -1;
    }
    const beat = Math.floor(frame / 20);
    if (beat === this.lastBeat) return;
    this.lastBeat = beat;

    const progression = PROGRESSIONS[mood];
    const chord = progression[Math.floor(beat / 8) % progression.length]!;
    const step = ((beat % 8) + 8) % 8;

    if (step === 0 || step === 4) {
      this.tone(chord[0]! / 2, 0.34, "triangle", 0.03, 1, this.musicGain);
    }
    const melodyIndex = step < 4 ? step % chord.length : (7 - step) % chord.length;
    const octave = mood === "boss" && step % 2 === 1 ? 2 : 1;
    this.tone(chord[melodyIndex]! * octave, 0.18,
      mood === "dungeon" || mood === "night" ? "triangle" : "square", 0.012, 1, this.musicGain);
    if (step === 2) this.tone(chord[2]!, 0.7, "sine", 0.014, 1, this.musicGain);
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number,
    slide = 1, destination: GainNode | null = this.master): void {
    if (!this.context || !destination) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide !== 1) {
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(20, frequency * slide), now + duration);
    }
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + Math.min(0.012, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  }
}
