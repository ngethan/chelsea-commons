import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Shadow } from "../components/shadow";

export const Route = createFileRoute("/test")({
	component: TestBanner,
});

const LOGOS = [
	{
		name: "Y Combinator",
		logo: "/assets/brands/yc-logo.svg",
		invert: false,
		white: false,
	},
	{
		name: "8VC",
		logo: "/assets/brands/8vc-logo.png",
		invert: true,
		white: false,
	},
	{
		name: "BlackRock",
		logo: "/assets/brands/blackrock-logo.png",
		invert: true,
		white: false,
	},
	{
		name: "JPMorgan Chase",
		logo: "/assets/brands/jpmc-logo.png",
		invert: true,
		white: false,
	},
	{
		name: "Ramp",
		logo: "/assets/brands/ramp-logo.png",
		invert: true,
		white: false,
	},
	{
		name: "Warp",
		logo: "/assets/brands/warp-logo.png",
		invert: true,
		white: false,
	},
	{
		name: "Figma",
		logo: "/assets/brands/figma-logo.png",
		invert: false,
		white: false,
	},
	{
		name: "Nvidia",
		logo: "/assets/brands/nvidia-logo.png",
		invert: false,
		white: false,
	},
];

function AuroraEffect({ className }: { className?: string }) {
	return (
		<div
			className={cn("absolute overflow-hidden", className)}
			style={
				{
					"--aurora":
						"repeating-linear-gradient(100deg, #2d1f3d 10%, #4a1942 15%, #c94c4c 20%, #f4a261 25%, #e76f51 30%, #8b5cf6 35%)",
					maskImage:
						"radial-gradient(ellipse at top right, black 0%, transparent 75%)",
					WebkitMaskImage:
						"radial-gradient(ellipse at top right, black 0%, transparent 75%)",
				} as React.CSSProperties
			}
		>
			<div
				className="after:animate-aurora pointer-events-none absolute -inset-[10px] opacity-100 blur-[25px] will-change-transform after:absolute after:inset-0 after:mix-blend-difference after:content-['']"
				style={{
					backgroundImage: "var(--aurora)",
					backgroundSize: "200%, 400%",
					backgroundPosition: "50% 50%",
				}}
			/>
		</div>
	);
}

function GrainOverlay() {
	return (
		<div
			className="absolute inset-0 opacity-20 pointer-events-none"
			style={{
				backgroundImage: "url(/grain.avif)",
				backgroundSize: "200px",
			}}
		/>
	);
}

