import type { Context } from "@/server/trpc/init";
import type { createCoreCaller } from "@/server/trpc/root";

export type SignedIn = Context & { user: NonNullable<Context["user"]> };

export type Caller = ReturnType<typeof createCoreCaller>;

/**
 * The assistant reads and writes through the same tRPC procedures the admin's
 * buttons call, with the same signed-in context, so it can do nothing a
 * person at the keyboard could not, and everything it does is logged and
 * reindexed the same way.
 *
 * Imported lazily because the `ai` router sits inside `appRouter`, and a
 * static import here would be a cycle at load time.
 */
export async function makeCaller(ctx: SignedIn): Promise<Caller> {
	const { createCoreCaller } = await import("@/server/trpc/root");
	return createCoreCaller(ctx);
}
