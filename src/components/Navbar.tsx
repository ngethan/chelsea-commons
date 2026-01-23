import { Link } from "@tanstack/react-router";

export function Navbar() {
	return (
		<nav className="w-full px-6 md:px-12 py-6 flex items-center justify-between">
			<div className="text-foreground font-medium">
				{/* Logo or site name can go here */}
			</div>
			<div className="flex items-center gap-4">
				<button
					type="button"
					className="px-4 py-2 text-sm bg-white text-black rounded-md hover:bg-white/90 transition-colors font-medium"
				>
					JOIN US
				</button>
				<Link
					to="/events"
					className="px-4 py-2 text-sm border border-foreground text-foreground rounded-md hover:bg-foreground/10 transition-colors"
				>
					EVENTS
				</Link>
				<a
					href="mailto:hey@example.com"
					className="px-4 py-2 text-sm border border-foreground text-foreground rounded-md hover:bg-foreground/10 transition-colors"
				>
					CONTACT US
				</a>
			</div>
		</nav>
	);
}
