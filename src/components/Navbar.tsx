import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shadow } from "./shadow";
import { Button } from "./ui/button";

export function Navbar() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<nav className="sticky top-0 z-50 w-full" style={{ clipPath: "inset(0)" }}>
			<div className="absolute inset-0 pointer-events-none" style={{ position: "fixed", inset: 0, backgroundColor: "#212121" }}>
				<Shadow
					color="rgba(128, 128, 128, 0.3)"
					animation={{ scale: 50, speed: 80 }}
					noise={{ opacity: 1, scale: 1.5 }}
					sizing="fill"
				/>
			</div>
			<div className="relative px-6 md:px-12 py-6 flex items-center justify-between">
			<Link to="/" className="text-foreground font-medium text-xl">
				CC
			</Link>

			{/* Desktop menu */}
			<div className="hidden md:flex items-center gap-3">
				<Button
					className="bg-white text-black hover:bg-white/90"
					onClick={() => window.open("https://docs.google.com/forms/d/e/1FAIpQLSfNAkbsg63FeITIly22gKZf155IrA9UUbXNNH48dR3hEpdD9A/viewform", "_blank")}
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

			{/* Mobile hamburger button */}
			<button
				type="button"
				className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
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

			{/* Mobile menu */}
			{isOpen && (
				<div className="absolute top-full left-0 right-0 bg-background border-b border-border p-6 flex flex-col gap-3 md:hidden z-50">
					<Button
						className="bg-white text-black hover:bg-white/90 w-full"
						onClick={() => {
							window.open("https://docs.google.com/forms/d/e/1FAIpQLSfNAkbsg63FeITIly22gKZf155IrA9UUbXNNH48dR3hEpdD9A/viewform", "_blank");
							setIsOpen(false);
						}}
					>
						JOIN US
					</Button>
					<Button variant="outline" asChild className="w-full">
						<Link to="/about" onClick={() => setIsOpen(false)}>ABOUT</Link>
					</Button>
					<Button variant="outline" asChild className="w-full">
						<Link to="/events" onClick={() => setIsOpen(false)}>EVENTS</Link>
					</Button>
				</div>
			)}
			</div>
		</nav>
	);
}
