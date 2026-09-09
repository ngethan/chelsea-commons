import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { routeTree } from "./routeTree.gen";
import { makeTRPCClient, makeVanillaClient, trpc } from "./trpc/client";

export const getRouter = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 30_000,
				retry: false,
				refetchOnWindowFocus: false,
			},
		},
	});

	const trpcClient = makeTRPCClient();
	const api = makeVanillaClient();

	const router = createRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		context: { queryClient, api },
		Wrap: ({ children }) => (
			<trpc.Provider client={trpcClient} queryClient={queryClient}>
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			</trpc.Provider>
		),
	});

	setupRouterSsrQueryIntegration({ router, queryClient });

	return router;
};
