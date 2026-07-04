import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export function Navbar() {
	const [isOpen, setIsOpen] = useState(false);

	useEffect(() => {
		if (!isOpen) return;
		document.body.style.overflow = "hidden";
		const onKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setIsOpen(false);
		};
		window.addEventListener("keydown", onKeyDown);
		return () => {
			document.body.style.overflow = "";
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [isOpen]);

	return (
		<div className="sticky top-0 z-(--z-nav) w-full">
			<nav className="w-full relative z-(--z-nav) bg-background">
				<div className="px-6 md:px-12 py-6 flex items-center justify-between">
					<Link to="/" className="text-foreground font-medium text-xl font-serif">
						<span className="md:hidden">XII</span>
						<span className="hidden italic md:inline">CHELSEA COMMONS</span>
					</Link>

					<div className="hidden md:flex items-center gap-3">
						<Button
							className="bg-foreground text-background hover:bg-foreground/90"
							asChild
						>
							<Link to="/rsvp" target="_blank" rel="noopener noreferrer">
								RSVP
							</Link>
						</Button>
						<Button variant="outline" asChild>
							<Link to="/about">ABOUT</Link>
						</Button>
						<Button variant="outline" asChild>
							<Link to="/events">EVENTS</Link>
						</Button>
					</div>

					<button
						type="button"
						className="md:hidden flex flex-col justify-center items-center w-11 h-11 -mr-1.5 gap-1.5 z-(--z-nav) relative"
						onClick={() => setIsOpen(!isOpen)}
						aria-label="Toggle menu"
						aria-expanded={isOpen}
						aria-controls="mobile-menu"
					>
						<span
							className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
								isOpen ? "rotate-45 translate-y-2" : ""
							}`}
						/>
						<span
							className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
								isOpen ? "opacity-0" : ""
							}`}
						/>
						<span
							className={`block w-6 h-0.5 bg-foreground transition-all duration-300 ${
								isOpen ? "-rotate-45 -translate-y-2" : ""
							}`}
						/>
					</button>
				</div>
			</nav>

			{isOpen && (
				<div
					id="mobile-menu"
					className="fixed inset-0 z-(--z-nav-overlay) flex flex-col pt-20 md:hidden"
				>
					<div className="absolute inset-0 bg-background" />
					<div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8">
						<Link
							to="/"
							onClick={() => setIsOpen(false)}
							className="text-4xl font-medium text-foreground hover:text-muted-foreground transition-colors"
						>
							HOME
						</Link>
						<Link
							to="/rsvp"
							target="_blank"
							rel="noopener noreferrer"
							onClick={() => setIsOpen(false)}
							className="text-4xl font-medium text-foreground hover:text-muted-foreground transition-colors"
						>
							RSVP
						</Link>
						<Link
							to="/about"
							onClick={() => setIsOpen(false)}
							className="text-4xl font-medium text-foreground hover:text-muted-foreground transition-colors"
						>
							ABOUT
						</Link>
						<Link
							to="/events"
							onClick={() => setIsOpen(false)}
							className="text-4xl font-medium text-foreground hover:text-muted-foreground transition-colors"
						>
							EVENTS
						</Link>
					</div>
				</div>
			)}
		</div>
	);
}
