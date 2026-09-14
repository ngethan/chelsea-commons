import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/build")({
	head: () => {
		const seo = buildSeoTags({
			title: "Build - Chelsea Commons",
			description:
				"We are first believers in the most ambitious students across the world.",
			path: "/build",
		});
		return { title: seo.title, meta: seo.meta, links: seo.links };
	},
	component: BuildPage,
});

const STREAM = "CHELSEACOMMONS";
const WORD = "BUILD";
/** Sub-samples per cell edge; 3x3 gives a soft edge at this coarse a grid. */
const SUB = 3;
/** The pointer reveals the name underneath, never as dark as the word. */
const REVEAL = 0.7;
const GLOW_RADIUS = 60;
const RIPPLE_MS = 700;
const RIPPLE_BAND = 22;

type Ripple = {
	x: number;
	y: number;
	t0: number;
	radius: number;
	phase: number;
};

type WordBitmap = {
	alpha: Uint8ClampedArray;
	width: number;
	height: number;
};

/**
 * The word rendered once, flat, at the size it has on screen. Every frame
 * looks up cells against this through a rotation, so the text is never
 * re-rendered; only the mapping moves.
 */
function renderWord(targetWidth: number, font: string): WordBitmap | null {
	// The serif italic is the site's identity voice; this is the one word on
	// the page, so it gets it. Bold, so the strokes survive the grid.
	const off = document.createElement("canvas");
	const ctx = off.getContext("2d");
	if (!ctx) return null;
	ctx.font = `italic 900 100px ${font}`;
	ctx.letterSpacing = "6px";
	const size = (100 * targetWidth) / ctx.measureText(WORD).width;
	off.width = Math.ceil(targetWidth * 1.1);
	off.height = Math.ceil(size * 1.2);
	ctx.font = `italic 900 ${size}px ${font}`;
	// Room between the letters, so each one is its own block of cells.
	ctx.letterSpacing = `${Math.round(size * 0.06)}px`;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillStyle = "#000";
	ctx.fillText(WORD, off.width / 2, off.height / 2);
	const { data } = ctx.getImageData(0, 0, off.width, off.height);
	const alpha = new Uint8ClampedArray(off.width * off.height);
	for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3];
	return { alpha, width: off.width, height: off.height };
}

