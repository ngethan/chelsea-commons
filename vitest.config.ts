import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Separate from vite.config.ts on purpose: the nitro dev plugin there fails to
 * initialize under Vitest's server, and none of the unit tests need it. The
 * one thing they do need from it is the `@/` alias, restated here.
 */
export default defineConfig({
	resolve: {
		alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
	},
	test: {
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		environment: "node",
	},
});
