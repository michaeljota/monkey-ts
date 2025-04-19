import { type ComputedState, effect } from "signux";

export function waitUntil($condition: ComputedState<boolean>): Promise<void> {
  return new Promise((resolve) => {
    effect(() => {
      $condition() && resolve();
    });
  });
}
