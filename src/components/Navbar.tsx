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
					<div
						className="absolute overflow-hidden"
						style={
							{
								top: "-100px",
								right: "-100px",
								width: "800px",
								height: "600px",
								"--aurora":
									"repeating-linear-gradient(100deg, #2d1f3d 10%, #4a1942 15%, #c94c4c 20%, #f4a261 25%, #e76f51 30%, #8b5cf6 35%)",
								maskImage:
									"radial-gradient(ellipse at top right, black 0%, transparent 70%)",
								WebkitMaskImage:
									"radial-gradient(ellipse at top right, black 0%, transparent 70%)",
							} as React.CSSProperties
						}
					>
						<div
							className="after:animate-aurora pointer-events-none absolute -inset-[10px] opacity-100 blur-[30px] will-change-transform after:absolute after:inset-0 after:mix-blend-difference after:content-['']"
							style={{
								backgroundImage: "var(--aurora)",
								backgroundSize: "200%, 400%",
								backgroundPosition: "50% 50%",
							}}
						/>
					</div>
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
					</div>
				</div>
			)}
		</div>
	);
}
