import { existsSync, readFileSync, writeFileSync } from "node:fs";

export interface GardenState {
  stageIndex: number;
  waterCount: number;
}

export interface Storage {
  load(): GardenState | null;
  save(state: GardenState): void;
}

/** Persists the garden as JSON at `path`. A missing file means a fresh garden. */
export class FileStorage implements Storage {
  constructor(private readonly path: string) {}

  load(): GardenState | null {
    if (!existsSync(this.path)) return null;
    return JSON.parse(readFileSync(this.path, "utf8")) as GardenState;
  }

  save(state: GardenState): void {
    writeFileSync(this.path, JSON.stringify(state));
  }
}
