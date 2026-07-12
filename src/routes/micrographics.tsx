import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import {
	Barcode,
	CropCorner,
	Dot,
	GlyphAsterisk,
	HalftoneGlobe,
	RegistrationMark,
	seeded,
} from "../components/micrographics";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/micrographics")({
	head: () => {
		const seo = buildSeoTags({
			title: "Micrographics - Chelsea Commons",
			description:
				"A working library of micrographics: technical marks, spec blocks, and identification systems for Chelsea Commons.",
			path: "/micrographics",
		});
		return {
			title: seo.title,
			meta: seo.meta,
			links: seo.links,
		};
	},
	component: Micrographics,
});

/* ------------------------------------------------------------------ */
/* Shared constants — believable, consistent data                      */
/* ------------------------------------------------------------------ */

const LAT = `40°44'36"N`;
const LNG = `74°00'01"W`;
const LOT = "CC-26S-0018";
const SEASON = "SUMMER 2026";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Tile chrome                                                         */
/* ------------------------------------------------------------------ */

function Tile({
	fig,
	label,
	children,
	span = 1,
	invert = false,
}: {
	fig: string;
	label: string;
	children: ReactNode;
	span?: 1 | 2;
	invert?: boolean;
}) {
	return (
		<div
			className={`relative flex flex-col border border-border ${
				span === 2 ? "sm:col-span-2" : ""
			} ${invert ? "bg-foreground text-background" : "bg-card text-foreground"}`}
		>
			<div
				className={`flex items-center justify-between px-4 py-2 font-mono text-[10px] tracking-[0.08em] border-b ${
					invert
						? "border-background/20 text-background/60"
						: "border-border text-muted-foreground"
				}`}
			>
				<span>FIG. {fig}</span>
				<span className="uppercase">{label}</span>
			</div>
			<div className="flex-1 flex items-center justify-center p-6 sm:p-8 min-h-[220px]">
				{children}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* The micrographics                                                   */
/* ------------------------------------------------------------------ */

function CityLockup() {
	return (
		<div className="w-full max-w-[360px]">
			<div className="relative">
				<Dot className="absolute -left-3 top-1.5" />
				<h2 className="font-sans font-medium leading-[0.95] text-4xl sm:text-5xl tracking-tight">
					Chelsea Commons®
					<br />
					New&nbsp;York:NY
				</h2>
			</div>
			<div className="mt-3 flex justify-between font-mono text-[10px] leading-tight">
				<div className="relative pl-3">
					<Dot className="absolute left-0 top-[3px]" />
					NEW YORK:NY
					<br />
					CHELSEA, MANHATTAN
				</div>
				<div className="relative pl-3 text-right">
					<Dot className="absolute left-0 top-[3px]" />
					CC™ A COMMON
					<br />
					ROOM FOR BUILDERS™
				</div>
			</div>
			<div className="mt-6 font-mono text-[10px] leading-relaxed">
				<span className="relative pl-3">
					<Dot className="absolute left-0 top-[3px]" />
					NEW YORK:NY {LAT} {LNG}
					<br />
					CHELSEA COMMONS™ {SEASON}
				</span>
			</div>
		</div>
	);
}

function SpecPlate() {
	return (
		<div className="flex flex-col items-center gap-2 font-mono text-center">
			<svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
				<title>CC mark</title>
				{[16, 12, 8, 4].map((rr) => (
					<path
						key={rr}
						d={`M ${20 - rr} 36 L ${20 - rr} ${20} A ${rr} ${rr} 0 0 1 ${20 + rr} 20 L ${20 + rr} 36`}
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
					/>
				))}
			</svg>
			<div className="text-[10px] tracking-[0.35em] mt-1">HUMAN — MADE</div>
			<div className="flex items-center gap-3">
				<span className="flex items-center justify-center size-6 rounded-full border border-current text-[9px]">
					26
				</span>
				<span className="font-sans font-bold text-3xl tracking-tight">
					COMMONS
				</span>
			</div>
			<div className="flex items-center gap-3 text-sm tracking-[0.3em] opacity-60">
				<span className="font-bold tracking-normal text-base">CE</span>
				<span>43R-0018CC</span>
			</div>
			<div className="text-[10px] tracking-[0.25em]">
				<b>E</b> <span className="opacity-50">0018</span> <b>26</b>
			</div>
		</div>
	);
}

function ScanSequence() {
	return (
		<div className="flex flex-col items-center gap-4">
			<div className="flex items-end gap-4">
				<HalftoneGlobe seed={11} mode="lines" />
				<HalftoneGlobe seed={23} mode="noise" />
				<HalftoneGlobe seed={5} mode="dots" />
			</div>
			<div className="font-mono text-[11px] text-center leading-relaxed">
				©CC PROJECT COMMON ROOM
				<br />
				2026 NEW YORK, NY
			</div>
			<div className="flex w-full justify-between font-mono text-[11px] px-2">
				<span>12 WEEKS</span>
				<span>30 RESIDENTS</span>
			</div>
		</div>
	);
}

function ScanSequenceForms() {
	return (
		<div className="relative w-full max-w-[400px] px-4 py-2">
			<CropCorner className="absolute left-0 top-0" />
			<CropCorner className="absolute right-0 top-0 rotate-90" />
			<CropCorner className="absolute left-0 bottom-0 -rotate-90" />
			<CropCorner className="absolute right-0 bottom-0 rotate-180" />
			<div className="flex flex-col items-center gap-4 py-2">
				<div className="flex items-end gap-4">
					<HalftoneGlobe seed={31} mode="noise" shape="square" size={64} />
					<HalftoneGlobe seed={47} mode="dots" shape="triangle" size={64} />
					<HalftoneGlobe seed={59} mode="lines" shape="diamond" size={64} />
					<HalftoneGlobe seed={7} mode="dots" size={64} />
				</div>
				<div className="font-mono text-[11px] text-center leading-relaxed">
					FORMS 001—004 ✳︎ GEOMETRY DEPT.
					<br />
					ALL SHAPES SCANNED AT 1-BIT
				</div>
				<div className="flex w-full justify-between font-mono text-[11px] px-2">
					<span>□ △ ◇ ○</span>
					<span>NO CURVES WASTED</span>
				</div>
			</div>
		</div>
	);
}

function OrbitalGlobe() {
	return (
		<div className="flex flex-col items-center gap-4">
			<div className="relative">
				<HalftoneGlobe seed={19} mode="dots" size={88} />
				<svg
					viewBox="0 0 140 140"
					width="140"
					height="140"
					aria-hidden="true"
					className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-foreground"
				>
					<ellipse
						cx="70"
						cy="70"
						rx="64"
						ry="24"
						fill="none"
						stroke="currentColor"
						strokeWidth="0.8"
						strokeDasharray="4 3"
						transform="rotate(-18 70 70)"
					/>
					<circle cx="14" cy="88" r="3" fill="#e7000b" />
				</svg>
			</div>
			<div className="font-mono text-[10px] text-center leading-[1.8]">
				OBJ: COMMON ROOM · ORBIT: CHELSEA
				<br />
				<span className="opacity-60">PERIOD 12 WK ↺ INCLINATION: HIGH</span>
			</div>
			<div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.2em]">
				<span className="size-[5px] rounded-full bg-[#e7000b]" />
				SATELLITE: YOU
			</div>
		</div>
	);
}

function GlyphIndex() {
	const rows: { sym: ReactNode; code: string; note: string }[] = [
		{
			sym: <GlyphAsterisk />,
			code: "SYM-01",
			note: "FOOTNOTE, LOAD-BEARING",
		},
		{
			sym: <RegistrationMark size={18} />,
			code: "SYM-02",
			note: "ALIGNMENT, NON-NEGOTIABLE",
		},
		{
			sym: (
				<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
					<path d="M9 2 L16.5 15.5 H1.5 Z" fill="currentColor" />
				</svg>
			),
			code: "SYM-03",
			note: "HAZARD: AMBITION",
		},
		{
			sym: (
				<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
					<circle cx="9" cy="9" r="7" fill="currentColor" />
				</svg>
			),
			code: "SYM-04",
			note: "BULLET, ANCHOR POINT",
		},
		{
			sym: (
				<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
					<circle
						cx="9"
						cy="9"
						r="7"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.4"
					/>
					<path d="M9 2 A7 7 0 0 0 9 16 Z" fill="currentColor" />
				</svg>
			),
			code: "SYM-05",
			note: "HALFTONE, 50% K",
		},
		{
			sym: (
				<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
					<path
						d="M9 16 V5 M9 2 L4.5 8 M9 2 L13.5 8"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
				</svg>
			),
			code: "SYM-06",
			note: "NORTH, ALWAYS",
		},
		{
			sym: <span className="font-sans text-base font-medium">®</span>,
			code: "SYM-07",
			note: "REGISTERED, ALLEGEDLY",
		},
		{
			sym: <span className="font-sans text-base font-medium">№</span>,
			code: "SYM-08",
			note: "NUMERO, FOR GRAVITAS",
		},
		{
			sym: <span className="font-sans text-sm font-medium">™</span>,
			code: "SYM-09",
			note: "APPLIED LIBERALLY",
		},
		{
			sym: (
				<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
					<circle
						cx="9"
						cy="9"
						r="6"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.4"
					/>
					<line
						x1="2"
						y1="16"
						x2="16"
						y2="2"
						stroke="currentColor"
						strokeWidth="1.4"
					/>
				</svg>
			),
			code: "SYM-10",
			note: "DIAMETER OF TRUST: WIDE",
		},
	];
	return (
		<div className="w-full max-w-[480px] font-mono text-[9px]">
			<div className="mb-2 flex justify-between tracking-[0.2em]">
				<span className="font-bold">GLYPH INDEX — CC STANDARD SET</span>
				<span className="opacity-50">SHEET G-01</span>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
				{rows.map((r) => (
					<div
						key={r.code}
						className="flex items-center gap-3 border-t border-border py-2"
					>
						<span className="flex w-6 justify-center text-foreground">
							{r.sym}
						</span>
						<span className="w-14 opacity-50">{r.code}</span>
						<span className="flex-1 tracking-[0.08em]">{r.note}</span>
					</div>
				))}
			</div>
			<div className="mt-2 border-t border-border pt-2 tracking-[0.15em] opacity-50">
				USE FREELY. USE PRECISELY. ✳︎ † ‡ § RESERVED FOR EMERGENCIES.
			</div>
		</div>
	);
}

function HazardStrip() {
	return (
		<div className="w-full max-w-[280px] font-mono">
			<div className="flex items-center gap-3">
				<svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
					<path
						d="M15 3 L28 26 H2 Z"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
					<line
						x1="15"
						y1="11"
						x2="15"
						y2="19"
						stroke="currentColor"
						strokeWidth="1.8"
					/>
					<circle cx="15" cy="22.5" r="1.2" fill="currentColor" />
				</svg>
				<div className="text-[10px] leading-[1.6] tracking-[0.15em]">
					<b>CAUTION</b>
					<br />
					<span className="opacity-60">ACTIVE CONSTRUCTION (OF THINGS)</span>
				</div>
			</div>
			<div
				className="mt-4 h-6 w-full border border-foreground"
				style={{
					backgroundImage:
						"repeating-linear-gradient(45deg, var(--foreground) 0 10px, transparent 10px 20px)",
				}}
				aria-hidden="true"
			/>
			<div className="mt-2 flex justify-between text-[8px] tracking-[0.2em] opacity-60">
				<span>DO NOT LEAN ON CYNICISM</span>
				<span>OSHA N/A</span>
			</div>
			<div className="mt-4 text-[9px] leading-[1.8]">
				HARD IDEAS REQUIRED BEYOND THIS POINT.
				<br />
				<span className="opacity-50">POSTED PER LOCAL LAW § CC-26</span>
			</div>
		</div>
	);
}

function AsteriskFootnote() {
	return (
		<div className="flex flex-col items-center gap-4">
			<GlyphAsterisk size={72} />
			<div className="font-mono text-[9px] leading-[2] text-center max-w-[240px]">
				* TERMS &amp; CONDITIONS: SHOW UP.
				<br />† NO PURCHASE NECESSARY. NEVER WAS.
				<br />‡ VOID WHERE PROHIBITED (NOWHERE)
				<br />
				<span className="opacity-50">§ SEE ALSO: FIG. 01 THROUGH FIG. ∞</span>
			</div>
		</div>
	);
}

function GarmentTag() {
	return (
		<div className="w-[190px] border border-border bg-background px-4 py-5 font-mono text-[9px] leading-[1.7] text-center">
			<div className="text-[11px] tracking-[0.2em] font-bold">
				CHELSEA COMMONS
			</div>
			<div className="opacity-60 mb-3">EST. 2026 — NYC</div>
			<div className="flex justify-center gap-2 mb-3 text-[13px]" aria-hidden>
				{/* care symbols */}
				<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
					<path d="M2 5 h12 l-1.5 8 h-9 z" fill="none" stroke="currentColor" />
					<path d="M4 5 c1.5-3 6.5-3 8 0" fill="none" stroke="currentColor" />
				</svg>
				<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
					<rect
						x="2"
						y="3"
						width="12"
						height="10"
						fill="none"
						stroke="currentColor"
					/>
					<circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" />
				</svg>
				<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
					<path d="M3 12 L8 4 L13 12 Z" fill="none" stroke="currentColor" />
					<line x1="4" y1="4" x2="12" y2="12" stroke="currentColor" />
				</svg>
				<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
					<path
						d="M2 10 c2 0 2 2 4 2 s2 -2 4 -2 s2 2 4 2"
						fill="none"
						stroke="currentColor"
					/>
					<path d="M4 10 L8 4 L12 10" fill="none" stroke="currentColor" />
				</svg>
			</div>
			<div className="text-left">
				100% COMMUNITY
				<br />
				DO NOT GATEKEEP
				<br />
				KEEP AWAY FROM CYNICS
				<br />
				MADE IN CHELSEA, NYC
			</div>
			<div className="mt-3 border-t border-border pt-2 opacity-60">
				RN°118-26 / LOT {LOT}
			</div>
		</div>
	);
}

function ShippingLabel() {
	return (
		<div className="w-full max-w-[300px] border border-border bg-background font-mono text-[10px]">
			<div className="flex justify-between border-b border-border px-3 py-2">
				<span className="font-bold tracking-[0.15em]">MANIFEST</span>
				<span className="opacity-60">№ 0018 / 0030</span>
			</div>
			<div className="grid grid-cols-2 border-b border-border">
				<div className="border-r border-border px-3 py-2">
					<div className="opacity-50 text-[8px]">ORIGIN</div>
					AMBITION, USA
				</div>
				<div className="px-3 py-2">
					<div className="opacity-50 text-[8px]">DEST.</div>
					CHELSEA, NYC
				</div>
			</div>
			<div className="grid grid-cols-3 border-b border-border text-center">
				<div className="border-r border-border px-2 py-2">
					<div className="opacity-50 text-[8px]">WT.</div>
					30 PPL
				</div>
				<div className="border-r border-border px-2 py-2">
					<div className="opacity-50 text-[8px]">DUR.</div>
					12 WK
				</div>
				<div className="px-2 py-2">
					<div className="opacity-50 text-[8px]">CLASS</div>
					S/26
				</div>
			</div>
			<div className="px-3 py-3 text-foreground">
				<Barcode seed={41} bars={48} height={30} className="w-full" />
				<div className="mt-1 text-center tracking-[0.35em] text-[9px]">
					4 0 7 4 3 4 · 7 4 0 0 0 2
				</div>
			</div>
		</div>
	);
}

function CoordinateStamp() {
	return (
		<div className="flex flex-col items-center gap-3 font-mono">
			<RegistrationMark size={34} />
			<div className="text-center text-[11px] leading-relaxed tracking-[0.06em]">
				{LAT}
				<br />
				{LNG}
			</div>
			<div className="text-[9px] tracking-[0.4em] opacity-60">
				ELEV. 7M — EST (UTC−5)
			</div>
			<div className="mt-1 flex items-center gap-2 text-[9px] tracking-[0.2em]">
				<span className="size-[5px] rounded-full bg-[#e7000b]" />
				YOU ARE HERE
			</div>
		</div>
	);
}

function ColorwaySwatches() {
	const swatches = [
		{ hex: "#f2f1e8", name: "CREAM", code: "PMS 9224C" },
		{ hex: "#e8e6da", name: "STONE", code: "PMS 9080C" },
		{ hex: "#6b6a62", name: "FADED INK", code: "PMS 417C" },
		{ hex: "#2b2b2b", name: "INK", code: "PMS 419C" },
		{ hex: "#e7000b", name: "SIGNAL", code: "PMS 485C" },
	];
	return (
		<div className="w-full max-w-[320px] font-mono text-[9px]">
			<div className="mb-2 tracking-[0.2em] opacity-60">
				COLORWAY — {SEASON}
			</div>
			{swatches.map((s, i) => (
				<div
					key={s.name}
					className="flex items-center gap-3 border-t border-border py-1.5 last:border-b"
				>
					<span className="w-5 opacity-50">
						{String(i + 1).padStart(2, "0")}
					</span>
					<span
						className="size-4 border border-border"
						style={{ backgroundColor: s.hex }}
					/>
					<span className="flex-1 tracking-[0.1em]">{s.name}</span>
					<span className="opacity-50">{s.hex.toUpperCase()}</span>
					<span className="opacity-50">{s.code}</span>
				</div>
			))}
		</div>
	);
}

function DensityScale() {
	return (
		<div className="w-full max-w-[320px] font-mono text-[9px]">
			<div className="mb-3 tracking-[0.2em] opacity-60">SIGNAL PROFILE</div>
			{[
				["AMBITION", 0.92],
				["CRAFT", 0.85],
				["WARMTH", 0.78],
				["CYNICISM", 0.06],
			].map(([name, v]) => (
				<div key={name as string} className="flex items-center gap-3 py-2">
					<span className="w-16 tracking-[0.1em]">{name}</span>
					<span className="relative flex-1 h-px bg-border">
						{Array.from({ length: 11 }).map((_, i) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: static ticks
								key={i}
								className="absolute top-[-2px] h-[5px] w-px bg-border"
								style={{ left: `${i * 10}%` }}
							/>
						))}
						<span
							className="absolute top-[-2.5px] size-[6px] rounded-full bg-foreground"
							style={{ left: `calc(${(v as number) * 100}% - 3px)` }}
						/>
					</span>
					<span className="w-8 text-right opacity-50">
						{Math.round((v as number) * 100)}
					</span>
				</div>
			))}
		</div>
	);
}

