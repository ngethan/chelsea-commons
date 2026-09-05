import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
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
 * Decoded photographs, held for the life of the page.
 *
 * The retention is the point. Preloading with a bare `new Image()` keeps
 * nothing alive, so the browser is free to collect it the moment the function
 * returns, and a phone under memory pressure does exactly that: by the time
 * you scrolled to a city its photograph had to be fetched and decoded all over
 * again, and the plate sat empty while it did. Holding the promise here keeps
 * the element reachable, so each photograph is fetched and decoded once.
 */
const decodedImages = new Map<string, Promise<HTMLImageElement>>();

export function loadCityImage(src: string): Promise<HTMLImageElement> {
	const existing = decodedImages.get(src);
	if (existing) return existing;

	const pending = new Promise<HTMLImageElement>((resolve) => {
		const img = new Image();
		img.decoding = "async";
		// Resolve on any terminal outcome. A failed decode still resolves, so a
		// broken photograph can never wedge the crossfade that waits on this.
		const done = () => resolve(img);
		img.addEventListener("load", done, { once: true });
		img.addEventListener("error", done, { once: true });
		img.src = src;
		img.decode().then(done, () => {});
	});

	decodedImages.set(src, pending);
	return pending;
}

/**
 * One city photograph, dithered. The fallback (no WebGL, or the shader module
 * failing to load) is the photo under a filter that lands in roughly the same
 * two-tone place, so the plate never renders as a hole in the page.
 */
export function CityDitherPlate({
	image,
	alt,
	className = "",
	focusX = 0.5,
	focusY = 0.5,
}: {
	image: string;
	alt: string;
	className?: string;
	/** Where the subject sits in the photograph, 0 to 1 from the left/top. */
	focusX?: number;
	focusY?: number;
}) {
	const [element, setElement] = useState<HTMLImageElement | null>(null);
	const [box, setBox] = useState<{ w: number; h: number } | null>(null);
	const boxRef = useRef<HTMLDivElement>(null);

	// Hand the shader a decoded element rather than a URL, so it uploads the
	// texture straight from memory instead of starting its own fetch.
	useEffect(() => {
		let cancelled = false;
		loadCityImage(image).then((img) => {
			if (!cancelled) setElement(img);
		});
		return () => {
			cancelled = true;
		};
	}, [image]);

	useEffect(() => {
		const el = boxRef.current;
		if (!el) return;
		const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, []);

	/**
	 * `fit: cover` crops whichever axis has spare image, and it crops around the
	 * middle, which throws the subject away: on a portrait phone the Golden Gate
	 * tower and One World Trade both fell outside the visible slice. Pan the
	 * crop onto the subject instead.
	 *
	 * The shader adds `vec2(-offsetX, offsetY)` to a centred UV that is later
	 * shifted by .5 (and flipped in Y), so the middle of the visible window sits
	 * at `0.5 - offset` in texture space, hence `offset = 0.5 - focus`. Only the
	 * cropped axis is panned, and the focus is clamped to half the visible
	 * fraction so the crop can never run off the edge of the picture.
	 */
	const offset = useMemo(() => {
		const w = element?.naturalWidth ?? 0;
		const h = element?.naturalHeight ?? 0;
		if (!w || !h || !box?.w || !box?.h) return { x: 0, y: 0 };

		const imageAspect = w / h;
		const boxAspect = box.w / box.h;
		const centre = (focus: number, visible: number) => {
			const half = visible / 2;
			return Math.min(1 - half, Math.max(half, focus));
		};

		if (imageAspect > boxAspect) {
			return { x: 0.5 - centre(focusX, boxAspect / imageAspect), y: 0 };
		}
		return { x: 0, y: 0.5 - centre(focusY, imageAspect / boxAspect) };
	}, [element, box, focusX, focusY]);

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
		<div
			ref={boxRef}
			className={`absolute inset-0 overflow-hidden ${className}`}
		>
			{element ? (
				<ShaderBoundary fallback={fallback}>
					<Suspense fallback={null}>
						{/* Fades in on mount, which is after the lazy module resolves,
						    covering the shader's first paint. */}
						<div className="absolute inset-0 animate-in fade-in duration-500">
							<ImageDithering
								image={element}
								colorBack={DITHER_BACK}
								// The photograph keeps its own colors.
								originalColors={true}
								inverted={false}
								type="random"
								size={1}
								colorSteps={5}
								scale={1}
								fit="cover"
								offsetX={offset.x}
								offsetY={offset.y}
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
