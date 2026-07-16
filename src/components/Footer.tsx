import { FitText } from "./FitText";

export function Footer() {
	return (
		<footer className="relative flex flex-col overflow-hidden border-t border-border">
			<div
				className="absolute inset-0 overflow-hidden pointer-events-none"
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
					className="pointer-events-none absolute -inset-[10px] opacity-95 blur-[20px]"
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

			{/* No z-index here: a stacking context would isolate the marquee's
			    mix-blend-difference from the aurora layer behind it. DOM order
			    already paints this above the background. */}
			<div className="relative flex flex-col flex-1">
				<div className="px-6 md:px-12 py-6 flex items-center justify-between">
					<div className="text-sm text-muted-foreground">
						<a
							href="mailto:hey@chelseacommons.co"
							className="hover:text-foreground transition-colors"
						>
							hey@chelseacommons.co
						</a>
						<p>Chelsea, New York, NY</p>
					</div>
					<div className="flex items-center gap-6 text-sm text-muted-foreground">
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

				<div className="flex flex-col justify-center py-12 select-none">
					<FitText className="font-serif text-8xl tracking-tight text-foreground opacity-90 leading-none">
						CHELSEA
					</FitText>
					<FitText className="font-serif text-8xl tracking-tight text-foreground opacity-90 leading-none">
						COMMONS
					</FitText>
				</div>
			</div>
		</footer>
	);
}