function RulerScale() {
	return (
		<div className="w-full max-w-[340px]">
			<svg
				viewBox="0 0 340 44"
				className="w-full text-foreground"
				aria-hidden="true"
			>
				<line x1="0" y1="30" x2="340" y2="30" stroke="currentColor" />
				{Array.from({ length: 69 }).map((_, i) => {
					const x = i * 5;
					const major = i % 10 === 0;
					const mid = i % 5 === 0;
					return (
						<line
							// biome-ignore lint/suspicious/noArrayIndexKey: static ticks
							key={i}
							x1={x}
							y1={30}
							x2={x}
							y2={major ? 12 : mid ? 18 : 24}
							stroke="currentColor"
							strokeWidth={major ? 1.2 : 0.7}
						/>
					);
				})}
				{[0, 1, 2, 3, 4, 5, 6].map((n) => (
					<text
						key={n}
						x={n * 50}
						y={42}
						fontSize="7"
						fontFamily="Geist Mono, monospace"
						fill="currentColor"
						textAnchor={n === 0 ? "start" : "middle"}
					>
						{n * 5}
					</text>
				))}
			</svg>
			<div className="mt-2 flex justify-between font-mono text-[9px] tracking-[0.2em] opacity-60">
				<span>SCALE 1:1</span>
				<span>UNITS: BLOCKS</span>
			</div>
		</div>
	);
}

