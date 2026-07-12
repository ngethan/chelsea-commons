import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	HeadContent,
	Outlet,
	Scripts,
	createRootRoute,
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

import { buildSeoTags, siteConfig } from "../site-config";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
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

	// Easter egg for the kind of person who opens devtools on a community site.
	useEffect(() => {
		console.log(
			"%cChelsea Commons%c\nChelsea, New York, NY\n\nYou opened the console. You'd probably fit right in.\nhey@chelseacommons.co",
			"font-family: Georgia, serif; font-style: italic; font-size: 24px;",
			"font-size: 12px;",
		);
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
	const isBoardCapture = useRouterState({
		select: (s) => s.location.pathname.startsWith("/brand/board"),
	});
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
		<html lang="en" style={{ backgroundColor: siteConfig.themeColor }}>
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
			<body style={{ backgroundColor: siteConfig.themeColor }}>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								var loadingScreen = document.createElement('div');
								loadingScreen.id = 'loading-screen';
								loadingScreen.style.cssText = 'position:fixed;inset:0;background-color:${siteConfig.themeColor};z-index:var(--z-splash,80);transition:opacity 0.3s ease-out;pointer-events:none;';
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
