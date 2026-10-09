import type { Storage } from "./storage.js";

export const STAGES = ["seed", "sprout", "sapling", "bonsai"] as const;
export type Stage = (typeof STAGES)[number];

export class Garden {
  constructor(private readonly storage: Storage) {}

  get stage(): Stage {
    return STAGES[0];
  }

  water(): void {}
}