function BatchStamp() {
	return (
		<div className="flex flex-col items-center gap-2 font-mono text-center">
			<div className="flex size-24 items-center justify-center rounded-full border border-current">
				<div className="flex size-[74px] flex-col items-center justify-center rounded-full border border-current leading-tight">
					<span className="text-[8px] tracking-[0.25em]">BATCH</span>
					<span className="text-lg font-bold">001</span>
					<span className="text-[8px] tracking-[0.25em]">OF 001</span>
				</div>
			</div>
			<div className="mt-2 text-[9px] tracking-[0.3em] opacity-60">
				SMALL BATCH — NOT FOR RESALE
			</div>
			<div className="text-[9px] tracking-[0.15em]">
				BOTTLED 2026.06.01 / NYC
			</div>
		</div>
	);
}

function IndexLegend() {
	return (
		<div className="w-full max-w-[420px] font-mono text-[10px] leading-[1.8]">
			<div className="text-foreground">
				<Barcode seed={97} bars={64} height={22} className="w-full" />
			</div>
			<div className="mt-4">
				1. Chelsea Commons™: Cityname:Statename&nbsp;&nbsp;2. New York:NY:
				Address civic number, zip&nbsp;&nbsp;3. CC™: Payoff™
				<br />
				4. Cityname:Statename Coordinates&nbsp;&nbsp;CC™ Payoff™&nbsp;&nbsp;5.
				CC™ Logo
			</div>
			<div className="mt-3 opacity-50">
				ALL MARKS SET IN GEIST MONO / NEUE MONTREAL. ALIGNMENT IS
				NON-NEGOTIABLE.
			</div>
		</div>
	);
}

