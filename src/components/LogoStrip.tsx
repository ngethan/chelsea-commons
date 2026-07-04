import { ScrollVelocityRow } from "./ui/scroll-based-velocity";

const COMPANIES = [
	{
		name: "Y Combinator",
		logo: "/assets/brands/yc-logo.svg",
		url: "https://ycombinator.com",
	},
	{
		name: "8VC",
		logo: "/assets/brands/8vc-logo.png",
		url: "https://8vc.com",
	},
	{
		name: "BlackRock",
		logo: "/assets/brands/blackrock-logo.png",
		url: "https://blackrock.com",
	},
	{
		name: "JPMorgan Chase",
		logo: "/assets/brands/jpmc-logo.png",
		url: "https://jpmorgan.com",
	},
	{
		name: "Ramp",
		logo: "/assets/brands/ramp-logo.png",
		url: "https://ramp.com",
	},
	{
		name: "Warp",
		logo: "/assets/brands/warp-logo.png",
		url: "https://www.joinwarp.com",
	},
	{
		name: "Scale AI",
		logo: "/assets/brands/scale-logo.webp",
		url: "https://scale.com",
	},
	{
		name: "Robinhood",
		logo: "/assets/brands/robinhood-logo.svg",
		url: "https://robinhood.com",
	},
	{
		name: "Figma",
		logo: "/assets/brands/figma-logo.png",
		url: "https://figma.com",
	},
	{
		name: "Nvidia",
		logo: "/assets/brands/nvidia-logo.png",
		url: "https://nvidia.com",
	},
	{
		name: "Teamworthy Ventures",
		logo: "/assets/brands/teamworthy-logo.png",
		url: "https://www.teamworthy.com",
	},
];

export function LogoStrip() {
	return (
		<section className="border-t border-border py-12 md:py-16">
			<p className="text-xs uppercase tracking-widest text-muted-foreground mb-8 px-6 md:px-12">
				Our members work at
			</p>
			<ScrollVelocityRow baseVelocity={3} direction={-1} lockDirection>
				{COMPANIES.map((company) => (
					<a
						key={company.name}
						href={company.url}
						target="_blank"
						rel="noopener noreferrer"
						className="group mx-6 md:mx-8 inline-flex items-center"
					>
						<img
							src={company.logo}
							alt={company.name}
							loading="lazy"
							decoding="async"
							className="h-6 md:h-7 w-auto object-contain grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition duration-200"
						/>
					</a>
				))}
			</ScrollVelocityRow>
		</section>
	);
}