function LetterField() {
	const ref = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = ref.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const styles = getComputedStyle(document.documentElement);
		const ink = styles.getPropertyValue("--foreground").trim() || "#2b2b2b";
		const font = styles.getPropertyValue("--font-sans").trim() || "sans-serif";
		const serif = styles.getPropertyValue("--font-serif").trim() || "serif";
		const reduce = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;

		let cols = 0;
		let rows = 0;
		let cellW = 16;
		let cellH = 20;
		let width = 0;
		let height = 0;
		let word: WordBitmap | null = null;
		let sprites: HTMLCanvasElement[] = [];
		let frame = 0;
		let disposed = false;
		let glow = new Float32Array(0);
		// Two fixed random values per cell: one pushes the cell in or out of a
		// ring, the other sets how bright it is allowed to get. Without them
		// every splash is a compass-drawn circle.
		let grain = new Float32Array(0);
		let grit = new Float32Array(0);
		let pointer: { x: number; y: number } | null = null;
		let lastMove = 0;
		/** How long after the pointer stops the glow takes to go out. */
		const GLOW_HOLD_MS = 350;
		let lastRipple: { x: number; y: number } | null = null;
		let ripples: Ripple[] = [];

		// One bitmap per letter, drawn with drawImage. fillText for every cell
		// on every frame was the whole cost of the animation; blitting a cached
		// glyph is an order of magnitude cheaper and looks identical.
		const buildSprites = () => {
			const dpr = window.devicePixelRatio || 1;
			sprites = Array.from(STREAM, (ch) => {
				const c = document.createElement("canvas");
				c.width = Math.ceil(cellW * dpr);
				c.height = Math.ceil(cellH * dpr);
				const g = c.getContext("2d");
				if (!g) return c;
				g.setTransform(dpr, 0, 0, dpr, 0, 0);
				g.font = `500 ${Math.round(cellW * 0.8)}px ${font}`;
				g.textAlign = "center";
				g.textBaseline = "middle";
				g.fillStyle = ink;
				g.fillText(ch, cellW / 2, cellH / 2);
				return c;
			});
		};

		const layout = () => {
			const dpr = window.devicePixelRatio || 1;
			width = window.innerWidth;
			height = window.innerHeight;
			cellW = width < 640 ? 9 : 12;
			cellH = Math.round(cellW * 1.25);
			cols = Math.ceil(width / cellW);
			rows = Math.ceil(height / cellH);
			canvas.width = Math.round(width * dpr);
			canvas.height = Math.round(height * dpr);
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			word = renderWord(width * 0.72, serif);
			glow = new Float32Array(cols * rows);
			grain = Float32Array.from({ length: cols * rows }, () => Math.random());
			grit = Float32Array.from({ length: cols * rows }, () => Math.random());
			buildSprites();
			draw(0);
		};

		/**
		 * Adds a radial falloff into `glow` for every cell inside the circle.
		 * `inner` is the radius where the value peaks; a ring is a band around
		 * it, a glow is inner = 0. Only the cells the circle covers are
		 * touched, so a dozen ripples cost about what one full pass does.
		 */
		const splash = (
			x: number,
			y: number,
			inner: number,
			band: number,
			strength: number,
			phase: number,
		) => {
			const scatter = band * 0.9;
			const outer = inner * 1.2 + band + scatter;
			const c0 = Math.max(0, Math.floor((x - outer) / cellW));
			const c1 = Math.min(cols - 1, Math.ceil((x + outer) / cellW));
			const r0 = Math.max(0, Math.floor((y - outer) / cellH));
			const r1 = Math.min(rows - 1, Math.ceil((y + outer) / cellH));
			for (let r = r0; r <= r1; r++) {
				const dy = r * cellH + cellH / 2 - y;
				for (let c = c0; c <= c1; c++) {
					const dx = c * cellW + cellW / 2 - x;
					const i = r * cols + c;
					const d =
						Math.sqrt(dx * dx + dy * dy) + (grain[i] - 0.5) * 2 * scatter;
					// The ring itself wobbles with angle, differently per splash.
					const a = Math.atan2(dy, dx);
					const edge =
						inner *
						(1 +
							0.14 * Math.sin(3 * a + phase) +
							0.08 * Math.sin(7 * a - phase));
					const k = 1 - Math.abs(d - edge) / band;
					if (k <= 0) continue;
					glow[i] = Math.max(
						glow[i],
						k * k * strength * (0.35 + 0.65 * grit[i]),
					);
				}
			}
		};

		const onMove = (e: PointerEvent) => {
			pointer = { x: e.clientX, y: e.clientY };
			lastMove = performance.now();
			if (reduce) return;
			const moved = lastRipple
				? Math.hypot(e.clientX - lastRipple.x, e.clientY - lastRipple.y)
				: Number.POSITIVE_INFINITY;
			if (moved < 18) return;
			lastRipple = pointer;
			ripples.push({
				...pointer,
				t0: performance.now(),
				radius: 70 + Math.random() * 50,
				phase: Math.random() * Math.PI * 2,
			});
		};
		const onDown = (e: PointerEvent) => {
			if (reduce) return;
			ripples.push({
				x: e.clientX,
				y: e.clientY,
				t0: performance.now(),
				radius: 220,
				phase: Math.random() * Math.PI * 2,
			});
		};
		const onLeave = () => {
			pointer = null;
		};

		/**
		 * The word sits on a plane through the middle of the screen, turned by
		 * yaw and pitch, seen from a camera in front of it. For each cell we
		 * cast a ray through the cell, find where it meets the plane, and read
		 * the flat bitmap there. Perspective comes free from the ray; there is
		 * no transform the 2D canvas would have to approximate.
		 */
		const draw = (t: number) => {
			if (document.hidden || !word) return;
			const yaw = reduce ? 0 : 0.5 * Math.sin(t * 0.00045);
			const pitch = reduce ? 0 : 0.22 * Math.sin(t * 0.00031 + 1.3);
			const roll = reduce ? 0 : 0.14 * Math.sin(t * 0.00026 + 2.6);
			const cy = Math.cos(yaw);
			const sy = Math.sin(yaw);
			const cx = Math.cos(pitch);
			const sx = Math.sin(pitch);
			// Plane normal and axes: R = Ry(yaw) * Rx(pitch) applied to the
			// flat word's u (right), v (down) and n (out of the page).
			const ux0 = cy;
			const uy0 = 0;
			const uz0 = -sy;
			const vx0 = sy * sx;
			const vy0 = cx;
			const vz0 = cy * sx;
			// Roll turns the word within its own plane: spin u and v about n.
			const cr = Math.cos(roll);
			const sr = Math.sin(roll);
			const ux = cr * ux0 + sr * vx0;
			const uy = cr * uy0 + sr * vy0;
			const uz = cr * uz0 + sr * vz0;
			const vx = cr * vx0 - sr * ux0;
			const vy = cr * vy0 - sr * uy0;
			const vz = cr * vz0 - sr * uz0;
			const nx = sy * cx;
			const ny = -sx;
			const nz = cy * cx;
			// Closer camera, stronger perspective: the near edge grows and the
			// far edge shrinks enough to read as a turn, not a stretch.
			const camZ = -width * 1.05;
			const originX = width / 2;
			const originY = height * 0.46;
			const { alpha, width: bw, height: bh } = word;
			const denomC = camZ * nz;

			glow.fill(0);
			// A still pointer shows nothing: the reveal follows movement and is
			// gone a moment after it stops.
			const hold = pointer ? 1 - (t - lastMove) / GLOW_HOLD_MS : 0;
			if (pointer && hold > 0) {
				splash(pointer.x, pointer.y, 0, GLOW_RADIUS, REVEAL * hold, 0);
			}
			ripples = ripples.filter((rp) => t - rp.t0 < RIPPLE_MS);
			for (const rp of ripples) {
				const age = (t - rp.t0) / RIPPLE_MS;
				const ease = 1 - (1 - age) * (1 - age);
				splash(
					rp.x,
					rp.y,
					ease * rp.radius,
					RIPPLE_BAND,
					REVEAL * (1 - age),
					rp.phase,
				);
			}

			ctx.clearRect(0, 0, width, height);
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					let hit = 0;
					let depth = 0;
					let samples = 0;
					for (let j = 0; j < SUB; j++) {
						for (let i = 0; i < SUB; i++) {
							const px = c * cellW + ((i + 0.5) / SUB) * cellW - originX;
							const py = r * cellH + ((j + 0.5) / SUB) * cellH - originY;
							// Ray from camera (0,0,camZ) through (px,py,0).
							const d = px * nx + py * ny - camZ * nz;
							if (Math.abs(d) < 1e-6) continue;
							const tt = -denomC / d;
							if (tt <= 0) continue;
							const X = px * tt;
							const Y = py * tt;
							const Z = camZ + (0 - camZ) * tt;
							const u = X * ux + Y * uy + Z * uz + bw / 2;
							const v = X * vx + Y * vy + Z * vz + bh / 2;
							if (u < 0 || v < 0 || u >= bw || v >= bh) continue;
							hit += alpha[(v | 0) * bw + (u | 0)];
							depth += Z;
							samples++;
						}
					}
					const cov = hit / (SUB * SUB * 255);
					// A cell that only just touches a stroke stays off, and one that is
					// mostly covered goes to full ink: a firm edge reads better here
					// than a linear one.
					const edge = Math.min(1, Math.max(0, (cov - 0.12) / 0.45));
					const sprite = sprites[(r * cols + c) % STREAM.length];
					const reveal = glow[r * cols + c];
					if (edge > 0) {
						// Depth: the part of the plane nearer the camera draws its
						// letters bigger and darker, the far part smaller and lighter.
						// `near` is 1 on the plane's centre line, above 1 towards us.
						const near = -camZ / (depth / samples - camZ);
						const size = 1 + (near - 1) * 2.4;
						const tone = Math.min(1, Math.max(0.3, 1 + (near - 1) * 3.2));
						ctx.globalAlpha = Math.max(edge * tone, reveal);
						const w = cellW * size;
						const h = cellH * size;
						ctx.drawImage(
							sprite,
							c * cellW + (cellW - w) / 2,
							r * cellH + (cellH - h) / 2,
							w,
							h,
						);
						continue;
					}
					if (reveal <= 0.01) continue;
					ctx.globalAlpha = reveal;
					ctx.drawImage(sprite, c * cellW, r * cellH, cellW, cellH);
				}
			}
			ctx.globalAlpha = 1;
		};

		const loop = (t: number) => {
			if (disposed) return;
			draw(t);
			frame = window.requestAnimationFrame(loop);
		};

		document.fonts.ready.then(() => {
			if (disposed) return;
			layout();
			frame = window.requestAnimationFrame(loop);
		});
		window.addEventListener("resize", layout);
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerdown", onDown);
		document.addEventListener("pointerleave", onLeave);
		return () => {
			disposed = true;
			window.cancelAnimationFrame(frame);
			window.removeEventListener("resize", layout);
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerdown", onDown);
			document.removeEventListener("pointerleave", onLeave);
		};
	}, []);

	return (
		<div
			aria-hidden="true"
			className="fixed inset-0 pointer-events-none select-none"
			style={{
				maskImage:
					"linear-gradient(to bottom, black 0%, black 78%, transparent 100%)",
				WebkitMaskImage:
					"linear-gradient(to bottom, black 0%, black 78%, transparent 100%)",
			}}
		>
			<canvas ref={ref} />
		</div>
	);
}

function BuildPage() {
	return (
		<main className="relative min-h-[100svh] bg-background text-foreground">
			<h1 className="sr-only">Build</h1>
			<LetterField />
			<div className="fixed inset-x-0 bottom-0 px-6 md:px-12 pb-[max(2rem,env(safe-area-inset-bottom))] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
				<p className="text-base leading-snug text-foreground lg:whitespace-nowrap">
					We are first believers in the most ambitious students across the
					world.
				</p>
				<nav
					aria-label="Build"
					className="flex items-center gap-3 text-base text-foreground"
				>
					<Link to="/" className="no-underline hover:text-muted-foreground">
						Home
					</Link>
					<span aria-hidden="true" className="text-muted-foreground">
						·
					</span>
					<a
						href="https://www.linkedin.com/company/the-chelsea-commons/"
						target="_blank"
						rel="noopener noreferrer"
						className="no-underline hover:text-muted-foreground"
					>
						LinkedIn
					</a>
					<span aria-hidden="true" className="text-muted-foreground">
						·
					</span>
					<a
						href="mailto:hey@chelseacommons.co"
						className="no-underline hover:text-muted-foreground"
					>
						Contact
					</a>
				</nav>
			</div>
		</main>
	);
}
