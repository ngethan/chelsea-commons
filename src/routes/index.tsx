import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Navbar } from "../components/Navbar";
import { Gallery } from "../components/gallery";
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
			description: "A summer house for 12 interns in Chelsea, Manhattan.",
			path: "/",
		}),
	component: App,
});

const COMPANIES = [
	{
		name: "Y Combinator",
		logo: "/assets/brands/yc-logo.svg",
		invert: false,
		url: "https://ycombinator.com",
	},
	{
		name: "8VC",
		logo: "/assets/brands/8vc-logo.png",
		invert: true,
		url: "https://8vc.com",
	},
	{
		name: "BlackRock",
		logo: "/assets/brands/blackrock-logo.png",
		invert: true,
		url: "https://blackrock.com",
	},
	{
		name: "JPMorgan Chase",
		logo: "/assets/brands/jpmc-logo.png",
		invert: true,
		url: "https://jpmorgan.com",
	},
	{
		name: "Ramp",
		logo: "/assets/brands/ramp-logo.png",
		invert: true,
		url: "https://ramp.com",
	},
	{
		name: "Warp",
		logo: "/assets/brands/warp-logo.png",
		invert: true,
		url: "https://www.joinwarp.com",
	},
	{
		name: "KPMG",
		logo: "/assets/brands/kpmg-logo.png",
		invert: false,
		url: "https://kpmg.com",
	},
	{
		name: "BCG",
		logo: "/assets/brands/bcg-logo.png",
		invert: false,
		url: "https://bcg.com",
	},
	{
		name: "Radial Equity Partners",
		logo: "/assets/brands/radial-logo.png",
		invert: false,
		white: true,
		url: "https://www.radialequity.com",
	},
	{
		name: "Teamworthy Ventures",
		logo: "/assets/brands/teamworthy-logo.png",
		invert: true,
		url: "https://www.teamworthy.com",
	},
];

