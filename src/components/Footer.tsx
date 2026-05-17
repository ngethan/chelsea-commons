import { useEffect, useRef, useState } from "react";
import { ScrollVelocityRow } from "./ui/scroll-based-velocity";

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

export function Footer() {
	return (
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
							href="https://www.linkedin.com/company/the-chelsea-commons/"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-foreground transition-colors"
						>
							LinkedIn
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
	);
}
