import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../components/ui/dialog";
import { buildSeoTags } from "../site-config";

export const Route = createFileRoute("/about")({
	head: () => {
		const seo = buildSeoTags({
			title: "About - Chelsea Commons",
			description:
				"Learn more about why we're building Chelsea Commons and meet our first summer cohort: ambitious builders, operators, and founders at companies like Ramp, JPMorgan, and BlackRock.",
			path: "/about",
		});
		return {
			title: seo.title,
			meta: seo.meta,
			links: seo.links,
		};
	},
	component: About,
});

type Person = {
	name: string;
	company: string;
	prevCompany?: string;
	bio: string;
	linkedin: string;
	image: string | null;
};

function PersonCard({ person }: { person: Person }) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="text-left group cursor-pointer w-full"
			>
				<div className="aspect-square bg-muted mb-4 flex items-center justify-center overflow-hidden">
					{person.image ? (
						<img
							src={person.image}
							alt={person.name}
							loading="lazy"
							className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
						/>
					) : (
						<span />
					)}
				</div>
				<p className="text-foreground font-medium">{person.name}</p>
				<p className="text-muted-foreground text-sm">{person.company}</p>
			</button>

			<DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="text-xl">{person.name}</DialogTitle>
					<DialogDescription>
						{person.prevCompany
							? `${person.company} · Prev ${person.prevCompany}`
							: person.company}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
						{person.image ? (
							<img
								src={person.image}
								alt={person.name}
								loading="lazy"
								className="w-full h-full object-cover"
							/>
						) : (
							<span />
						)}
					</div>

					<div className="space-y-3">
						<p className="text-foreground text-lg leading-relaxed whitespace-pre-line">
							{person.bio}
						</p>
						<a
							href={person.linkedin}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-block text-sm text-foreground underline hover:text-muted-foreground transition-colors"
						>
							LinkedIn →
						</a>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

