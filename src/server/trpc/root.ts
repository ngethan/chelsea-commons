import { createCallerFactory, createTRPCRouter } from "./init";
import { accessRouter } from "./routers/access";
import { aiRouter } from "./routers/ai";
import { authRouter } from "./routers/auth";
import { contactsRouter } from "./routers/contacts";
import { interactionsRouter } from "./routers/interactions";
import { linksRouter } from "./routers/links";
import { organizationsRouter } from "./routers/organizations";
import { searchRouter } from "./routers/search";
import { updatesRouter } from "./routers/updates";

/**
 * Every endpoint this server exposes. Keeping them in one file is the point:
 * `procedures.test.ts` reads this module's routers and fails the build if a
 * procedure is public without being on its short list of arguments for why.
 */
const core = {
	auth: authRouter,
	access: accessRouter,
	contacts: contactsRouter,
	organizations: organizationsRouter,
	updates: updatesRouter,
	links: linksRouter,
	interactions: interactionsRouter,
	search: searchRouter,
};

export const appRouter = createTRPCRouter({
	...core,
	ai: aiRouter,
});

export type AppRouter = typeof appRouter;

/**
 * What the assistant calls on the person's behalf: everything except itself.
 * Its own router is left out so the caller's type does not depend on the
 * router that depends on the caller, which is a cycle TypeScript resolves by
 * giving up on the whole thing.
 */
export const createCoreCaller = createCallerFactory(createTRPCRouter(core));
