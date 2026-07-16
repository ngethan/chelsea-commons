import { Link, createFileRoute } from "@tanstack/react-router";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { EventPhotos } from "../components/EventPhotos";
import { Footer } from "../components/Footer";
import { LogoStrip } from "../components/LogoStrip";
import { Navbar } from "../components/Navbar";
import { PartnersStrip } from "../components/PartnersStrip";
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

/** The hero asterisk: spins with scroll velocity and coasts to a stop. */
function ScrollSpinGlyph() {
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

		gsap.registerPlugin(ScrollTrigger);

		let rotation = 0;
		let spin = 0; // deg/sec, fed by scroll velocity

		const trigger = ScrollTrigger.create({
			onUpdate: (self) => {
				// px/sec -> deg/sec; fast flicks read as a full whirl
				spin = gsap.utils.clamp(-1440, 1440, self.getVelocity() * 0.35);
			},
		});

		const tick = (_time: number, deltaTime: number) => {
			const dt = deltaTime / 1000;
			rotation = (rotation + spin * dt) % 360;
			spin *= Math.exp(-2.5 * dt); // friction: coast down after scrolling stops
			el.style.transform = `rotate(${rotation}deg)`;
		};
		gsap.ticker.add(tick);

		return () => {
			trigger.kill();
			gsap.ticker.remove(tick);
		};
	}, []);

	return (
		<span
			ref={ref}
			aria-hidden="true"
			className="inline-block text-[0.6em] align-super will-change-transform"
		>
			{"✳︎"}
		</span>
	);
}

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

			<main>
				{/* Full-viewport hero (minus the sticky navbar's height): the halftone
				    image is the backdrop, headline copy sits on top of it, and the
				    logo marquee flows along its bottom edge. */}
				<section className="relative flex flex-col h-[calc(var(--stable-vh,100svh)-5.75rem)] md:h-[calc(var(--stable-vh,100svh)-5.25rem)] min-h-[34rem] overflow-hidden">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.6, ease: "easeOut" }}
						className="absolute inset-0"
					>
						<HalftoneHeroImage
							image="/assets/creation-of-adam.jpg"
							alt="The hands of Adam and God reaching toward each other, after Michelangelo — rendered in halftone"
							aspectClassName="h-full"
						/>
						{/* Scrims: keep the headline and logo strip legible over the image.
						    Below lg the copy stacks and reaches much further down, so the
						    top scrim is taller and denser there. */}
						<div className="absolute inset-x-0 top-0 h-3/4 lg:h-1/2 bg-gradient-to-b from-background via-background/85 to-transparent lg:via-background/70 pointer-events-none" />
						<div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
					</motion.div>

					<div className="relative z-10 px-6 md:px-12 pt-10 md:pt-16">
						<div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-start">
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
								<ScrollSpinGlyph />
							</motion.h1>
							<div className="lg:col-span-4 lg:justify-self-end lg:max-w-md flex flex-col gap-5">
								<motion.p
									initial={{ opacity: 0, y: 15 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
									className="text-lg md:text-xl text-foreground/90 leading-relaxed text-pretty"
								>
									A community of young, ambitious builders, operators, and
									founders in New York, born out of a house in Chelsea. We host
									dinners, mixers, and events across the city.
								</motion.p>
								<motion.p
									initial={{ opacity: 0, y: 15 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
									className="text-base md:text-lg text-foreground/90 leading-relaxed"
								>
									Want to come to an event? Fill out our{" "}
									<Link
										to="/rsvp"
										target="_blank"
										rel="noopener noreferrer"
										className="link-static text-foreground underline underline-offset-4 decoration-1"
									>
										interest form
									</Link>
									!
								</motion.p>
							</div>
						</div>
					</div>

					<motion.div
						initial={{ opacity: 0, y: 15 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ duration: 0.4, ease: "easeOut", delay: 0.25 }}
						className="relative z-10 mt-auto"
					>
						<PartnersStrip overlay />
					</motion.div>
				</section>
			</main>

			<EventPhotos />

			<LogoStrip />

			<FAQSection />

			<Footer />
		</div>
	);
}
