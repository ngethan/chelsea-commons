import { ShaderBoundary } from "@/components/shader-boundary";
import { Suspense, lazy } from "react";

/**
 * The right half of the sign-in screen, ported from berth.
 *
 * Three layers, cheapest last:
 *  1. `Dithering` — a WebGL warp field resolved through a 4x4 Bayer matrix, so
 *     it reads as printed halftone rather than as a gradient. Slow on purpose:
 *     it should be noticed once and then ignored, because it sits beside a
 *     form somebody is trying to type in. Halftone is also the house
 *     treatment: it is what the landing page hero is.
 *  2. Scanlines, a 3px repeating tint that pulls the field toward print.
 *  3. Grain, the feTurbulence tile from `styles.css`.
 *
 * Colours are ink and cream rather than berth's near-black and orange, which
 * is the whole of the recolouring: this palette has no accent hue, and its one
 * high-contrast pair is exactly the `::selection` treatment the site already
 * uses, ink ground with cream over it. `colorBack` is a shade under
 * `--foreground` for the same reason berth's is a shade under its panel: it
 * gives the field somewhere to sit.
 *
 * They are written as hex because the shader parses colours itself and does
 * not understand oklch. That costs berth a conversion step; here the tokens
 * are already hex, so these are the token values verbatim. If `--foreground`
 * or `--background` moves, move these with them. A `var(--foreground)` will
 * not work.
 *
 * Lazy and inside a `ShaderBoundary`, unlike berth's static import: it is the
 * convention the other two shaders in this repo already follow, so the module
 * never evaluates during prerender and a machine with no WebGL gets a plain
 * ink panel instead of a crash.
 *
 * `prefers-reduced-motion` pauses the animation rather than hiding the panel:
 * the composition survives, the movement does not. A full-bleed animation is a
 * motion-sickness trigger, and it sits beside a sign-in nobody can opt out of
 * visiting.
 */
const Dithering = lazy(() =>
	import("@paper-design/shaders-react").then((m) => ({ default: m.Dithering })),
);

/** A shade under the admin ground, so the field has somewhere to sit. */
const SHADER_BACK = "#232323";
/** `--primary`, the admin's one accent, as hex because the shader wants hex. */
const SHADER_FRONT = "#e98663";

export function ShaderPanel() {
	return (
		<div className="relative h-full w-full overflow-hidden bg-panel">
			<ShaderBoundary fallback={null}>
				<Suspense fallback={null}>
					<Dithering
						// Sized with `style`, not Tailwind. Both other shader call sites
						// in this repo do the same: the component renders its own canvas
						// and a utility class on the wrapper does not reliably reach it.
						style={{
							width: "100%",
							height: "100%",
							position: "absolute",
							inset: 0,
						}}
						className="motion-reduce:[animation-play-state:paused]"
						colorBack={SHADER_BACK}
						colorFront={SHADER_FRONT}
						shape="warp"
						type="4x4"
						size={2}
						scale={0.9}
						speed={0.16}
					/>
				</Suspense>
			</ShaderBoundary>

			<div className="scanlines" aria-hidden />
			<div className="grain-overlay" aria-hidden />

			{/* Softens the seam where the artwork meets the form, so the split
			    reads as one surface rather than two pages side by side. */}
			<div
				aria-hidden
				className="pointer-events-none absolute inset-y-0 left-0 z-[3] w-32 bg-gradient-to-r from-background to-transparent"
			/>
		</div>
	);
}
