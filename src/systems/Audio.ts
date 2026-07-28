export type SoundEffect = "sword" | "hit" | "text" | "splash" | "anvil" | "secret";

export const SOUND_DEFINITIONS: Readonly<Record<SoundEffect, {
  readonly frequency: number; readonly duration: number; readonly type: OscillatorType; readonly volume: number;
}>> = {
  sword: { frequency: 180, duration: 0.06, type: "square", volume: 0.05 },
  hit: { frequency: 92, duration: 0.045, type: "sawtooth", volume: 0.08 },
  text: { frequency: 520, duration: 0.025, type: "square", volume: 0.018 },
  splash: { frequency: 130, duration: 0.12, type: "triangle", volume: 0.05 },
  anvil: { frequency: 760, duration: 0.09, type: "square", volume: 0.035 },
  secret: { frequency: 880, duration: 0.18, type: "triangle", volume: 0.05 }
};

export class Audio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private unlocked = false;
  private lastMusicFrame = -1;

  unlock(): void {
    if (this.unlocked) return;
    const AudioContextClass = window.AudioContext;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.55;
    this.master.connect(this.context.destination);
    void this.context.resume();
    this.unlocked = true;
  }

  playSfx(effect: SoundEffect): void {
    const definition = SOUND_DEFINITIONS[effect];
    this.tone(definition.frequency, definition.duration, definition.type, definition.volume);
  }

  update(frame: number, mood: "village" | "forest" | "dungeon" | "boss"): void {
    if (!this.unlocked || frame - this.lastMusicFrame < 30) return;
    this.lastMusicFrame = frame;
    const scales = {
      village: [262, 330, 392, 330, 294, 349, 440, 349],
      forest: [220, 262, 330, 247, 196, 247, 294, 247],
      dungeon: [110, 131, 147, 123, 98, 110, 147, 131],
      boss: [98, 147, 104, 156, 110, 165, 123, 185]
    } as const;
    const note = scales[mood][Math.floor(frame / 30) % 8]!;
    this.tone(note, 0.16, mood === "dungeon" ? "triangle" : "square", 0.012);
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }
}
