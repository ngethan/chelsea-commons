import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ReactLenis, useLenis } from "lenis/react";
import { AnimatePresence } from "motion/react";
import React, { useEffect } from "react";

import "lenis/dist/lenis.css";
import { Shadow } from "../components/shadow";
import { buildSeoTags, siteConfig } from "../site-config";
import appCss from "../styles.css?url";

const MemoizedShadow = React.memo(() => (
	<Shadow
		color="rgba(128, 128, 128, 0.3)"
		animation={{ scale: 50, speed: 80 }}
		noise={{ opacity: 1, scale: 1.5 }}
		sizing="fill"
	/>
));

export const Route = createRootRoute({
	head: () => {
		const baseSeo = buildSeoTags({
			title: siteConfig.name,
			description: siteConfig.description,
			path: "/",
		});

		return {
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
					content: "#1a1a1a",
				},
				{
					name: "apple-mobile-web-app-status-bar-style",
					content: "black-translucent",
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
	const lenis = useLenis(({ scroll }) => {
		// specific scroll events if needed
	});

	useEffect(() => {
		gsap.registerPlugin(ScrollTrigger);

		// Sync Lenis and GSAP
		const update = (time: number) => {
			// lenis instance is available via useLenis or we can get it from ref if needed
			// But wait, useLenis returns the instance but we can't force update it from here easily if we don't have the instance reference in the ticker
			// Actually ReactLenis usually handles the RAF itself if root is true.
			// The issue is GSAP ScrollTrigger needs to know about Lenis scroll.
		};
		// If ReactLenis handles the raf loop (which it does by default), we just need to tell ScrollTrigger to update when Lenis scrolls?
		// Or rather, we need to disable GSAP's native smooth scroll if any, and rely on Lenis.
		// Standard integration:
		/*
		lenis.on('scroll', ScrollTrigger.update)

		gsap.ticker.add((time)=>{
		  lenis.raf(time * 1000)
		})
		
		gsap.ticker.lagSmoothing(0)
		*/
	}, []);

	return (
		<ReactLenis root>
			<LenisGsapSync />
			<AnimatePresence initial={false}>
				<Outlet />
			</AnimatePresence>
		</ReactLenis>
	);
}

function LenisGsapSync() {
	const lenis = useLenis();

	useEffect(() => {
		if (!lenis) return;

		gsap.registerPlugin(ScrollTrigger);

		// Sync ScrollTrigger with Lenis
		lenis.on("scroll", ScrollTrigger.update);

		// Add Lenis's requestAnimationFrame to GSAP's ticker
		const update = (time: number) => {
			lenis.raf(time * 1000);
		};

		gsap.ticker.add(update);

		// Disable lag smoothing for smoother scroll
		gsap.ticker.lagSmoothing(0);

		return () => {
			lenis.off("scroll", ScrollTrigger.update);
			gsap.ticker.remove(update);
		};
	}, [lenis]);

	return null;
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="dark" style={{ backgroundColor: "#1a1a1a" }}>
			<head>
				<HeadContent />
				<SpeedInsights />
				<Analytics />
				<link
					rel="preload"
					as="image"
					href="/shadow.avif"
					fetchPriority="high"
					type="image/avif"
				/>
				<link
					rel="preload"
					as="image"
					href="/grain.avif"
					fetchPriority="high"
					type="image/avif"
				/>
			</head>
			<body style={{ backgroundColor: "#1a1a1a" }}>
				<div
					className="fixed inset-0 pointer-events-none"
					style={{ backgroundColor: "#212121" }}
				>
					<MemoizedShadow />
				</div>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								var loadingScreen = document.createElement('div');
								loadingScreen.id = 'loading-screen';
								loadingScreen.style.cssText = 'position:fixed;inset:0;background-color:oklch(0.2476 0 0);background-image:radial-gradient(ellipse 80% 50% at 50% -20%, rgba(128, 128, 128, 0.25), transparent 70%);z-index:9999;transition:opacity 0.3s ease-out;pointer-events:none;';
								document.body.appendChild(loadingScreen);

								window.addEventListener('load', function() {
									setTimeout(function() {
										loadingScreen.style.opacity = '0';
										setTimeout(function() {
											loadingScreen.remove();
										}, 300);
									}, 100);
								});
							})();
						`,
					}}
				/>
				{children}
				{process.env.NODE_ENV === "development" && (
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
