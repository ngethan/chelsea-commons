import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { EventPhotos } from "../components/EventPhotos";
import { FitText } from "../components/FitText";
import { Footer } from "../components/Footer";
import { LogoStrip } from "../components/LogoStrip";
import { Navbar } from "../components/Navbar";
import { HalftoneHeroImage } from "../components/halftone-hero-image";
import {
	Barcode,
	CropCorner,
	Dot,
	GlyphAsterisk,
	HalftoneGlobe,
	RegistrationMark,
} from "../components/micrographics";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "../components/ui/accordion";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/v2")({
	head: () => {
		const seo = buildSeoTags({
			title: "Chelsea Commons",
			description:
				"A community of young, ambitious builders, operators, and founders in New York.",
			path: "/v2",
		});
		return {
			title: seo.title,
			meta: seo.meta,
			links: seo.links,
		};
	},
	component: App,
});

const LAT = `40°44'36"N`;
const LNG = `74°00'01"W`;

const FAQS = [
	{
		question: "What is Chelsea Commons?",
		answer:
			"A community of young, ambitious builders, operators, and founders in New York. It started as twelve people living together in Chelsea, and it's growing into a network that hosts dinners, mixers, and events across the city.",
	},
	{
		question: "Who is it for?",
		answer:
			"People early in their careers who are building something: founders, engineers, operators, investors, and the generally ambitious. If you want to be around people who make things happen, you'll fit in.",
	},
	{
		question: "How do I get involved?",
		answer:
			"Come to an event. We host mixers, dinners, and gatherings throughout the summer. Sign up on our events page.",
	},
	{
		question: "How does the house work?",
		answer:
			"Each summer we bring together a new cohort of residents to live in the house in Chelsea. Batches change year to year, and the community keeps growing as they cycle through.",
	},
	{
		question: "Can I join a future cohort?",
		answer:
			"Yes. We select a new batch of residents ahead of each summer. Reach out at hey@chelseacommons.co or follow us to hear when applications open.",
	},
	{
		question: "Is this a hacker house?",
		answer:
			"Not in the intense, mandatory-events way. There's no forced building or networking, just ambitious people who genuinely want to spend time together and leverage each other's strengths to build something special.",
	},
	{
		question: "Where are you based?",
		answer:
			"Chelsea, Manhattan. The community grew out of a house in the neighborhood, and most of our events happen nearby.",
	},
	{
		question: "Are there organized events?",
		answer:
			"Yes: mixers, speaker dinners, and smaller gatherings throughout the summer. Check the events page for what's coming up.",
	},
	{
		question: "What does it cost?",
		answer:
			"Events are mostly free, just sign up. Residents in each summer cohort pay rent for their room in the house, and we work with partners and sponsors to bring that cost down.",
	},
	{
		question: "What do members do during the day?",
		answer:
			"Most are at their jobs, internships, or startups during the day. Evenings and weekends are for the community: exploring the city, hosting events, and building together.",
	},
];

