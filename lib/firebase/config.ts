/**
 * Firebase has been fully removed from this build.
 *
 * These exports are left in place only so that existing imports like
 * `import { db } from "@/lib/firebase/config"` continue to compile.
 * They are typed as `any` and set to `null`, so any remaining runtime
 * Firebase calls will no-op / throw instead of talking to a real backend.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const app: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const storage: any = null;