const FAQS = [
	{
		question: "What's the cost?",
		answer:
			"Rent is $2,200 per person per month. We are actively working with partners and sponsors to subsidize rent for residents, and expect final pricing to be significantly lower.",
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
			"Furnished rooms, gym, study spaces, rooftop access. Wifi and utilities included.",
	},
	{
		question: "Who are we looking for?",
		answer:
			"Interns interested in entrepreneurship, exploration, and growth. We want a diverse mix of backgrounds and interests - stories are more important than credentials.",
	},
	{
		question: "Is this a hacker house?",
		answer:
			"Not in the intense, mandatory-events way. There is no mandatory building or networking. That said, the goal is to connect with each resident, hanging out on weekends while leveraging strengths to build something special.",
	},
	{
		question: "How do you choose people?",
		answer:
			"We're looking for people who are scrappy, take initiative, and would genuinely add to the house dynamic. People who think creatively and reach out to make things happen.",
	},
	{
		question: "What do people do during the day?",
		answer:
			"Most residents are at their internships during the day. Evenings and weekends are for exploring the city together.",
	},
	{
		question: "Are there organized events?",
		answer:
			"We want input from all residents, but we're thinking a mandatory Sunday dinner to learn something new or host interesting guests. Details TBD with the group.",
	},
	{
		question: "Will there be events outside the house?",
		answer:
			"Yes. We're planning to throw intern mixers and events throughout the summer. More details once we have everyone selected.",
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

	const half = Math.ceil(FAQS.length / 2);
	const leftFaqs = FAQS.slice(0, half);
	const rightFaqs = FAQS.slice(half);

	return (
		<section className="px-6 md:px-12 py-16 border-t border-border min-h-[600px]">
			<motion.h2
				initial={{ opacity: 0, y: 15 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true, margin: "-100px" }}
				transition={{ duration: 0.3 }}
				className="text-2xl font-medium text-foreground mb-8"
			>
				FAQ
			</motion.h2>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 items-start">
				<motion.div
					initial={{ opacity: 0, y: 15 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-50px" }}
					transition={{ duration: 0.3, delay: 0.05 }}
				>
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
				</motion.div>
				<motion.div
					initial={{ opacity: 0, y: 15 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true, margin: "-50px" }}
					transition={{ duration: 0.3, delay: 0.1 }}
				>
					<Accordion
						type="single"
						collapsible
						value={openItem}
						onValueChange={setOpenItem}
						className="w-full"
					>
						{rightFaqs.map((faq, index) => (
							<AccordionItem key={index + half} value={`item-${index + half}`}>
								<AccordionTrigger>{faq.question}</AccordionTrigger>
								<AccordionContent>{faq.answer}</AccordionContent>
							</AccordionItem>
						))}
					</Accordion>
				</motion.div>
			</div>
		</section>
	);
}

function App() {
	return (
		<div className="relative z-10">
			<Navbar />

			<main className="min-h-[calc(100dvh-112px)] flex items-center justify-center px-6 md:px-12 mb-10">
				<div className="max-w-2xl text-center">
					<motion.h1
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut" }}
						className="text-4xl md:text-5xl font-serif italic text-white leading-tight mb-6"
					>
						A summer home for ambitious interns in NYC.
					</motion.h1>
					<motion.p
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
						className="text-lg text-muted-foreground leading-relaxed mb-8"
					>
						We are bringing together 12 residents for a summer of living,
						exploring, and building in the heart of New York City. We have 5
						spots left, apply now!
					</motion.p>
					<motion.div
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
						className="flex items-center justify-center gap-4 mb-12"
					>
						<Button
							size="lg"
							className="bg-white text-black hover:bg-white/90 h-12 px-8 text-base"
							onClick={() =>
								window.open(
									"https://docs.google.com/forms/d/e/1FAIpQLSfNAkbsg63FeITIly22gKZf155IrA9UUbXNNH48dR3hEpdD9A/viewform",
									"_blank",
								)
							}
						>
							JOIN US
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="h-12 px-8 text-base"
							asChild
						>
							<Link to="/about" className="no-underline ">
								ABOUT
							</Link>
						</Button>
					</motion.div>

					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.3, delay: 0.2 }}
						className="flex flex-wrap items-center justify-center gap-8 md:gap-10 mt-24"
					>
						{COMPANIES.map((company, index) => (
							<motion.a
								key={company.name}
								href={company.url}
								target="_blank"
								rel="noopener noreferrer"
								initial={{ opacity: 0, y: 8 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.3, delay: 0.25 + index * 0.03 }}
								className={`${company.invert ? "invert" : ""} ${"white" in company && company.white ? "brightness-0 invert" : ""} group`}
							>
								<img
									src={company.logo}
									alt={company.name}
									loading="eager"
									className="h-6 md:h-7 w-auto object-contain opacity-100 group-hover:opacity-70 transition-opacity duration-150"
								/>
							</motion.a>
						))}
					</motion.div>
				</div>
			</main>

			<FAQSection />

			<Gallery />

			<footer className="relative flex flex-col overflow-hidden border-t border-border">
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
					<div
						className="absolute inset-0 opacity-30"
						style={{
							backgroundImage: "url(/grain.avif)",
							backgroundSize: "200px",
						}}
					/>
				</div>

				<div className="relative z-10 flex flex-col flex-1">
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
								href="https://www.linkedin.com/company/the-chelsea-commons/"
								target="_blank"
								rel="noopener noreferrer"
								className="hover:text-foreground transition-colors"
							>
								LinkedIn
							</a>
						</div>
					</div>

					<div className="flex flex-col justify-center py-12">
						<FitText className="font-serif text-8xl tracking-tight text-white opacity-75 leading-none select-none">
							CHELSEA
						</FitText>
						<FitText className="font-serif text-8xl tracking-tight text-white opacity-75 leading-none select-none">
							COMMONS
						</FitText>
					</div>

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
