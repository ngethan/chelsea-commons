import { Link, createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { EventPhotos } from "../components/EventPhotos";
import { Footer } from "../components/Footer";
import { LogoStrip } from "../components/LogoStrip";
import { Navbar } from "../components/Navbar";
import { HalftoneHeroImage } from "../components/halftone-hero-image";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "../components/ui/accordion";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/")({
	head: () => {
		const seo = buildSeoTags({
			title: "Chelsea Commons",
			description:
				"A community of young, ambitious builders, operators, and founders in New York.",
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
			"Chelsea, Manhattan. The community grew out of a house at 300 W 20th Street, and most of our events happen nearby.",
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
			<h2 className="font-serif italic text-3xl md:text-4xl text-foreground mb-10">
				Common questions
			</h2>
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

function App() {
	return (
		<div className="relative z-10">
			<Navbar />

			<main className="px-6 md:px-12 pt-10 md:pt-16 pb-16">
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-end mb-8 md:mb-12">
					{/* Statement headline — brand name lives in the navbar; the hero
					    gets to say something. One consistent display size across lines. */}
					<motion.h1
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut" }}
						className="w-full min-w-0 lg:col-span-8 font-serif text-foreground text-[clamp(2.75rem,6.5vw,5.25rem)] leading-[1.05]"
					>
						Ambition
						<br />
						loves company
						<span aria-hidden="true" className="text-[0.6em] align-super">
							✳
						</span>
					</motion.h1>
					<div className="lg:col-span-4 lg:justify-self-end lg:max-w-md flex flex-col gap-5">
						<motion.p
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
							className="text-base md:text-lg text-muted-foreground leading-relaxed"
						>
							A community of young, ambitious builders, operators, and founders
							in New York, born out of a house in Chelsea. We host dinners,
							mixers, and events across the city.
						</motion.p>
						<motion.p
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
							className="text-base md:text-lg text-muted-foreground leading-relaxed"
						>
							Want to come to an event? Fill out our{" "}
							<Link
								to="/rsvp"
								target="_blank"
								rel="noopener noreferrer"
								className="text-foreground underline underline-offset-4 decoration-1 hover:text-muted-foreground transition-colors"
							>
								interest form
							</Link>
							!
						</motion.p>
					</div>
				</div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: "easeOut", delay: 0.2 }}
					className="relative"
				>
					<HalftoneHeroImage
						image="/assets/creation-of-adam.jpg"
						alt="The hands of Adam and God reaching toward each other, after Michelangelo — rendered in halftone"
					/>
				</motion.div>
			</main>

			<EventPhotos />

			<LogoStrip />

			<FAQSection />

			<Footer />
		</div>
	);
}
