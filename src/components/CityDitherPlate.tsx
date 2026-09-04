import { Suspense, lazy, useEffect, useState } from "react";
import { ShaderBoundary } from "./shader-boundary";

// WebGL canvas — must never evaluate during prerender, so the module is
// loaded lazily and only after the client has mounted.
const ImageDithering = lazy(() =>
	import("@paper-design/shaders-react").then((m) => ({
		default: m.ImageDithering,
	})),
);

/**
 * Ink stands in for the pure black of the shader playground's defaults, since
 * the site never uses it. With `originalColors` on, the shader samples the
 * photograph itself and the front/highlight pair goes unused, so only the
 * backdrop is worth naming.
 */
export const DITHER_BACK = "#2b2b2b";

/**
 * One city photograph, dithered. The fallback (no WebGL, or the shader module
 * failing to load) is the photo under a filter that lands in roughly the same
 * two-tone place, so the plate never renders as a hole in the page.
 */
export function CityDitherPlate({
	image,
	alt,
	className = "",
}: {
	image: string;
	alt: string;
	className?: string;
}) {
	const [decoded, setDecoded] = useState(false);

	// Wait for the photograph to be decoded before mounting the shader, so the
	// texture upload has nothing to wait on and the first painted frame is
	// already dithered. Never resets on a later image change, so switching
	// cities doesn't blank the plate.
	useEffect(() => {
		let cancelled = false;
		const done = () => {
			if (!cancelled) setDecoded(true);
		};
		const img = new Image();
		img.src = image;
		img.decode().then(done, done);
		// decode() can stall indefinitely, a backgrounded tab being the easy
		// case. Waiting on it forever would leave the page a blank ink field, so
		// mount the shader regardless after a beat.
		const failsafe = setTimeout(done, 1200);
		return () => {
			cancelled = true;
			clearTimeout(failsafe);
		};
	}, [image]);

	// Only for an actual shader failure (no WebGL, module won't load). Pointedly
	// not the loading state: showing the raw photograph and then swapping it for
	// the dithered one is a worse flash than a beat of empty ink.
	const fallback = (
		<img
			src={image}
			alt={alt}
			className="absolute inset-0 h-full w-full object-cover"
			style={{ filter: "contrast(1.15) saturate(1.1)" }}
		/>
	);

	return (
		<div className={`absolute inset-0 overflow-hidden ${className}`}>
			{decoded ? (
				<ShaderBoundary fallback={fallback}>
					<Suspense fallback={null}>
						{/* Fades in on mount, which is after the lazy module resolves,
						    covering the shader's first paint. */}
						<div className="absolute inset-0 animate-in fade-in duration-500">
							<ImageDithering
								image={image}
								colorBack={DITHER_BACK}
								// The photograph keeps its own colors.
								originalColors={true}
								inverted={false}
								type="random"
								size={1}
								colorSteps={5}
								scale={1}
								fit="cover"
								// Static grain: the dither pattern shouldn't shimmer while
								// you read the city name.
								speed={0}
								minPixelRatio={1}
								maxPixelCount={1920 * 1080}
								style={{
									width: "100%",
									height: "100%",
									position: "absolute",
									inset: 0,
								}}
							/>
						</div>
					</Suspense>
				</ShaderBoundary>
			) : null}
		</div>
	);
}
