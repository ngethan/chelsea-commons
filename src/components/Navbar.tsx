import { Link } from "@tanstack/react-router";
import { Button } from "./ui/button";

export function Navbar() {
	return (
		<nav className="w-full px-6 md:px-12 py-6 flex items-center justify-between">
			<div className="text-foreground font-medium">
				{/* Logo or site name can go here */}
			</div>
			<div className="flex items-center gap-3">
				<Button className="bg-white text-black hover:bg-white/90">
					JOIN US
				</Button>
				<Button variant="outline" asChild>
					<Link to="/events">EVENTS</Link>
				</Button>
				<Button variant="outline" asChild>
					<a href="mailto:hey@example.com">CONTACT US</a>
				</Button>
			</div>
		</nav>
	);
}
