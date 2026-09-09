import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRouteWithContext,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AnimatePresence, MotionConfig } from "motion/react";
import type React from "react";
import { useEffect } from "react";
import type { makeVanillaClient } from "../trpc/client";

import { ADMIN_GROUND, isAdminPath } from "../lib/admin-theme";
import { buildSeoTags, siteConfig } from "../site-config";
import appCss from "../styles.css?url";

/**
 * `api` is a plain tRPC caller for the places React hooks cannot reach, which
 * in practice means `beforeLoad` deciding whether to redirect to sign-in.
 */
export type RouterContext = {
	queryClient: QueryClient;
	api: ReturnType<typeof makeVanillaClient>;
};

export const Route = createRootRouteWithContext<RouterContext>()({
	head: () => {
		const baseSeo = buildSeoTags({
			title: siteConfig.name,
			description: siteConfig.description,
			path: "/",
		});

		return {
			title: baseSeo.title,
			meta: [
				{
					charSet: "utf-8",
				},
				{
					name: "viewport",
					content: "width=device-width, initial-scale=1, viewport-fit=cover",
				},
				...baseSeo.meta,
				{
					name: "application-name",
					content: siteConfig.shortName,
				},
				{
					name: "theme-color",
					content: siteConfig.themeColor,
				},
				{
					name: "apple-mobile-web-app-status-bar-style",
					content: "default",
				},
			],
			links: [
				{
					rel: "stylesheet",
					href: appCss,
				},
				...baseSeo.links,
				{
					rel: "icon",
					type: "image/png",
					sizes: "16x16",
					href: "/favicon-16x16.png",
				},
				{
					rel: "icon",
					type: "image/png",
					sizes: "32x32",
					href: "/favicon-32x32.png",
				},
				{
					rel: "icon",
					href: "/favicon.ico",
				},
				{
					rel: "apple-touch-icon",
					sizes: "180x180",
					href: "/apple-touch-icon.png",
				},
				{
					rel: "manifest",
					href: "/site.webmanifest",
				},
			],
		};
	},

	shellComponent: RootDocument,
	component: RootComponent,
});

function RootComponent() {
	useEffect(() => {
		gsap.registerPlugin(ScrollTrigger);
	}, []);

	return (
		<MotionConfig reducedMotion="user">
			<AnimatePresence mode="wait">
				<Outlet />
			</AnimatePresence>
		</MotionConfig>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const isBoardCapture = pathname.startsWith("/brand/board");
	// The admin is the dark half of the site. The class carries the palette
	// and the inline colours paint the ground before the stylesheet arrives,
	// so a reload never flashes cream behind a dark screen.
	const dark = isAdminPath(pathname);
	const ground = dark ? ADMIN_GROUND : siteConfig.themeColor;
	const structuredData = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "Chelsea Commons",
		url: "https://chelseacommons.co",
		logo: "https://chelseacommons.co/og.png",
		description:
			"A community of young, ambitious builders, operators, and founders in New York, with a new cohort living together in Chelsea each summer.",
		address: {
			"@type": "PostalAddress",
			addressLocality: "New York",
			addressRegion: "NY",
			addressCountry: "US",
		},
		contactPoint: {
			"@type": "ContactPoint",
			email: "hey@chelseacommons.co",
			contactType: "General Inquiries",
		},
		sameAs: ["https://www.linkedin.com/company/the-chelsea-commons/"],
	};

	return (
		<html
			lang="en"
			className={dark ? "dark" : undefined}
			style={{ backgroundColor: ground }}
		>
			<head>
				<title>{siteConfig.name}</title>
				<HeadContent />
				<SpeedInsights />
				<Analytics />
				<script
					type="application/ld+json"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Structured data for SEO
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(structuredData),
					}}
				/>
			</head>
			<body style={{ backgroundColor: ground }}>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: static viewport-height shim, no dynamic input
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								// Arc mobile draws its own bottom bar without reporting it into
								// WebKit's viewport-unit math, so CSS units alone still reflow
								// mid-scroll there. Pin the viewport height in a custom property
								// instead: measured before first paint, re-measured only when
								// the width changes (rotation), never on height-only resizes
								// (browser bar hiding). Take the smaller of innerHeight and a
								// real 100svh probe: iOS can report the large viewport as
								// innerHeight at load, and Arc misreports svh — the min is
								// right in both.
								var width = window.innerWidth;
								function set() {
									var probe = document.createElement('div');
									probe.style.cssText = 'position:fixed;top:0;height:100svh;visibility:hidden;pointer-events:none;';
									document.body.appendChild(probe);
									var svh = probe.offsetHeight || Infinity;
									probe.remove();
									var h = Math.min(window.innerHeight, svh);
									document.documentElement.style.setProperty('--stable-vh', h + 'px');
								}
								set();
								window.addEventListener('resize', function() {
									if (window.innerWidth !== width) {
										width = window.innerWidth;
										set();
									}
								});
							})();
						`,
					}}
				/>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								var loadingScreen = document.createElement('div');
								loadingScreen.id = 'loading-screen';
								loadingScreen.style.cssText = 'position:fixed;inset:0;background-color:${ground};z-index:var(--z-splash,80);transition:opacity 0.3s ease-out;pointer-events:none;';
								document.body.appendChild(loadingScreen);

								var dismissed = false;
								function dismiss() {
									if (dismissed) return;
									dismissed = true;
									loadingScreen.style.opacity = '0';
									setTimeout(function() {
										loadingScreen.remove();
									}, 300);
								}

								window.addEventListener('load', function() {
									setTimeout(dismiss, 100);
								});
								// Never hold the page hostage to a slow asset
								setTimeout(dismiss, 4000);
							})();
						`,
					}}
				/>
				{children}
				{/* Keep devtools out of /brand/board/* so artboard captures stay clean */}
				{process.env.NODE_ENV === "development" && !isBoardCapture && (
					<TanStackDevtools
						config={{
							position: "bottom-left",
						}}
						plugins={[
							{
								name: "Tanstack Router",
								render: <TanStackRouterDevtoolsPanel />,
							},
						]}
					/>
				)}
				<Scripts />
			</body>
		</html>
	);
}