const PEOPLE: Person[] = [
	{
		name: "Chirag Ohri",
		company: "JPMorgan Chase",
		bio: `I'm a junior studying Economics at the University of Southern California. This summer, I'll be interning at J.P. Morgan within their Commercial & Investment Banking Division.

Academically, I'm involved in research and recently published a clean energy paper in Energy Economics. I also have experience in policy and advocacy, having served as a Student Assembly Delegate where I represented student concerns at various conferences. I've previously interned with startups, and I'm deeply interested in building a company of my own in the future.

Outside of work, I love playing and watching sports - especially soccer (Hala Madrid), basketball, and tennis. I also enjoy playing a few hands of poker every now and then. Okay, I swear it's not gambling. Just probability and game theory.`,
		linkedin: "https://www.linkedin.com/in/chiragohri07/",
		image: "/assets/residents/ChiragOhri.webp",
	},
	{
		name: "Daniel Sung",
		company: "JPMorgan Chase",
		bio: `I'm a student at Vanderbilt University studying Human and Organizational Development as a Peabody Honors Scholar. This summer, I'll be a Marketing Learning Development Program Analyst at JPMorgan!

In the past, I've been the youngest NBA intern in league history, managed Vanderbilt men's basketball team, and been featured in Fortune magazine twice for my work in sports and entrepreneurship.

When I'm not working, you'll find me hooping, playing pickleball, or hitting the slopes snowboarding.`,
		linkedin: "https://www.linkedin.com/in/danielhsung/",
		image: "/assets/residents/DanielSung.webp",
	},
	{
		name: "Devin Fitzpatrick",
		company: "CLEAR",
		bio: `I'm a sophomore at UC Berkeley studying Computer Science & Business Administration. This summer I'm working at CLEAR as a Software Engineering Intern.

I'm broadly interested in engineering and startups, with a more recent interest in ML research. I'm specifically drawn to applied machine learning and agentic systems. Last summer, I worked at a defense-tech startup that raised over $50 million, building ML tools for non-technical users.

In my free time, you'll find me running, lifting, snowboarding, playing spikeball and playing basketball with my friends.`,
		linkedin: "",
		image: "/assets/residents/DevinFitzpatrick.webp",
	},
	{
		name: "Ethan Ng",
		company: "Ramp",
		bio: `I'm currently a junior at WashU studying CS and Finance. This summer, I'll be a SWE at Ramp and an 8VC fellow.

I previously cofounded an EdTech now company serving 10,000+ students and was employee #1 at a startup that raised $X,000,000 to build a consumer app for relationships.

In my free time, I love to play tennis, play piano, and do photography! Also super interested in cars and have a 2004 350Z.`,
		linkedin: "https://www.linkedin.com/in/ethan--ng/",
		image: "/assets/residents/EthanNg.webp",
	},
	{
		name: "Jackson Dietz",
		company: "BlackRock",
		bio: `I'm a junior at Emory double-majoring in Computer Science and Business. This summer, I'll be joining BlackRock Aladdin as a Product Management Intern. Previously, I held a PM internship at Coca-Cola alongside a DS/ML role at a New York–based fintech, PEX.

I'm currently interning abroad in Rome at WorldLift, a global enterprise SEO and content-intelligence platform.

Outside of work, I play bass in the Emory University Symphony Orchestra and in a rock band on campus. My all-time top five artists: Radiohead, Led Zeppelin, King Gizzard & the Lizard Wizard, Dmitri Shostakovich, and Zohar Argov.`,
		linkedin: "https://www.linkedin.com/in/jackson-dietz-/",
		image: "/assets/residents/JacksonDietz-v3.webp",
	},
	{
		name: "Jorik Dammann",
		company: "Radial Equity Partners",
		bio: `I'm a Yale sophomore studying Economics & Mathematics and trying to score goals for the Men's Soccer team. This summer, I'll be a private equity intern at Radial Equity Partners.

Previously, I've interned at Q2 Software and Recursion Works. I'm also the founder and creator of RootOn, a high school sports app.

I dabble in competitive modular origami, am an avid fan of German rap, and strive to become a 10th-Dan tea master.`,
		linkedin: "https://www.linkedin.com/in/jorik-dammann/",
		image: "/assets/residents/JorikDammann.webp",
	},
	{
		name: "Nikhil Reddy",
		company: "Robinhood",
		bio: `I'm a Stanford sophomore studying Computer Science with interests in finance, product, and tech. This summer, I'll be working at Robinhood on the event contracts team.

Previously, I dug into growth-stage investing at FTV Capital on the enterprise software desk. I'm also completing a co-op this quarter at GDA Luma, a distressed and special situations fund.

Copying Will's formatting thunder - my favorite movie is Interstellar. My favorite artist is Drake. My favorite day is push day. Fun fact: I've lived in three Texas cities (Fort Worth, Keller, McAllen) & the word is that the Cowboys will win Super Bowl 61.`,
		linkedin: "https://www.linkedin.com/in/nk-reddy/",
		image: "/assets/residents/NikhilReddy.webp",
	},
	{
		name: "Robert Tezock",
		company: "Figma",
		bio: `I'm a Junior at The University of Texas at Austin studying Computer Science. I'll be joining Figma & Nvidia this coming Summer and Fall, both as a Software Engineering Intern.

Professionally, I'm largely interested in distributed systems & making applications scale. I've previously worked at small companies, large companies, and startups, and each experience has shaped my perspective on how to build applications that impact users globally.

Outside of work, you can either catch me playing basketball, watching anime (huge fan of Attack on Titan & One Piece), or dabbling around in something new- I always enjoy a new adventure :)`,
		linkedin: "https://www.linkedin.com/in/tezock/",
		image: "/assets/residents/RobertTezock-2.webp",
	},
	{
		name: "Sachin Sashti",
		company: "KPMG",
		bio: `I'm a senior at Penn State studying Finance, Accounting, and Philosophy. This summer, I'll be an M&A Consultant Intern at KPMG and I'm building a SaaS startup with a unicorn entrepreneur.

In the past, I've presented a policy proposal to EU delegates, was a Collegiate Debate National Finalist, and led the implementation of the first EVs into an F500 company's supply chain!

I love every type of game and hope to have a weekly resident game night :)`,
		linkedin: "https://www.linkedin.com/in/sachinsashti/",
		image: "/assets/residents/SachinSashti.webp",
	},
	{
		name: "Summit Kawakami",
		company: "Ramp",
		bio: `I'm a sophomore at Stanford studying EECS and Stats, and I'll be at Ramp this upcoming summer.

I've bounced between biomedical research, debate, and building embedded services for a satellite. Lately I've been getting more interested in startups, finance, and low-level systems.

As a Canadian I grew up skiing and playing hockey. Living in the Bay Area, it's more basketball and poker now. I try not to take anything too seriously, enjoy good conversations, and try to stay curious about everything in front of me.`,
		linkedin: "https://www.linkedin.com/in/sumkawa",
		image: "/assets/residents/SummitKawakami.webp",
	},
	{
		name: "Tres Frisard",
		company: "Vatic Labs",
		bio: `I'm a Harvard junior studying Computer Science and I am a part of Harvard Poker Club and Harvard First-Year Outdoor Program. This summer, I'll be a software engineer intern at Vatic Labs.

Previously, I've interned at Scale AI and Felicis. I'm also the founder and creator of Gnome, a semantic search app for all files.

I dabble in poker, One Piece, and catan.`,
		linkedin: "https://www.linkedin.com/in/tres-frisard-219214216/",
		image: "/assets/residents/TresFrisard.webp",
	},
	{
		name: "Will Burkhart",
		company: "Teamworthy Ventures",
		bio: `Hi! I'm Will. I'm an incoming transfer student at Stanford University.

This summer, I am working at Teamworthy Ventures in New York City and building a community for interns called Chelsea Commons.

I spent the past two years studying Math at Vanderbilt University and developing software to make it easier for researchers to get funding with Stanford's Technology Transfer for Defense office.

A Tale of Two Cities by Dickens is my favorite book. My favorite movie is La La Land. My favorite artist is Olivia Dean. My favorite day is chest day.

If you're in Palo Alto or NYC, let me know!`,
		linkedin: "https://www.linkedin.com/in/will-burkhart-4b525223a/",
		image: "/assets/residents/WillBurkhart.webp",
	},
];