function TimeTable() {
	const rows = [
		["06.01", "MOVE-IN", "CHELSEA, NYC", "CONF"],
		["06.19", "ROOFTOP 001", "CHELSEA", "CONF"],
		["07.04", "COMMONS COOKOUT", "HIGH LINE", "CONF"],
		["08.02", "DEMO NIGHT", "TBD", "HOLD"],
		["08.23", "CLOSING DINNER", "TBD", "HOLD"],
	];
	return (
		<div className="w-full max-w-[340px] font-mono text-[9px]">
			<div className="flex justify-between border-b border-current pb-1 tracking-[0.2em] font-bold">
				<span>SCHED. {SEASON}</span>
				<span>REV. C</span>
			</div>
			{rows.map((r) => (
				<div
					key={r[1]}
					className="grid grid-cols-[40px_1fr_70px_36px] gap-2 border-b border-border py-1.5"
				>
					<span className="opacity-60">{r[0]}</span>
					<span className="tracking-[0.05em]">{r[1]}</span>
					<span className="opacity-60">{r[2]}</span>
					<span
						className={r[3] === "CONF" ? "text-right" : "text-right opacity-40"}
					>
						{r[3]}
					</span>
				</div>
			))}
		</div>
	);
}

function DielineBox() {
	return (
		<div className="flex items-center gap-6">
			<svg
				viewBox="0 0 120 100"
				width="150"
				className="text-foreground"
				aria-hidden="true"
			>
				{/* unfolded box dieline */}
				<rect
					x="35"
					y="30"
					width="40"
					height="40"
					fill="none"
					stroke="currentColor"
					strokeWidth="1"
				/>
				<rect
					x="35"
					y="8"
					width="40"
					height="22"
					fill="none"
					stroke="currentColor"
					strokeWidth="1"
					strokeDasharray="3 2"
				/>
				<rect
					x="35"
					y="70"
					width="40"
					height="22"
					fill="none"
					stroke="currentColor"
					strokeWidth="1"
					strokeDasharray="3 2"
				/>
				<rect
					x="10"
					y="30"
					width="25"
					height="40"
					fill="none"
					stroke="currentColor"
					strokeWidth="1"
					strokeDasharray="3 2"
				/>
				<rect
					x="75"
					y="30"
					width="25"
					height="40"
					fill="none"
					stroke="currentColor"
					strokeWidth="1"
					strokeDasharray="3 2"
				/>
				<text
					x="55"
					y="53"
					fontSize="6"
					fontFamily="Geist Mono, monospace"
					fill="currentColor"
					textAnchor="middle"
				>
					CC
				</text>
				{/* dimension arrows */}
				<line
					x1="35"
					y1="98"
					x2="75"
					y2="98"
					stroke="currentColor"
					strokeWidth="0.6"
				/>
				<text
					x="55"
					y="96"
					fontSize="5"
					fontFamily="Geist Mono, monospace"
					fill="currentColor"
					textAnchor="middle"
				>
					88MM
				</text>
			</svg>
			<div className="font-mono text-[9px] leading-[1.9]">
				<div className="font-bold tracking-[0.2em] mb-1">PACKAGING</div>
				MAT: 350GSM KRAFT
				<br />
				PRINT: 1/0 INK
				<br />
				FINISH: NONE. IT'S PAPER.
				<br />
				<span className="opacity-50">DWG № CC-PKG-04</span>
			</div>
		</div>
	);
}

