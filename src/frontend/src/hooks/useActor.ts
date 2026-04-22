import { useActor as useCaffeineActor } from "@caffeineai/core-infrastructure";
import { createActor } from "../backend";

/**
 * Game actor hook — wraps the Caffeine core-infrastructure useActor
 * with the generated backend createActor function.
 *
 * Returns { actor, isFetching } where actor is the backend instance
 * (or null while loading / unauthenticated).
 */
export function useActor() {
  return useCaffeineActor(createActor);
}
