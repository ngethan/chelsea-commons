import { createFileRoute } from "@tanstack/react-router";
import { Shadow } from "../components/shadow";

export const Route = createFileRoute("/blank")({
	component: BlankPage,
});

function AuroraEffect() {
	return (
		<div
			className="absolute top-[-100px] right-[-100px] w-[800px] h-[500px] overflow-hidden"
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

function BlankPage() {
	return (
		<div
			className="relative min-h-screen overflow-hidden"
			style={{ backgroundColor: "#212121" }}
		>
			<Shadow
				color="rgba(128, 128, 128, 0.3)"
				animation={{ scale: 50, speed: 80 }}
				noise={{ opacity: 1, scale: 1.5 }}
				sizing="fill"
			/>
			<AuroraEffect />
			<GrainOverlay />
		</div>
	);
}
