export interface AssetManifest {
  readonly images: Readonly<Record<string, string>>;
  readonly audio: Readonly<Record<string, string>>;
}

export class Assets {
  private readonly images = new Map<string, HTMLImageElement>();

  async preload(manifest: AssetManifest): Promise<void> {
    await Promise.all(Object.entries(manifest.images).map(([id, src]) => new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () => { this.images.set(id, image); resolve(); };
      image.onerror = () => reject(new Error(`Asset introuvable : ${src}`));
      image.src = src;
    })));
  }

  image(id: string): HTMLImageElement | null { return this.images.get(id) ?? null; }
}
