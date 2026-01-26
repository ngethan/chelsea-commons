import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const IMAGES = [
	{
		src: "/assets/space/building.jpg",
		alt: "Building Exterior",
		className: "col-span-2 row-span-2 md:col-span-2 md:row-span-2",
	},
	{
		src: "/assets/space/room-1.jpg",
		alt: "Bedroom 1",
		className: "col-span-1 md:col-span-2 md:row-span-1",
	},
	{
		src: "/assets/space/room-kitchen-2.jpg",
		alt: "Kitchen",
		className: "col-span-1 md:col-span-2 md:row-span-1",
	},
	{
		src: "/assets/space/rooftop.jpg",
		alt: "Rooftop",
		className: "col-span-2 row-span-2 md:col-span-2 md:row-span-2",
	},
	{
		src: "/assets/space/room-2.jpg",
		alt: "Bedroom 2",
		className: "col-span-1 md:col-span-1 md:row-span-1",
	},
	{
		src: "/assets/space/gym.jpg",
		alt: "Gym",
		className: "col-span-1 md:col-span-1 md:row-span-1",
	},
	{
		src: "/assets/space/room-3.jpg",
		alt: "Bedroom 3",
		className: "col-span-2 md:col-span-2 md:row-span-1",
	},
];

export function Gallery() {
	const [selectedImage, setSelectedImage] = useState<(typeof IMAGES)[0] | null>(
		null,
	);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") setSelectedImage(null);
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	return (
		<section className="px-6 md:px-12 py-16" id="gallery">
			<div className="flex flex-col gap-4 mb-8">
				<h2 className="text-3xl font-serif italic">The Space</h2>
				<p className="text-muted-foreground max-w-xl">
					Explore the common areas, bedrooms, and amenities that make Chelsea
					Commons a unique place to live.
				</p>
			</div>

			<div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[160px] md:auto-rows-[240px]">
				{IMAGES.map((image, index) => (
					<motion.div
						key={index}
						onClick={() => setSelectedImage(image)}
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.4, delay: index * 0.05 }}
						className={cn(
							"relative rounded-lg overflow-hidden cursor-pointer group bg-muted",
							image.className,
						)}
					>
						<img
							src={image.src}
							alt={image.alt}
							className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
						/>
					</motion.div>
				))}
			</div>

			<AnimatePresence>
				{selectedImage && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={() => setSelectedImage(null)}
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 md:p-12"
					>
						<Button
							variant="ghost"
							size="icon"
							className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
							onClick={() => setSelectedImage(null)}
						>
							<X className="size-6" />
							<span className="sr-only">Close</span>
						</Button>

						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							transition={{ duration: 0.2 }}
							className="relative w-full h-full flex items-center justify-center p-8 md:p-20"
							onClick={() => setSelectedImage(null)}
						>
							{/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
							<img
								src={selectedImage.src}
								alt={selectedImage.alt}
								className="max-w-full max-h-full object-contain shadow-2xl"
								onClick={(e) => e.stopPropagation()}
							/>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}
