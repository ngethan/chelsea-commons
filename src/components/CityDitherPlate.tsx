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
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

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
			{mounted ? (
				<ShaderBoundary fallback={fallback}>
					<Suspense fallback={fallback}>
						<ImageDithering
							image={image}
							colorBack={DITHER_BACK}
							// The photograph keeps its own colors. The ordered 8x8 Bayer
							// matrix is what keeps this from reading as grain: `random`
							// at this same pixel size was just static.
							originalColors={true}
							inverted={false}
							type="8x8"
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
					</Suspense>
				</ShaderBoundary>
			) : (
				fallback
			)}
		</div>
	);
}
