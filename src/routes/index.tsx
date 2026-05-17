import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import { Gallery } from "../components/gallery";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "../components/ui/accordion";
import { Button } from "../components/ui/button";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/")({
	head: () => {
		const seo = buildSeoTags({
			title: "THE CHELSEA COMMONS",
			description:
				"A community of 12 ambitious interns living, exploring, and building together in Chelsea, Manhattan",
			path: "/",
		});
		return {
			title: seo.title,
			meta: seo.meta,
			links: seo.links,
		};
	},
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
		name: "Scale AI",
		logo: "/assets/brands/scale-logo.webp",
		invert: false,
		url: "https://scale.com",
	},
	{
		name: "Robinhood",
		logo: "/assets/brands/robinhood-logo.svg",
		invert: true,
		url: "https://robinhood.com",
	},
	{
		name: "Figma",
		logo: "/assets/brands/figma-logo.png",
		invert: false,
		url: "https://figma.com",
	},
	{
		name: "Nvidia",
		logo: "/assets/brands/nvidia-logo.png",
		invert: false,
		url: "https://nvidia.com",
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
		question: "Who are the residents?",
		answer:
			"Interns interested in entrepreneurship, exploration, and growth. We brought together a diverse mix of backgrounds and interests - from Stanford AI researchers to D1 athletes to the NBA's youngest ever intern.",
	},
	{
		question: "Is this a hacker house?",
		answer:
			"Not in the intense, mandatory-events way. There is no mandatory building or networking. That said, the goal is to connect with each resident, hanging out on weekends while leveraging strengths to build something special.",
	},
	{
		question: "How were residents chosen?",
		answer:
			"We looked for people who are scrappy, take initiative, and genuinely add to the house dynamic. People who think creatively and reach out to make things happen.",
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
			"Yes. We're throwing intern mixers and events throughout the summer. Check our events page to sign up.",
	},
];

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
						className="text-3xl md:text-5xl font-serif italic text-white leading-tight mb-5"
					>
						A summer community for ambitious interns in NYC.
					</motion.h1>
					<motion.p
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
						className="text-base md:text-lg text-muted-foreground leading-relaxed mb-6"
					>
						Built by 12 interns living together in Manhattan. If you're a
						founder, builder, or someone driven to grow alongside amazing
						people—you belong here.
					</motion.p>
					<motion.div
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
						className="flex items-center justify-center gap-3 mb-10"
					>
						<Button
							size="lg"
							className="bg-white text-black hover:bg-white/90 h-10 md:h-12 px-6 md:px-8 text-sm md:text-base"
							asChild
						>
							<Link to="/events" className="no-underline">
								SIGN UP FOR EVENTS
							</Link>
						</Button>
						<Button
							size="lg"
							variant="outline"
							className="h-10 md:h-12 px-6 md:px-8 text-sm md:text-base"
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
						className="flex flex-wrap items-center justify-center gap-6 md:gap-10 mt-16 md:mt-24"
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
									className="h-5 md:h-7 w-auto object-contain opacity-100 group-hover:opacity-70 transition-opacity duration-150"
								/>
							</motion.a>
						))}
					</motion.div>
				</div>
			</main>

			<FAQSection />

			<Gallery />

			<Footer />
		</div>
	);
}
