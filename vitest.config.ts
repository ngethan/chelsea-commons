import { defineConfig } from "vitest/config";

/**
 * Separate from vite.config.ts on purpose: the nitro dev plugin there fails to
 * initialize under Vitest's server, and none of the unit tests need it.
 */
export default defineConfig({
	test: {
		include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
		environment: "node",
	},
});
