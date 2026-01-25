import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "../components/Navbar";
import { ScrollVelocityRow } from "../components/ui/scroll-based-velocity";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/about")({
	head: () =>
		buildSeoTags({
			title: "About - Chelsea Commons",
			description: "Our vision and the people behind Chelsea Commons",
			path: "/about",
		}),
	component: About,
});

function FitText({
	children,
	className,
	style,
}: {
	children: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLSpanElement>(null);
	const [fontSize, setFontSize] = useState(10);

	useEffect(() => {
		const container = containerRef.current;
		const measure = measureRef.current;
		if (!container || !measure) return;

		const updateSize = () => {
			const containerWidth = container.offsetWidth;
			const measureWidth = measure.offsetWidth;
			if (measureWidth > 0) {
				setFontSize((containerWidth / measureWidth) * 10);
			}
		};

		document.fonts.ready.then(updateSize);
		const observer = new ResizeObserver(updateSize);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={containerRef} className="w-full">
			<span
				ref={measureRef}
				aria-hidden
				style={{
					position: "absolute",
					visibility: "hidden",
					fontSize: "10px",
					whiteSpace: "nowrap",
				}}
			>
				{children}
			</span>
			<span
				className={className}
				style={{
					display: "block",
					fontSize: `${fontSize}px`,
					whiteSpace: "nowrap",
					lineHeight: 0.85,
					...style,
				}}
			>
				{children}
			</span>
		</div>
	);
}

const PEOPLE = [
	{ name: "Chirag Ohri", image: null },
	{ name: "Daniel Sung", image: null },
	{ name: "Ethan Ng", image: null },
	{ name: "Jackson Dietz", image: null },
	{ name: "Jorik Dammann", image: null },
	{ name: "Math Heramia", image: null },
	{ name: "Sachin Sashti", image: null },
	{ name: "Will Burkhart", image: null },
];

function About() {
	return (
		<div className="min-h-dvh relative z-10">
			<Navbar />
			<main className="px-6 md:px-12 py-12">
				{/* Vision Section */}
				<section className="max-w-3xl py-24">
					<p className="text-2xl md:text-3xl text-foreground leading-relaxed mb-8">
						Chelsea Commons exists to compound the strengths of 12 ambitious
						interns in New York City into an unforgettable summer.
					</p>

					<p className="text-2xl md:text-3xl text-foreground leading-relaxed mb-8">
						We are curating this group to grow together, build cool stuff, and
						be the heart of a larger intern ecosystem, creating events and
						community for all New York interns, while being surrounded by insane
						talent.
					</p>
					<p className="text-2xl md:text-3xl text-foreground leading-relaxed">
						Reach us at{" "}
						<a
							href="mailto:hey@chelseacommons.co"
							className="underline hover:text-muted-foreground transition-colors"
						>
							hey@chelseacommons.co
						</a>
						.
					</p>
				</section>

				{/* People Section */}
				<section className="py-24 border-t border-border">
					<h2 className="text-2xl font-medium text-foreground mb-12">
						The People
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
						{PEOPLE.map((person) => (
							<div key={person.name} className="group">
								<div className="aspect-square bg-muted mb-4 flex items-center justify-center">
									{person.image ? (
										<img
											src={person.image}
											alt={person.name}
											className="w-full h-full object-cover"
										/>
									) : (
										<span className="text-muted-foreground text-sm">Photo</span>
									)}
								</div>
								<p className="text-foreground font-medium">{person.name}</p>
							</div>
						))}
					</div>
				</section>
			</main>

			<footer className="relative flex flex-col overflow-hidden border-t border-border">
				<div
					className="absolute inset-0 overflow-hidden"
					style={
						{
							"--aurora":
								"repeating-linear-gradient(100deg, #2d1f3d 10%, #4a1942 15%, #c94c4c 20%, #f4a261 25%, #e76f51 30%, #8b5cf6 35%)",
							maskImage:
								"linear-gradient(to bottom, transparent 0%, transparent 40%, black 100%)",
							WebkitMaskImage:
								"linear-gradient(to bottom, transparent 0%, transparent 40%, black 100%)",
						} as React.CSSProperties
					}
				>
					<div
						className="after:animate-aurora pointer-events-none absolute -inset-[10px] opacity-70 blur-[20px] will-change-transform after:absolute after:inset-0 after:mix-blend-difference after:content-['']"
						style={{
							backgroundImage: "var(--aurora)",
							backgroundSize: "200%, 400%",
							backgroundPosition: "50% 50%",
						}}
					/>
					<div
						className="absolute inset-0 opacity-30"
						style={{
							backgroundImage: "url(/grain.avif)",
							backgroundSize: "200px",
						}}
					/>
				</div>

				<div className="relative z-10 flex flex-col flex-1">
					<div className="px-6 md:px-12 py-6 flex items-center justify-between">
						<div className="text-sm text-muted-foreground">
							<a
								href="mailto:hey@chelseacommons.co"
								className="hover:text-foreground transition-colors"
							>
								hey@chelseacommons.co
							</a>
							<p>300 W 20th Street, New York, NY 10011</p>
						</div>
						<div className="flex items-center gap-6 text-sm text-muted-foreground">
							<a
								href="https://twitter.com"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-foreground transition-colors"
							>
								Twitter
							</a>
							<a
								href="https://instagram.com"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-foreground transition-colors"
							>
								Instagram
							</a>
						</div>
					</div>

					<div className="flex flex-col justify-center py-12">
						<FitText className="font-serif text-8xl tracking-tight text-white opacity-75 leading-none select-none">
							CHELSEA
						</FitText>
						<FitText className="font-serif text-8xl tracking-tight text-white opacity-75 leading-none select-none">
							COMMONS
						</FitText>
					</div>

					<div className="border-t border-border py-4">
						<ScrollVelocityRow baseVelocity={3}>
							<span className="text-sm text-muted-foreground mx-8">
								NEW YORK CITY
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
							<span className="text-sm text-muted-foreground mx-8">
								SUMMER 2026
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
							<span className="text-sm text-muted-foreground mx-8">
								12 RESIDENTS
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
							<span className="text-sm text-muted-foreground mx-8">
								MANHATTAN
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
						</ScrollVelocityRow>
					</div>
				</div>
			</footer>
		</div>
	);
}