function FAQSection() {
	const [openItem, setOpenItem] = useState<string | undefined>(undefined);

	const half = Math.ceil(FAQS.length / 2);
	const leftFaqs = FAQS.slice(0, half);
	const rightFaqs = FAQS.slice(half);

	return (
		<section className="relative px-6 md:px-12 py-16 border-t border-border">
			<div className="mb-10 flex items-baseline justify-between">
				<h2 className="font-serif italic text-3xl md:text-4xl text-foreground">
					Common questions
				</h2>
				<span className="hidden sm:block font-mono text-[10px] tracking-[0.2em] text-muted-foreground">
					SEC. 04 — INQUIRIES
				</span>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 items-start">
				<div>
					<Accordion
						type="single"
						collapsible
						value={openItem}
						onValueChange={setOpenItem}
						className="w-full"
					>
						{leftFaqs.map((faq, index) => (
							<AccordionItem key={faq.question} value={`item-${index}`}>
								<AccordionTrigger>{faq.question}</AccordionTrigger>
								<AccordionContent>{faq.answer}</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
				<div>
					<Accordion
						type="single"
						collapsible
						value={openItem}
						onValueChange={setOpenItem}
						className="w-full"
					>
						{rightFaqs.map((faq, index) => (
							<AccordionItem key={faq.question} value={`item-${index + half}`}>
								<AccordionTrigger>{faq.question}</AccordionTrigger>
								<AccordionContent>{faq.answer}</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</div>
			</div>
		</section>
	);
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const fadeUp = (delay: number) => ({
	initial: { opacity: 0, y: 15 },
	animate: { opacity: 1, y: 0 },
	transition: { duration: 0.4, ease: "easeOut" as const, delay },
});

/** Top spec bar: document metadata over a hairline. */
function SpecBar() {
	return (
		<div className="flex items-center justify-between border-b border-border pb-3 font-mono text-[9px] sm:text-[10px] tracking-[0.15em] text-muted-foreground">
			<span>CC™ EST. 2026</span>
			<span className="hidden sm:inline">
				{LAT} {LNG}
			</span>
			<span className="hidden md:inline">DOC. CC-V2 / REV. B</span>
			<span>NEW YORK:NY</span>
		</div>
	);
}

/** Big TNF-style type lockup with bullet-anchored footnotes. */
function HeroLockup() {
	return (
		<div className="relative">
			<motion.h1 {...fadeUp(0)} className="w-full min-w-0">
				<FitText
					className="font-sans font-medium uppercase text-foreground"
					style={{ lineHeight: 0.82, letterSpacing: "-0.03em" }}
				>
					Chelsea
				</FitText>
				<div className="relative">
					<FitText
						className="font-sans font-medium uppercase text-foreground"
						style={{ lineHeight: 0.92, letterSpacing: "-0.03em" }}
					>
						Commons®
					</FitText>
				</div>
			</motion.h1>

			{/* bullet footnotes, TNF-style */}
			<motion.div
				{...fadeUp(0.1)}
				className="mt-4 flex flex-wrap justify-between gap-x-8 gap-y-3 font-mono text-[9px] sm:text-[10px] leading-[1.5] uppercase"
			>
				<span className="relative pl-3">
					<Dot className="absolute left-0 top-[3px]" />
					New York:NY
					<br />
					Chelsea, Manhattan
				</span>
				<span className="relative pl-3">
					<Dot className="absolute left-0 top-[3px]" />
					CC™ Never Stop
					<br />
					Building™
				</span>
				<span className="relative hidden sm:inline pl-3">
					<Dot className="absolute left-0 top-[3px]" />
					Summer 2026
					<br />
					Cohort S/26
				</span>
				<span className="relative hidden md:inline pl-3 text-right">
					<Dot className="absolute left-0 top-[3px]" />
					{LAT}
					<br />
					{LNG}
				</span>
			</motion.div>
		</div>
	);
}

/** Intro copy + technical rail beside it. */
function HeroIntro() {
	return (
		<div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-border pt-8">
			{/* left: index */}
			<motion.div
				{...fadeUp(0.15)}
				className="hidden lg:flex lg:col-span-2 flex-col gap-3 font-mono text-[9px] tracking-[0.15em] text-muted-foreground"
			>
				<span>SEC. 01</span>
				<span>THE PITCH</span>
				<GlyphAsterisk size={14} />
			</motion.div>

			{/* middle: the actual pitch */}
			<motion.div
				{...fadeUp(0.2)}
				className="lg:col-span-6 flex flex-col gap-5"
			>
				<p className="text-lg md:text-2xl text-foreground leading-snug">
					A community of young, ambitious builders, operators, and founders in
					New York — born out of a house in Chelsea.
				</p>
				<p className="text-base md:text-lg text-muted-foreground leading-relaxed">
					We host dinners, mixers, and events across the city. Want to come to
					one? Fill out our{" "}
					<Link
						to="/rsvp"
						target="_blank"
						rel="noopener noreferrer"
						className="text-foreground underline underline-offset-4 decoration-1 hover:text-muted-foreground transition-colors"
					>
						interest form
					</Link>
					.
				</p>
			</motion.div>

			{/* right: micrographic rail */}
			<motion.div
				{...fadeUp(0.25)}
				className="lg:col-span-4 flex flex-col gap-4 lg:border-l lg:border-border lg:pl-8"
			>
				<div className="flex items-end gap-3">
					<HalftoneGlobe seed={11} mode="lines" size={52} />
					<HalftoneGlobe seed={23} mode="noise" size={52} />
					<HalftoneGlobe seed={5} mode="dots" size={52} />
				</div>
				<div className="font-mono text-[9px] leading-[1.8] tracking-[0.08em] text-muted-foreground uppercase">
					©CC Project Common Room
					<br />
					Scan 001—003 · 1-bit · NYC
				</div>
				<div className="text-foreground max-w-[220px]">
					<Barcode seed={41} bars={44} height={26} className="w-full" />
					<div className="mt-1 flex justify-between font-mono text-[8px] tracking-[0.25em] text-muted-foreground">
						<span>407434</span>
						<span>740002</span>
					</div>
				</div>
			</motion.div>
		</div>
	);
}

/** Hero image with crop marks and a technical caption bar. */
function HeroImage() {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5, ease: "easeOut", delay: 0.3 }}
			className="relative mt-12"
		>
			<CropCorner className="absolute -left-1 -top-1 z-10" />
			<CropCorner className="absolute -right-1 -top-1 z-10 rotate-90" />
			<CropCorner className="absolute -left-1 -bottom-8 z-10 -rotate-90" />
			<CropCorner className="absolute -right-1 -bottom-8 z-10 rotate-180" />

			<HalftoneHeroImage
				image="/assets/creation-of-adam.jpg"
				alt="The hands of Adam and God reaching toward each other, after Michelangelo — rendered in halftone"
			/>

			<div className="mt-2 flex items-center justify-between font-mono text-[9px] tracking-[0.15em] text-muted-foreground uppercase">
				<span>FIG. 001 — The Common Room</span>
				<span className="hidden sm:flex items-center gap-2">
					<RegistrationMark size={14} />
					Halftone · 1/0 ink
				</span>
				<span>After Michelangelo, 1512</span>
			</div>
		</motion.div>
	);
}

/** Oversized stats band separated by hairlines. */
function StatsBand() {
	const stats = [
		{ n: "30", label: "Residents", note: "S/26 cohort" },
		{ n: "12", label: "Weeks", note: "Jun — Aug" },
		{ n: "01", label: "House", note: "Chelsea, NYC" },
		{ n: "∞", label: "Dinners", note: "approx." },
	];
	return (
		<section className="mt-16 border-y border-border">
			<div className="grid grid-cols-2 lg:grid-cols-4">
				{stats.map((s, i) => (
					<div
						key={s.label}
						className={`relative px-6 md:px-8 py-8 ${
							i > 0 ? "border-l border-border" : ""
						} ${i >= 2 ? "max-lg:border-t max-lg:border-border" : ""} ${
							i === 2 ? "max-lg:border-l-0" : ""
						}`}
					>
						<div className="font-sans font-medium text-6xl md:text-7xl tracking-tight text-foreground">
							{s.n}
						</div>
						<div className="mt-3 font-mono text-[10px] tracking-[0.2em] uppercase text-foreground">
							{s.label}
						</div>
						<div className="font-mono text-[9px] tracking-[0.15em] uppercase text-muted-foreground">
							{s.note}
						</div>
						<span className="absolute right-4 top-4 font-mono text-[9px] text-muted-foreground">
							{String(i + 1).padStart(2, "0")}
						</span>
					</div>
				))}
			</div>
		</section>
	);
}

/** Scrolling-tape-style strip (static repeat). */
function TapeStrip() {
	const unit = (
		<span className="mx-6 inline-flex items-center gap-6">
			<span>CHELSEA COMMONS™</span>
			<Dot className="bg-background" />
			<span>SUMMER 2026</span>
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

function App() {
	return (
		<div className="relative z-10">
			<Navbar />

			<main className="px-6 md:px-12 pt-10 md:pt-14 pb-16">
				<SpecBar />
				<div className="pt-8 md:pt-12">
					<HeroLockup />
				</div>
				<HeroIntro />
				<HeroImage />
				<div className="h-6" />
				<StatsBand />
			</main>

			<TapeStrip />

			<EventPhotos />

			<LogoStrip />

			<FAQSection />

			<Footer />
		</div>
	);
}
