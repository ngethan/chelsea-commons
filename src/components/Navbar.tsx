import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shadow } from "./shadow";
import { Button } from "./ui/button";

export function Navbar() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className="sticky top-0 z-50 w-full">
			<nav className="w-full relative z-50" style={{ clipPath: "inset(0)" }}>
				<div
					className="absolute inset-0 pointer-events-none"
					style={{ position: "fixed", inset: 0, backgroundColor: "#212121" }}
				>
					<Shadow
						color="rgba(128, 128, 128, 0.3)"
						animation={{ scale: 50, speed: 80 }}
						noise={{ opacity: 1, scale: 1.5 }}
						sizing="fill"
					/>
				</div>
				<div className="relative px-6 md:px-12 py-6 flex items-center justify-between">
					<Link to="/" className="text-foreground font-bold text-xl font-serif">
						XII
					</Link>

					<div className="hidden md:flex items-center gap-3">
						<Button
							className="bg-white text-black hover:bg-white/90"
							onClick={() =>
								window.open(
									"https://docs.google.com/forms/d/e/1FAIpQLSfNAkbsg63FeITIly22gKZf155IrA9UUbXNNH48dR3hEpdD9A/viewform",
									"_blank",
								)
							}
						>
							JOIN US
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
						className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5 z-50 relative"
						onClick={() => setIsOpen(!isOpen)}
						aria-label="Toggle menu"
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
				<div className="fixed inset-0 z-40 flex flex-col pt-20 md:hidden">
					<div
						className="absolute inset-0"
						style={{ backgroundColor: "#212121" }}
					>
						<Shadow
							color="rgba(128, 128, 128, 0.3)"
							animation={{ scale: 50, speed: 80 }}
							noise={{ opacity: 1, scale: 1.5 }}
							sizing="fill"
						/>
					</div>
					<div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-8">
						<Link
							to="/"
							onClick={() => setIsOpen(false)}
							className="text-4xl font-medium text-foreground hover:text-muted-foreground transition-colors"
						>
							HOME
						</Link>
						<button
							type="button"
							onClick={() => {
								window.open(
									"https://docs.google.com/forms/d/e/1FAIpQLSfNAkbsg63FeITIly22gKZf155IrA9UUbXNNH48dR3hEpdD9A/viewform",
									"_blank",
								);
								setIsOpen(false);
							}}
							className="text-4xl font-medium text-foreground hover:text-muted-foreground transition-colors"
						>
							JOIN US
						</button>
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