function InvertedID() {
	return (
		<div className="flex flex-col items-center gap-3 font-mono text-center">
			<div className="text-[10px] tracking-[0.45em] opacity-70">
				IDENTIFICATION
			</div>
			<div className="font-sans text-4xl font-medium tracking-tight">CC®</div>
			<div className="text-background">
				<Barcode seed={13} bars={36} height={26} />
			</div>
			<div className="text-[10px] tracking-[0.3em]">
				{LOT}
				<br />
				<span className="opacity-60">VALID THRU 08.31.26</span>
			</div>
		</div>
	);
}

function MetroGrid() {
	return (
		<div className="flex items-center gap-6">
			<svg
				viewBox="0 0 100 100"
				width="120"
				className="text-foreground"
				aria-hidden="true"
			>
				{/* Manhattan street grid abstraction */}
				{[0, 1, 2, 3, 4, 5, 6].map((i) => (
					<line
						key={`h${i}`}
						x1="8"
						y1={14 + i * 12}
						x2="92"
						y2={14 + i * 12}
						stroke="currentColor"
						strokeWidth="0.7"
					/>
				))}
				{[0, 1, 2, 3, 4].map((i) => (
					<line
						key={`v${i}`}
						x1={14 + i * 18}
						y1="8"
						x2={14 + i * 18}
						y2="92"
						stroke="currentColor"
						strokeWidth="0.7"
					/>
				))}
				{/* Broadway diagonal */}
				<line
					x1="20"
					y1="92"
					x2="86"
					y2="8"
					stroke="currentColor"
					strokeWidth="1"
				/>
				<circle cx="32" cy="62" r="3.5" fill="#e7000b" />
			</svg>
			<div className="font-mono text-[9px] leading-[1.9]">
				<div className="font-bold tracking-[0.2em] mb-1">GRID REF.</div>
				AVE: 8TH — 9TH
				<br />
				ST: CHELSEA
				<br />
				SECTOR: CHELSEA
				<br />
				<span className="text-[#e7000b]">● COMMON ROOM</span>
			</div>
		</div>
	);
}