function TestBanner() {
	return (
		<div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center gap-12 p-8">
			{/* Section Label */}
			<h2 className="text-white/50 text-sm tracking-widest uppercase">
				Email Banner (560 x 200)
			</h2>

			{/* Email banner: 560 x 200 px — no logos */}
			<div
				className="relative overflow-hidden"
				style={{
					width: "560px",
					height: "200px",
					backgroundColor: "#212121",
				}}
			>
				<Shadow
					color="rgba(128, 128, 128, 0.3)"
					animation={{ scale: 50, speed: 80 }}
					noise={{ opacity: 1, scale: 1.5 }}
					sizing="fill"
				/>
				<AuroraEffect className="top-[-60px] right-[-60px] w-[400px] h-[300px]" />
				<GrainOverlay />

				{/* Title - bottom right */}
				<div className="absolute bottom-6 right-7 z-10 text-right">
					<h1 className="font-serif text-white tracking-tight leading-none text-4xl">
						CHELSEA COMMONS
					</h1>
					<p className="text-white/50 tracking-[0.25em] uppercase mt-2 text-[10px]">
						Summer 2026 &nbsp;&bull;&nbsp; New York City
					</p>
				</div>
			</div>

			{/* Section Label */}
			<h2 className="text-white/50 text-sm tracking-widest uppercase mt-8">
				Banner (1450 x 282)
			</h2>

			{/* 1450 x 282 banner */}
			<div
				className="relative overflow-hidden"
				style={{
					width: "1450px",
					height: "282px",
					backgroundColor: "#212121",
				}}
			>
				<Shadow
					color="rgba(128, 128, 128, 0.3)"
					animation={{ scale: 50, speed: 80 }}
					noise={{ opacity: 1, scale: 1.5 }}
					sizing="fill"
				/>
				<AuroraEffect className="top-[-80px] right-[-80px] w-[700px] h-[400px]" />
				<GrainOverlay />

				{/* Logos - top left */}
				<div className="absolute top-6 left-8 z-10 flex items-center gap-8">
					{LOGOS.map((company) => (
						<img
							key={company.name}
							src={company.logo}
							alt={company.name}
							className={cn(
								"h-5 w-auto object-contain opacity-70",
								company.invert && "invert",
								company.white && "brightness-0 invert",
							)}
						/>
					))}
				</div>

				{/* Title - bottom right */}
				<div className="absolute bottom-6 right-8 z-10 text-right">
					<h1 className="font-serif text-white tracking-tight leading-none text-6xl">
						CHELSEA COMMONS
					</h1>
					<p className="text-white/60 tracking-[0.3em] uppercase mt-2 text-xs">
						Summer 2026 &nbsp;&bull;&nbsp; New York City
					</p>
				</div>
			</div>

			{/* Section Label */}
			<h2 className="text-white/50 text-sm tracking-widest uppercase mt-8">
				LinkedIn Company Banner (1128 x 191)
			</h2>

			{/* LinkedIn company banner: 1128 x 191 px */}
			<div
				className="relative overflow-hidden"
				style={{
					width: "1128px",
					height: "191px",
					backgroundColor: "#212121",
				}}
			>
				<Shadow
					color="rgba(128, 128, 128, 0.3)"
					animation={{ scale: 50, speed: 80 }}
					noise={{ opacity: 1, scale: 1.5 }}
					sizing="fill"
				/>
				<AuroraEffect className="top-[-60px] right-[-60px] w-[500px] h-[300px]" />
				<GrainOverlay />

				{/* Logos - top left */}
				<div className="absolute top-5 left-6 z-10 flex items-center gap-6">
					{LOGOS.map((company) => (
						<img
							key={company.name}
							src={company.logo}
							alt={company.name}
							className={cn(
								"h-5 w-auto object-contain opacity-70",
								company.invert && "invert",
								company.white && "brightness-0 invert",
							)}
						/>
					))}
				</div>

				{/* Title - bottom right */}
				<div className="absolute bottom-5 right-6 z-10 text-right">
					<h1 className="font-serif text-white tracking-tight leading-none text-5xl">
						CHELSEA COMMONS
					</h1>
					<p className="text-white/60 tracking-[0.3em] uppercase mt-1 text-xs">
						Summer 2026 &nbsp;&bull;&nbsp; New York City
					</p>
				</div>
			</div>

			{/* Section Label */}
			<h2 className="text-white/50 text-sm tracking-widest uppercase mt-8">
				LinkedIn Personal Banner (1584 x 396)
			</h2>

			{/* LinkedIn personal banner: 1584 x 396 px */}
			<div
				className="relative overflow-hidden"
				style={{
					width: "1584px",
					height: "396px",
					backgroundColor: "#212121",
				}}
			>
				<Shadow
					color="rgba(128, 128, 128, 0.3)"
					animation={{ scale: 50, speed: 80 }}
					noise={{ opacity: 1, scale: 1.5 }}
					sizing="fill"
				/>
				<AuroraEffect className="top-[-100px] right-[-100px] w-[800px] h-[500px]" />
				<GrainOverlay />

				{/* Logos - top left */}
				<div className="absolute top-8 left-10 z-10 flex items-center gap-10">
					{LOGOS.map((company) => (
						<img
							key={company.name}
							src={company.logo}
							alt={company.name}
							className={cn(
								"h-7 w-auto object-contain opacity-70",
								company.invert && "invert",
								company.white && "brightness-0 invert",
							)}
						/>
					))}
				</div>

				{/* Title - bottom right */}
				<div className="absolute bottom-10 right-12 z-10 text-right">
					<h1 className="font-serif text-white tracking-tight leading-none text-7xl">
						CHELSEA COMMONS
					</h1>
					<p className="text-white/60 tracking-[0.3em] uppercase mt-2 text-sm">
						Summer 2026 &nbsp;&bull;&nbsp; New York City
					</p>
				</div>
			</div>

			{/* Section Label */}
			<h2 className="text-white/50 text-sm tracking-widest uppercase mt-8">
				Square Promo (600 x 600)
			</h2>

			{/* Square promotional image: 600 x 600 px */}
			<div
				className="relative overflow-hidden"
				style={{
					width: "600px",
					height: "600px",
					backgroundColor: "#212121",
				}}
			>
				<Shadow
					color="rgba(128, 128, 128, 0.3)"
					animation={{ scale: 50, speed: 80 }}
					noise={{ opacity: 1, scale: 1.5 }}
					sizing="fill"
				/>
				<AuroraEffect className="top-[-60px] right-[-60px] w-[400px] h-[400px]" />
				<GrainOverlay />

				{/* Main text - centered and shifted up */}
				<div className="absolute inset-0 z-10 flex flex-col items-center justify-center -translate-y-6">
					<h1
						className="font-serif text-white tracking-tight leading-[0.85] text-center"
						style={{ fontSize: "90px" }}
					>
						CHELSEA
					</h1>
					<h1
						className="font-serif text-white tracking-tight leading-[0.85] text-center"
						style={{ fontSize: "90px" }}
					>
						COMMONS
					</h1>

					{/* Decorative divider */}
					<div className="w-24 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent my-4" />

					<h2
						className="font-serif text-white/90 tracking-tight leading-none text-center"
						style={{ fontSize: "42px" }}
					>
						RESIDENCY
					</h2>
				</div>

				{/* Logos strip - bottom */}
				<div className="absolute bottom-10 left-0 right-0 z-10">
					<div className="flex items-center justify-center gap-4 px-8">
						{LOGOS.slice(0, 6).map((company) => (
							<img
								key={company.name}
								src={company.logo}
								alt={company.name}
								className={cn(
									"h-3 w-auto object-contain opacity-60",
									company.invert && "invert",
									company.white && "brightness-0 invert",
								)}
							/>
						))}
					</div>
				</div>

				{/* Subtitle - very bottom */}
				<div className="absolute bottom-4 left-0 right-0 z-10 text-center">
					<p className="text-white/50 tracking-[0.35em] uppercase text-xs">
						Summer 2026 &nbsp;&bull;&nbsp; New York City
					</p>
				</div>
			</div>

			{/* Section Label */}
			<h2 className="text-white/50 text-sm tracking-widest uppercase mt-8">
				Background Only (1584 x 396)
			</h2>

			{/* Background only version: 1584 x 396 px */}
			<div
				className="relative overflow-hidden"
				style={{
					width: "1584px",
					height: "396px",
					backgroundColor: "#212121",
				}}
			>
				<Shadow
					color="rgba(128, 128, 128, 0.3)"
					animation={{ scale: 50, speed: 80 }}
					noise={{ opacity: 1, scale: 1.5 }}
					sizing="fill"
				/>
				<AuroraEffect className="top-[-100px] right-[-100px] w-[800px] h-[500px]" />
				<GrainOverlay />
			</div>
		</div>
	);
}
