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
import { AnimatePresence } from "motion/react";
import React, { useEffect } from "react";

import { Shadow } from "../components/shadow";
import { buildSeoTags, siteConfig } from "../site-config";
import appCss from "../styles.css?url";

const MemoizedShadow = React.memo(() => {
	const [isMobile, setIsMobile] = React.useState(
		typeof window !== "undefined" ? window.innerWidth < 768 : false,
	);

	React.useEffect(() => {
		setIsMobile(window.innerWidth < 768);
	}, []);

	return (
		<Shadow
			color="rgba(128, 128, 128, 0.3)"
			animation={isMobile ? undefined : { scale: 50, speed: 80 }}
			noise={{ opacity: 1, scale: 1.5 }}
			sizing="fill"
		/>
	);
});

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
	useEffect(() => {
		gsap.registerPlugin(ScrollTrigger);
	}, []);

	return (
		<AnimatePresence mode="wait">
			<Outlet />
		</AnimatePresence>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	const structuredData = {
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "THE CHELSEA COMMONS",
		url: "https://chelseacommons.co",
		logo: "https://chelseacommons.co/og.png",
		description:
			"A summer housing community for 12 ambitious interns in Chelsea, Manhattan.",
		address: {
			"@type": "PostalAddress",
			streetAddress: "300 W 20th Street",
			addressLocality: "New York",
			addressRegion: "NY",
			postalCode: "10011",
			addressCountry: "US",
		},
		contactPoint: {
			"@type": "ContactPoint",
			email: "hey@chelseacommons.co",
			contactType: "General Inquiries",
		},
		sameAs: [
			"https://www.linkedin.com/company/the-chelsea-commons/",
			"https://twitter.com",
		],
	};

	return (
		<html lang="en" className="dark" style={{ backgroundColor: "#1a1a1a" }}>
			<head>
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
					<div
						className="absolute overflow-hidden"
						style={
							{
								top: "-100px",
								right: "-100px",
								width: "800px",
								height: "600px",
								"--aurora":
									"repeating-linear-gradient(100deg, #2d1f3d 10%, #4a1942 15%, #c94c4c 20%, #f4a261 25%, #e76f51 30%, #8b5cf6 35%)",
								maskImage:
									"radial-gradient(ellipse at top right, black 0%, transparent 70%)",
								WebkitMaskImage:
									"radial-gradient(ellipse at top right, black 0%, transparent 70%)",
							} as React.CSSProperties
						}
					>
						<div
							className="pointer-events-none absolute -inset-[10px] opacity-100 blur-[8px] md:blur-[30px] after:absolute after:inset-0 after:mix-blend-difference after:content-[''] md:after:animate-aurora md:will-change-transform"
							style={{
								backgroundImage: "var(--aurora)",
								backgroundSize: "200%, 400%",
								backgroundPosition: "50% 50%",
							}}
						/>
					</div>
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
