import { Component, Suspense, lazy, useEffect, useState } from "react";
import type { ReactNode } from "react";

// WebGL canvas — must never evaluate during prerender, so the module is
// loaded lazily and only after the client has mounted.
const HalftoneDots = lazy(() =>
	import("@paper-design/shaders-react").then((m) => ({
		default: m.HalftoneDots,
	})),
);

// A shader crash (failed import, no WebGL context) must degrade to the
// plain photograph, never take the page down.
class ShaderBoundary extends Component<
	{ fallback: ReactNode; children: ReactNode },
	{ failed: boolean }
> {
	state = { failed: false };

	static getDerivedStateFromError() {
		return { failed: true };
	}

	render() {
		return this.state.failed ? this.props.fallback : this.props.children;
	}
}

export function HalftoneHeroImage({
	image = "/assets/space/rooftop.jpg",
	alt = "The rooftop of the Chelsea Commons house in Chelsea, Manhattan",
	aspectClassName = "aspect-[4/3] md:aspect-[21/9]",
}: {
	image?: string;
	alt?: string;
	aspectClassName?: string;
}) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const fallback = (
		<img
			src={image}
			alt={alt}
			className="absolute inset-0 h-full w-full object-cover"
		/>
	);

	return (
		<div className={`relative w-full overflow-hidden ${aspectClassName}`}>
			{mounted ? (
				<ShaderBoundary fallback={fallback}>
					<Suspense fallback={fallback}>
						<HalftoneDots
							image={image}
							colorBack="#f2f1e8"
							colorFront="#2b2b2b"
							originalColors
							type="gooey"
							grid="square"
							inverted={false}
							size={0.4}
							radius={1.25}
							contrast={0.4}
							grainMixer={0.2}
							grainOverlay={0.2}
							grainSize={0.5}
							fit="cover"
							minPixelRatio={1}
							maxPixelCount={1920 * 1080}
							style={{
								width: "100%",
								height: "100%",
								position: "absolute",
								inset: 0,
							}}
						/>
					</Suspense>
				</ShaderBoundary>
			) : (
				fallback
			)}
		</div>
	);
}
