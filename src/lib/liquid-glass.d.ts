export interface GlassOptions {
  fit?: boolean;
  radius?: number;
  refraction?: number;
  bezel?: number;
  curvature?: number;
  chroma?: number;
  blur?: number;
  specular?: number;
  mapScale?: number;
}

export function createGlass(target: HTMLElement, options?: GlassOptions): {
  destroy(): void;
};