const DOT_C = [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."];

function DotMatrixSpecimen() {
	const cell = 8;
	const glyphW = 5 * cell;
	const gap = cell * 1.5;
	return (
		<div className="flex flex-col items-center gap-4">
			<svg
				viewBox={`0 0 ${glyphW * 2 + gap} ${7 * cell}`}
				width={(glyphW * 2 + gap) * 1.1}
				aria-hidden="true"
				className="text-foreground"
			>
				{[0, 1].map((g) =>
					DOT_C.map((row, y) =>
						row
							.split("")
							.map((ch, x) =>
								ch === "#" ? (
									<circle
										key={`g${g}-${y}-${x}`}
										cx={g * (glyphW + gap) + x * cell + cell / 2}
										cy={y * cell + cell / 2}
										r={cell * 0.38}
										fill="currentColor"
									/>
								) : (
									<circle
										key={`g${g}-${y}-${x}`}
										cx={g * (glyphW + gap) + x * cell + cell / 2}
										cy={y * cell + cell / 2}
										r={cell * 0.08}
										fill="currentColor"
										opacity="0.25"
									/>
								),
							),
					),
				)}
			</svg>
			<div className="font-mono text-[9px] leading-[1.8] text-center tracking-[0.1em]">
				MATRIX 5×7 — IMPACT PRINT
				<br />
				<span className="opacity-50">9-PIN · 240 DPI · RIBBON: INK</span>
			</div>
		</div>
	);
}

function CalibrationStrip() {
	return (
		<div className="w-full max-w-[320px] font-mono">
			<div className="mb-2 flex justify-between text-[9px] tracking-[0.2em]">
				<span className="font-bold">PRINT CONTROL</span>
				<span className="opacity-50">K ONLY — 1/0</span>
			</div>
			<div className="flex h-10 w-full border border-border">
				{Array.from({ length: 11 }).map((_, i) => (
					<span
						// biome-ignore lint/suspicious/noArrayIndexKey: static ramp
						key={i}
						className="flex-1 bg-foreground"
						style={{ opacity: i / 10 }}
					/>
				))}
			</div>
			<div className="mt-1 flex justify-between text-[8px] opacity-60">
				<span>0</span>
				<span>50</span>
				<span>100</span>
			</div>
			<div className="mt-4 flex items-center justify-between">
				<RegistrationMark size={20} />
				<span className="text-[8px] tracking-[0.25em] opacity-60">
					IF THIS IS GREY, THE PRESS IS FINE
				</span>
				<RegistrationMark size={20} />
			</div>
		</div>
	);
}

function DataMatrixMark() {
	const n = 16;
	const rand = seeded(73);
	const cells: boolean[][] = Array.from({ length: n }, (_, y) =>
		Array.from({ length: n }, (_, x) => {
			if (x === 0 || y === n - 1) return true; // solid "L" finder
			if (y === 0 || x === n - 1) return (x + y) % 2 === 0; // clock track
			return rand() > 0.5;
		}),
	);
	const c = 6;
	return (
		<div className="flex items-center gap-6">
			<svg
				viewBox={`0 0 ${n * c} ${n * c}`}
				width={n * c * 1.15}
				aria-hidden="true"
				className="text-foreground"
			>
				{cells.map((row, y) =>
					row.map((on, x) =>
						on ? (
							<rect
								key={`c${y}-${x}`}
								x={x * c}
								y={y * c}
								width={c}
								height={c}
								fill="currentColor"
							/>
						) : null,
					),
				)}
			</svg>
			<div className="font-mono text-[9px] leading-[1.9]">
				<div className="font-bold tracking-[0.2em] mb-1">TRACKING</div>
				{LOT}
				<br />
				ECC 200 · 16×16
				<br />
				PAYLOAD: 30 NAMES
				<br />
				<span className="opacity-50">SCANS TO NOTHING.</span>
				<br />
				<span className="opacity-50">IT'S ABOUT THE PEOPLE.</span>
			</div>
		</div>
	);
}

function FieldRecording() {
	const rand = seeded(29);
	const bars = 72;
	return (
		<div className="w-full max-w-[320px] font-mono">
			<div className="mb-3 flex justify-between text-[9px] tracking-[0.15em]">
				<span className="font-bold">FIELD REC. 004</span>
				<span className="flex items-center gap-1.5">
					<span className="size-[5px] rounded-full bg-[#e7000b]" />
					REC
				</span>
			</div>
			<svg
				viewBox={`0 0 ${bars * 3} 48`}
				className="w-full text-foreground"
				aria-hidden="true"
				preserveAspectRatio="none"
			>
				{Array.from({ length: bars }).map((_, i) => {
					const env = Math.sin((i / bars) * Math.PI) ** 0.6;
					const h = Math.max(2, env * (10 + rand() * 34));
					return (
						<rect
							// biome-ignore lint/suspicious/noArrayIndexKey: static waveform
							key={i}
							x={i * 3}
							y={24 - h / 2}
							width={1.8}
							height={h}
							fill="currentColor"
						/>
					);
				})}
			</svg>
			<div className="mt-2 flex justify-between text-[8px] tracking-[0.12em] opacity-60">
				<span>00:00:00</span>
				<span>CHELSEA — STOOP</span>
				<span>00:12:26</span>
			</div>
			<div className="mt-3 text-[9px] leading-[1.8] opacity-80">
				SRC: LAUGHTER, TRAFFIC, ONE (1) ARGUMENT ABOUT DISTRIBUTED SYSTEMS
				<br />
				<span className="opacity-60">48KHZ / 24-BIT · 22:41 EST</span>
			</div>
		</div>
	);
}

function SunPathChart() {
	// July in NYC: sunrise ~05:31, sunset ~20:31
	return (
		<div className="w-full max-w-[300px] font-mono">
			<svg
				viewBox="0 0 240 110"
				className="w-full text-foreground"
				aria-hidden="true"
			>
				{/* sun arc */}
				<path
					d="M 20 95 A 100 100 0 0 1 220 95"
					fill="none"
					stroke="currentColor"
					strokeWidth="0.8"
					strokeDasharray="3 3"
				/>
				{/* horizon */}
				<line
					x1="4"
					y1="95"
					x2="236"
					y2="95"
					stroke="currentColor"
					strokeWidth="1"
				/>
				{/* hour ticks along arc */}
				{[0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875].map((t) => {
					const a = Math.PI * (1 - t);
					const x = 120 + 100 * Math.cos(a);
					const y = 95 - 100 * Math.sin(a) * 0.78;
					return (
						<circle
							key={t}
							cx={x}
							cy={y}
							r="1.4"
							fill="currentColor"
							opacity="0.4"
						/>
					);
				})}
				{/* golden hour sun position */}
				<circle cx="196" cy="60" r="7" fill="none" stroke="currentColor" />
				<circle cx="196" cy="60" r="2.5" fill="#e7000b" />
				<text
					x="120"
					y="106"
					fontSize="7"
					fontFamily="Geist Mono, monospace"
					fill="currentColor"
					textAnchor="middle"
					opacity="0.6"
				>
					SOLAR TRACK — 40.7434°N
				</text>
				<text
					x="20"
					y="90"
					fontSize="7"
					fontFamily="Geist Mono, monospace"
					fill="currentColor"
					textAnchor="middle"
				>
					05:31
				</text>
				<text
					x="220"
					y="90"
					fontSize="7"
					fontFamily="Geist Mono, monospace"
					fill="currentColor"
					textAnchor="middle"
				>
					20:31
				</text>
			</svg>
			<div className="mt-3 grid grid-cols-2 gap-y-1 text-[9px] tracking-[0.1em]">
				<span className="opacity-50">GOLDEN HR</span>
				<span className="text-right">19:42 — 20:31</span>
				<span className="opacity-50">ROOFTOP COND.</span>
				<span className="text-right text-[#e7000b]">OPTIMAL</span>
			</div>
		</div>
	);
}

function TransitRef() {
	return (
		<div className="flex flex-col items-center gap-4 font-mono">
			<div className="flex items-center gap-3">
				{["C", "E", "1"].map((line) => (
					<span
						key={line}
						className="flex size-10 items-center justify-center rounded-full bg-foreground font-sans text-lg font-bold text-background"
					>
						{line}
					</span>
				))}
			</div>
			<div className="text-center text-[9px] leading-[1.9] tracking-[0.1em]">
				23 ST STATION — 8 AV
				<br />
				<span className="opacity-60">4 MIN WALK · HEAD NORTH</span>
			</div>
			<div className="flex w-full max-w-[220px] items-center justify-between border-t border-border pt-2 text-[8px] tracking-[0.2em] opacity-60">
				<span>EXIT: NW CORNER</span>
				<span>↑ N</span>
			</div>
		</div>
	);
}

function CrateStencil() {
	return (
		<div className="w-full max-w-[280px] border-2 border-foreground p-5 font-sans">
			<div className="flex items-start justify-between">
				<div>
					<div className="text-2xl font-bold uppercase leading-none tracking-tight">
						This
						<br />
						Side Up
					</div>
					<div className="mt-2 font-mono text-[9px] tracking-[0.2em] opacity-60">
						HANDLE WITH CARE
					</div>
				</div>
				<svg
					viewBox="0 0 34 30"
					width="34"
					aria-hidden="true"
					className="text-foreground mt-1"
				>
					<path d="M8 30 V12 H2 L13 0 L24 12 H18 V30 Z" fill="currentColor" />
					<rect x="27" y="0" width="4" height="30" fill="currentColor" />
				</svg>
			</div>
			<div className="mt-4 border-t-2 border-foreground pt-3 font-mono text-[9px] leading-[1.9]">
				CONTENTS: 30 BUILDERS
				<br />
				GROSS WT: IMMEASURABLE
				<br />
				STACK LIMIT: DO NOT STACK
				<br />
				<span className="opacity-50">CRATE № CC-NYC-001</span>
			</div>
		</div>
	);
}

function TapeStrip() {
	const unit = (
		<span className="mx-6 inline-flex items-center gap-6">
			<span>CHELSEA COMMONS™</span>
			<Dot className="bg-background" />
			<span>{SEASON}</span>
			<Dot className="bg-background" />
			<span>NEW YORK:NY</span>
			<Dot className="bg-background" />
			<span>{LAT}</span>
			<Dot className="bg-background" />
			<span>NEVER STOP BUILDING™</span>
			<Dot className="bg-background" />
		</span>
	);
	return (
		<div className="w-full overflow-hidden bg-foreground text-background py-2.5 font-mono text-[10px] tracking-[0.15em] whitespace-nowrap">
			<div className="inline-block">
				{unit}
				{unit}
				{unit}
			</div>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Micrographics() {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<Navbar />
			<main className="mx-auto max-w-6xl px-6 sm:px-12 pt-28 sm:pt-36 pb-24">
				{/* Header */}
				<header className="mb-12">
					<div className="flex items-baseline justify-between font-mono text-[10px] tracking-[0.15em] text-muted-foreground border-b border-border pb-3 mb-8">
						<span>CC-DOC-07 / REV. A</span>
						<span>SHEET 1 OF 1</span>
						<span className="hidden sm:inline">
							{LAT} {LNG}
						</span>
					</div>
					<h1 className="font-serif text-4xl sm:text-6xl font-medium leading-[1.05]">
						Micrographics
					</h1>
					<p className="mt-4 max-w-lg text-muted-foreground">
						A working library of small marks: spec blocks, batch stamps, and
						identification systems for Chelsea Commons. Precision is what makes
						it feel premium.
					</p>
				</header>

				<TapeStrip />

				{/* Grid */}
				<div className="mt-px grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
					<Tile fig="01" label="City lockup" span={2}>
						<CityLockup />
					</Tile>
					<Tile fig="02" label="Spec plate" invert>
						<SpecPlate />
					</Tile>
					<Tile fig="03" label="Scan sequence">
						<ScanSequence />
					</Tile>
					<Tile fig="04" label="Scan sequence II">
						<ScanSequenceForms />
					</Tile>
					<Tile fig="05" label="Orbital survey">
						<OrbitalGlobe />
					</Tile>
					<Tile fig="06" label="Matrix specimen">
						<DotMatrixSpecimen />
					</Tile>
					<Tile fig="07" label="Care label">
						<GarmentTag />
					</Tile>
					<Tile fig="08" label="Coordinate stamp">
						<CoordinateStamp />
					</Tile>
					<Tile fig="09" label="Manifest">
						<ShippingLabel />
					</Tile>
					<Tile fig="10" label="Colorway" span={2}>
						<ColorwaySwatches />
					</Tile>
					<Tile fig="11" label="Signal profile">
						<DensityScale />
					</Tile>
					<Tile fig="12" label="Batch stamp">
						<BatchStamp />
					</Tile>
					<Tile fig="13" label="Ruler" span={2 as const}>
						<RulerScale />
					</Tile>
					<Tile fig="14" label="Grid reference">
						<MetroGrid />
					</Tile>
					<Tile fig="15" label="Schedule">
						<TimeTable />
					</Tile>
					<Tile fig="16" label="Dieline">
						<DielineBox />
					</Tile>
					<Tile fig="17" label="ID card" invert>
						<InvertedID />
					</Tile>
					<Tile fig="18" label="Print control">
						<CalibrationStrip />
					</Tile>
					<Tile fig="19" label="Tracking">
						<DataMatrixMark />
					</Tile>
					<Tile fig="20" label="Field recording">
						<FieldRecording />
					</Tile>
					<Tile fig="21" label="Solar track">
						<SunPathChart />
					</Tile>
					<Tile fig="22" label="Transit ref.">
						<TransitRef />
					</Tile>
					<Tile fig="23" label="Crate stencil">
						<CrateStencil />
					</Tile>
					<Tile fig="24" label="Glyph index" span={2}>
						<GlyphIndex />
					</Tile>
					<Tile fig="25" label="Caution">
						<HazardStrip />
					</Tile>
					<Tile fig="26" label="Footnotes">
						<AsteriskFootnote />
					</Tile>
					<Tile fig="27" label="Legend" span={2}>
						<IndexLegend />
					</Tile>
				</div>

				{/* Footer plate */}
				<div className="mt-12 flex items-center justify-between font-mono text-[9px] tracking-[0.2em] text-muted-foreground border-t border-border pt-4">
					<span>© 2026 CHELSEA COMMONS™</span>
					<RegistrationMark size={18} />
					<span>PRINTED IN NEW YORK</span>
				</div>
			</main>
			<Footer />
		</div>
	);
}
