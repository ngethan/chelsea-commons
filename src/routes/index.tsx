import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "../components/Navbar";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "../components/ui/accordion";
import { Button } from "../components/ui/button";
import { ScrollVelocityRow } from "../components/ui/scroll-based-velocity";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/")({
	head: () =>
		buildSeoTags({
			title: "Chelsea Commons",
			description: "Chelsea Commons",
			path: "/",
		}),
	component: App,
});

const COMPANIES = [
	{ name: "Y Combinator", logo: "/assets/yc-logo.svg", invert: false },
	{ name: "8VC", logo: "/assets/8vc-logo.png", invert: true },
	{ name: "BlackRock", logo: "/assets/blackrock-logo.png", invert: true },
	{ name: "JPMorgan Chase", logo: "/assets/jpmc-logo.png", invert: true },
	{ name: "Ramp", logo: "/assets/ramp-logo.png", invert: true },
	{
		name: "Radial Equity Partners",
		logo: "/assets/radial-logo.png",
	},
	{ name: "Red Bull", logo: "/assets/redbull-logo.svg", invert: false },
	{ name: "LA Clippers", logo: "/assets/clippers-logo.svg", invert: false },
];

const FAQS = [
	{
		question: "What's the cost?",
		answer:
			"The house is rent-free. You're responsible for your own food and personal expenses.",
	},
	{
		question: "How long is the program?",
		answer:
			"Summer 2026 - roughly June through August. Exact dates are flexible depending on your schedule.",
	},
	{
		question: "Where is the house?",
		answer:
			"Chelsea, Manhattan. The Found Study building at 300 W 20th Street. Great location with easy access to the rest of the city.",
	},
	{
		question: "What's included?",
		answer:
			"Furnished rooms, gym, study spaces, rooftop access, and a community of interesting people. Wifi and utilities included.",
	},
	{
		question: "Who are you looking for?",
		answer:
			"Founders, operators, creatives, interns at interesting companies - basically ambitious people who are fun to be around. We want a diverse mix, not just one type.",
	},
	{
		question: "Is this a hacker house?",
		answer:
			"Not in the intense, mandatory-events way. We're not trying to build a brand or force networking. Just a solid group of people who want to live together and enjoy the summer.",
	},
];

