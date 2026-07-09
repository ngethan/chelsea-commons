/**
 * Micrographic primitives — small technical marks (barcodes, halftone
 * globes, registration marks) shared across pages. All generators are
 * seeded so SSR and client output match exactly.
 */
import type { ReactNode } from "react";

export function Dot({ className = "" }: { className?: string }) {
	return (
		<span
			className={`inline-block size-[5px] rounded-full bg-foreground ${className}`}
		/>
	);
}

/** Deterministic pseudo-random from a seed — stable SSR/CSR output. */
export function seeded(seed: number) {
	let s = seed;
	return () => {
		s = (s * 16807) % 2147483647;
		return s / 2147483647;
	};
}

export function Barcode({
	seed = 7,
	bars = 42,
	height = 36,
	className = "",
}: {
	seed?: number;
	bars?: number;
	height?: number;
	className?: string;
}) {
	const rand = seeded(seed);
	const widths = Array.from({ length: bars }, () =>
		rand() > 0.6 ? 3 : rand() > 0.4 ? 2 : 1,
	);
	const total = widths.reduce((a, w) => a + w + 1.5, 0);
	let x = 0;
	return (
		<svg
			viewBox={`0 0 ${total} ${height}`}
			height={height}
			className={className}
			aria-hidden="true"
			preserveAspectRatio="none"
		>
			{widths.map((w, i) => {
				const rect = (
					<rect
						key={`b-${i}-${w}`}
						x={x}
						y={0}
						width={w}
						height={height}
						fill="currentColor"
					/>
				);
				x += w + 1.5;
				return rect;
			})}
		</svg>
	);
}

/** Halftone-scanned form, à la dot-matrix printouts. */
export function HalftoneGlobe({
	seed = 3,
	size = 72,
	mode = "lines",
	density = 1,
	shape = "circle",
}: {
	seed?: number;
	size?: number;
	mode?: "lines" | "dots" | "noise" | "vlines";
	density?: number;
	shape?: "circle" | "square" | "triangle" | "diamond";
}) {
	const rand = seeded(seed);
	const r = size / 2;
	const rows = 16;
	const elements: ReactNode[] = [];
	if (mode === "vlines") {
		// clean vertical scanlines clipped to the circle — the "resolved" state
		const cols = Math.floor(size / 3.4);
		for (let j = 0; j < cols; j++) {
			const x = (j + 0.5) * 3.4;
			const dx = Math.abs(x - r);
			if (dx >= r - 0.5) continue;
			if (rand() > density) continue;
			const halfH = Math.sqrt(r * r - dx * dx);
			elements.push(
				<rect
					key={`v${j}`}
					x={x - 0.9}
					y={r - halfH}
					width={1.8}
					height={halfH * 2}
					fill="currentColor"
				/>,
			);
		}
		return (
			<svg
				viewBox={`0 0 ${size} ${size}`}
				width={size}
				height={size}
				aria-hidden="true"
			>
				{elements}
			</svg>
		);
	}
	for (let i = 0; i < rows; i++) {
		const y = (i + 0.5) * (size / rows);
		const dy = Math.abs(y - r);
		let halfW: number;
		if (shape === "square") {
			halfW = r * 0.92;
		} else if (shape === "triangle") {
			halfW = (y / size) * r * 1.02;
		} else if (shape === "diamond") {
			halfW = (1 - dy / r) * r;
		} else {
			if (dy >= r) continue;
			halfW = Math.sqrt(r * r - dy * dy);
		}
		if (halfW < 1.5) continue;
		if (mode === "lines") {
			// broken scanlines
			let cx = r - halfW;
			while (cx < r + halfW) {
				const seg = 2 + rand() * (halfW / 1.5);
				const w = Math.min(seg, r + halfW - cx);
				if (rand() > 0.25 && (density >= 1 || rand() <= density)) {
					elements.push(
						<rect
							key={`l${i}-${cx.toFixed(1)}`}
							x={cx}
							y={y - 1.1}
							width={w}
							height={2.2}
							fill="currentColor"
						/>,
					);
				}
				cx += w + 1.5 + rand() * 3;
			}
		} else if (mode === "dots") {
			const cols = Math.floor((halfW * 2) / 4);
			for (let j = 0; j < cols; j++) {
				const x = r - halfW + 2 + j * 4;
				if (rand() > 0.2 && (density >= 1 || rand() <= density)) {
					elements.push(
						<circle
							key={`d${i}-${j}`}
							cx={x}
							cy={y}
							r={1.2}
							fill="currentColor"
						/>,
					);
				}
			}
		} else {
			const cols = Math.floor((halfW * 2) / 3);
			for (let j = 0; j < cols; j++) {
				const x = r - halfW + 1.5 + j * 3;
				if (rand() > 0.55 && (density >= 1 || rand() <= density)) {
					elements.push(
						<rect
							key={`n${i}-${j}`}
							x={x}
							y={y - 1}
							width={1.8}
							height={2}
							fill="currentColor"
						/>,
					);
				}
			}
		}
	}
	return (
		<svg
			viewBox={`0 0 ${size} ${size}`}
			width={size}
			height={size}
			aria-hidden="true"
		>
			{elements}
		</svg>
	);
}

/** Print registration mark (crosshair in circle). */
export function RegistrationMark({ size = 28 }: { size?: number }) {
	const c = size / 2;
	return (
		<svg
			viewBox={`0 0 ${size} ${size}`}
			width={size}
			height={size}
			aria-hidden="true"
			className="text-foreground"
		>
			<circle
				cx={c}
				cy={c}
				r={c * 0.55}
				fill="none"
				stroke="currentColor"
				strokeWidth="1"
			/>
			<line
				x1={c}
				y1={0}
				x2={c}
				y2={size}
				stroke="currentColor"
				strokeWidth="1"
			/>
			<line
				x1={0}
				y1={c}
				x2={size}
				y2={c}
				stroke="currentColor"
				strokeWidth="1"
			/>
		</svg>
	);
}

/** Corner crop mark. */
export function CropCorner({ className = "" }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 10 10"
			width="10"
			height="10"
			aria-hidden="true"
			className={`text-foreground ${className}`}
		>
			<path
				d="M0 0 H10 M0 0 V10"
				stroke="currentColor"
				strokeWidth="1.5"
				fill="none"
			/>
		</svg>
	);
}

/** Six-spoke asterisk. */
export function GlyphAsterisk({ size = 18 }: { size?: number }) {
	const c = size / 2;
	return (
		<svg
			viewBox={`0 0 ${size} ${size}`}
			width={size}
			height={size}
			aria-hidden="true"
			className="text-foreground"
		>
			{[0, 60, 120].map((a) => (
				<line
					key={a}
					x1={c}
					y1={1.5}
					x2={c}
					y2={size - 1.5}
					stroke="currentColor"
					strokeWidth="1.8"
					transform={`rotate(${a} ${c} ${c})`}
				/>
			))}
		</svg>
	);
}
