import { ScrollVelocityRow } from "./ui/scroll-based-velocity";

const PARTNERS = [
	{
		name: "a16z",
		logo: "/assets/partners/a16z-logo.webp",
		url: "https://a16z.com",
	},
	{
		name: "Amazon",
		logo: "/assets/partners/amazon-logo.png",
		url: "https://amazon.com",
	},
	{
		name: "BoxGroup",
		logo: "/assets/partners/boxgroup-logo.png",
		url: "https://boxgroup.com",
	},
	{
		name: "Cursor",
		logo: "/assets/partners/cursor-logo.webp",
		url: "https://cursor.com",
	},
	{
		name: "Felicis",
		logo: "/assets/partners/felicis-logo.png",
		url: "https://felicis.com",
	},
	{
		name: "Harvey AI",
		logo: "/assets/partners/harvey-logo.png",
		url: "https://harvey.ai",
	},
	{
		name: "First Round Capital",
		logo: "/assets/partners/firstround-logo.webp",
		url: "https://firstround.com",
	},
	{
		name: "General Catalyst",
		logo: "/assets/partners/generalcatalyst-logo.png",
		url: "https://generalcatalyst.com",
	},
	{
		name: "Lerer Hippeau",
		logo: "/assets/partners/lererhippeau-logo.png",
		url: "https://lererhippeau.com",
	},
	{
		name: "M13",
		logo: "/assets/partners/m13-logo.png",
		url: "https://m13.co",
	},
	{
		name: "Menlo Ventures",
		logo: "/assets/partners/menloventures-logo.png",
		url: "https://menlovc.com",
	},
	{
		name: "Mercury",
		logo: "/assets/partners/mercury-logo.webp",
		url: "https://mercury.com",
	},
	{
		name: "OpenAI",
		logo: "/assets/partners/openai-logo.webp",
		url: "https://openai.com",
	},
	{
		name: "Pareto Holdings",
		logo: "/assets/partners/pareto-logo.png",
		url: "https://pareto20.com",
	},
	{
		name: "Ramp",
		logo: "/assets/partners/ramp-logo.png",
		url: "https://ramp.com",
	},
	{
		name: "Rho",
		logo: "/assets/partners/rho-logo.webp",
		url: "https://rho.co",
	},
	{
		name: "TQ Ventures",
		logo: "/assets/partners/tqventures-logo.png",
		url: "https://tqventures.com",
	},
	{
		name: "Z Fellows",
		logo: "/assets/partners/zfellows-logo.png",
		url: "https://zfellows.com",
	},
];

export function PartnersStrip({
	label = "In partnership with",
	overlay = false,
}: {
	label?: string;
	overlay?: boolean;
}) {
	return (
		<section
			className={
				overlay ? "py-6 md:py-8" : "border-t border-border py-12 md:py-16"
			}
		>
			<p
				className={`text-xs uppercase tracking-widest text-muted-foreground px-6 md:px-12 ${
					overlay ? "mb-5" : "mb-8"
				}`}
			>
				{label}
			</p>
			<ScrollVelocityRow
				baseVelocity={3}
				direction={-1}
				lockDirection
				className="[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
			>
				{PARTNERS.map((partner) => (
					<a
						key={partner.name}
						href={partner.url}
						target="_blank"
						rel="noopener noreferrer"
						className="group mx-6 md:mx-8 inline-flex items-center"
					>
						<img
							src={partner.logo}
							alt={partner.name}
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