function FitText({
	children,
	className,
	style,
}: {
	children: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}) {
	const containerRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLSpanElement>(null);
	const [fontSize, setFontSize] = useState(10);

	useEffect(() => {
		const container = containerRef.current;
		const measure = measureRef.current;
		if (!container || !measure) return;

		const updateSize = () => {
			const containerWidth = container.offsetWidth;
			const measureWidth = measure.offsetWidth;
			if (measureWidth > 0) {
				// Calculate font size: (containerWidth / measureWidth) * baseFontSize(10px)
				setFontSize((containerWidth / measureWidth) * 10);
			}
		};

		document.fonts.ready.then(updateSize);
		const observer = new ResizeObserver(updateSize);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	return (
		<div ref={containerRef} className="w-full">
			{/* Hidden measurement element at 10px */}
			<span
				ref={measureRef}
				aria-hidden
				style={{
					position: "absolute",
					visibility: "hidden",
					fontSize: "10px",
					whiteSpace: "nowrap",
				}}
			>
				{children}
			</span>
			{/* Visible text */}
			<span
				className={className}
				style={{
					display: "block",
					fontSize: `${fontSize}px`,
					whiteSpace: "nowrap",
					lineHeight: 0.85,
					...style,
				}}
			>
				{children}
			</span>
		</div>
	);
}

function FAQSection() {
	const [openItem, setOpenItem] = useState<string | undefined>(undefined);

	const leftFaqs = FAQS.slice(0, 3);
	const rightFaqs = FAQS.slice(3);

	return (
		<section className="px-6 md:px-12 py-24 border-t border-border min-h-[600px]">
			<h2 className="text-2xl font-medium text-foreground mb-8">FAQ</h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 items-start">
				<Accordion
					type="single"
					collapsible
					value={openItem}
					onValueChange={setOpenItem}
					className="w-full"
				>
					{leftFaqs.map((faq, index) => (
						<AccordionItem key={index} value={`item-${index}`}>
							<AccordionTrigger>{faq.question}</AccordionTrigger>
							<AccordionContent>{faq.answer}</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
				<Accordion
					type="single"
					collapsible
					value={openItem}
					onValueChange={setOpenItem}
					className="w-full"
				>
					{rightFaqs.map((faq, index) => (
						<AccordionItem key={index + 3} value={`item-${index + 3}`}>
							<AccordionTrigger>{faq.question}</AccordionTrigger>
							<AccordionContent>{faq.answer}</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</div>
		</section>
	);
}

function App() {
	return (
		<div className="relative z-10">
			<Navbar />

			{/* Hero Section */}
			<main className="min-h-[calc(100dvh-72px)] flex items-center px-6 md:px-12">
				<div className="flex flex-col md:flex-row md:items-center gap-12 md:gap-16 w-full">
					{/* Left - Content */}
					<div className="flex-1">
						<div className="max-w-xl mb-12">
							<h1 className="text-4xl md:text-5xl font-medium text-white leading-tight mb-6">
								A house for ambitious people in NYC this summer.
							</h1>
							<p className="text-lg text-muted-foreground leading-relaxed mb-8">
								12-person house in Chelsea. Founders, operators, creatives, and
								interns building cool stuff and actually enjoying the summer
								together.
							</p>
							<div className="flex items-center gap-6">
								<Button
									size="lg"
									className="bg-white text-black hover:bg-white/90"
								>
									APPLY NOW
								</Button>
								<p className="text-muted-foreground">5 spots left.</p>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-8 md:gap-10">
							{COMPANIES.map((company) => (
								<div
									key={company.name}
									className={`grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all duration-300 ${company.invert ? "invert" : ""}`}
								>
									<img
										src={company.logo}
										alt={company.name}
										className="h-6 md:h-7 w-auto object-contain"
									/>
								</div>
							))}
						</div>
					</div>

					{/* Right - Image placeholder */}
					<div className="hidden md:flex flex-1 items-center justify-center">
						<div className="w-full aspect-[4/3] border border-border rounded-lg flex items-center justify-center">
							<p className="text-muted-foreground text-sm">Image here</p>
						</div>
					</div>
				</div>
			</main>

			{/* FAQ Section */}
			<FAQSection />

			{/* Footer */}
			<footer className="relative flex flex-col overflow-hidden border-t border-border">
				{/* Aurora Background - fades in from top */}
				<div
					className="absolute inset-0 overflow-hidden"
					style={
						{
							"--aurora":
								"repeating-linear-gradient(100deg, #2d1f3d 10%, #4a1942 15%, #c94c4c 20%, #f4a261 25%, #e76f51 30%, #8b5cf6 35%)",
							"--dark-gradient":
								"repeating-linear-gradient(100deg, #000 0%, #000 7%, transparent 10%, transparent 12%, #000 16%)",
							maskImage:
								"linear-gradient(to bottom, transparent 0%, transparent 40%, black 100%)",
							WebkitMaskImage:
								"linear-gradient(to bottom, transparent 0%, transparent 40%, black 100%)",
						} as React.CSSProperties
					}
				>
					<div
						className="after:animate-aurora pointer-events-none absolute -inset-[10px] opacity-70 blur-[20px] will-change-transform after:absolute after:inset-0 after:mix-blend-difference after:content-['']"
						style={{
							backgroundImage: "var(--aurora)",
							backgroundSize: "200%, 400%",
							backgroundPosition: "50% 50%",
						}}
					/>
					{/* Grain overlay */}
					<div
						className="absolute inset-0 opacity-30"
						style={{
							backgroundImage: "url(/grain.avif)",
							backgroundSize: "200px",
						}}
					/>
				</div>

				{/* Content */}
				<div className="relative z-10 flex flex-col flex-1">
					{/* Top bar with links */}
					<div className="px-6 md:px-12 py-6 flex items-center justify-between">
						<div className="text-sm text-muted-foreground">
							<a
								href="mailto:hey@chelseacommons.co"
								className="hover:text-foreground transition-colors"
							>
								hey@chelseacommons.co
							</a>
							<p>300 W 20th Street, New York, NY 10011</p>
						</div>
						<div className="flex items-center gap-6 text-sm text-muted-foreground">
							<a
								href="https://twitter.com"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-foreground transition-colors"
							>
								Twitter
							</a>
							<a
								href="https://instagram.com"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-foreground transition-colors"
							>
								Instagram
							</a>
						</div>
					</div>

					{/* Large Chelsea text */}
					<div className="flex flex-col justify-center py-12">
						<FitText className="font-serif text-8xl tracking-tight text-white opacity-75 leading-none select-none">
							CHELSEA
						</FitText>
						<FitText className="font-serif text-8xl tracking-tight text-white opacity-75 leading-none select-none">
							COMMONS
						</FitText>
					</div>

					{/* Marquee text */}
					<div className="border-t border-border py-4">
						<ScrollVelocityRow baseVelocity={3}>
							<span className="text-sm text-muted-foreground mx-8">
								NEW YORK CITY
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
							<span className="text-sm text-muted-foreground mx-8">
								SUMMER 2026
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
							<span className="text-sm text-muted-foreground mx-8">
								12 RESIDENTS
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
							<span className="text-sm text-muted-foreground mx-8">
								MANHATTAN
							</span>
							<span className="text-sm text-muted-foreground mx-8">✦</span>
						</ScrollVelocityRow>
					</div>
				</div>
			</footer>
		</div>
	);
}