function About() {
	const [showScrollHint, setShowScrollHint] = useState(true);
	const peopleRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const peopleSection = peopleRef.current;
		if (!peopleSection) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				setShowScrollHint(!entry.isIntersecting);
			},
			{ threshold: 0.1 },
		);

		observer.observe(peopleSection);
		return () => observer.disconnect();
	}, []);

	return (
		<div className="min-h-svh relative z-10">
			<Navbar />
			<main className="px-6 md:px-12">
				{/* Vision Section */}
				<section className="min-h-[50vh] md:h-[calc(100svh-110px)] flex flex-col justify-between relative">
					<div className="max-w-3xl py-12">
						<motion.p
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut" }}
							className="text-3xl md:text-5xl text-foreground leading-relaxed mb-8 font-serif italic"
						>
							One house. A new cohort every season.
						</motion.p>

						<motion.p
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
							className="text-xl md:text-3xl text-foreground leading-relaxed mb-8"
						>
							Each season, Chelsea Commons brings a new batch of ambitious
							builders, operators, and founders to live together in Chelsea and
							anchor a growing community across New York. Our first summer
							cohort includes Stanford AI researchers, D1 athletes, and the
							NBA's youngest ever intern, at companies like Ramp, JPMorgan, and
							BlackRock.
						</motion.p>

						<motion.p
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
							className="text-xl md:text-3xl text-foreground leading-relaxed mb-8"
						>
							We're backed by a unicorn founder and a Warp executive. Sign up
							for our seasonal events and mixers.
						</motion.p>

						<motion.p
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
							className="text-xl md:text-3xl text-foreground leading-relaxed"
						>
							Reach us at{" "}
							<a
								href="mailto:hey@chelseacommons.co"
								className="underline hover:text-muted-foreground transition-colors"
							>
								hey@chelseacommons.co
							</a>
							.
						</motion.p>
					</div>
					<div className="flex flex-col gap-4">
						<div className="hidden md:flex items-end justify-end">
							<button
								type="button"
								onClick={() =>
									peopleRef.current?.scrollIntoView({ behavior: "smooth" })
								}
								className={`text-foreground flex items-center gap-2 tracking-widest uppercase transition-all duration-500 cursor-pointer hover:opacity-60 ${
									showScrollHint
										? "opacity-100"
										: "opacity-0 pointer-events-none"
								}`}
							>
								<span className="text-sm font-medium">Meet the team</span>
								<span className="text-lg">↓</span>
							</button>
						</div>
						<div className="border-t border-border" />
					</div>
				</section>

				{/* People Section */}
				<section ref={peopleRef} className="py-24">
					<motion.div
						initial={{ opacity: 0, y: 15 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-100px" }}
						transition={{ duration: 0.3 }}
						className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 mb-12"
					>
						<h2 className="text-2xl font-medium text-foreground">
							The Residents
						</h2>
					</motion.div>
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
						{PEOPLE.map((person, index) => (
							<motion.div
								key={person.name}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: "-50px" }}
								transition={{ duration: 0.3, delay: index * 0.05 }}
							>
								<PersonCard person={person} />
							</motion.div>
						))}
					</div>
				</section>
			</main>

			<Footer />
		</div>
	);
}
