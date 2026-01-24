import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";
import { cn } from "../lib/utils";

const IMAGES = [
	{
		src: "/assets/space/building.jpg",
		alt: "Building Exterior",
		title: "The Building",
		description: "Modern architecture in the heart of Chelsea",
	},
	{
		src: "/assets/space/entrance.jpg",
		alt: "Entrance",
		title: "Welcome Home",
		description: "Secure and inviting entrance",
	},
	{
		src: "/assets/space/room-1.jpg",
		alt: "Bedroom 1",
		title: "Private Spaces",
		description: "Furnished rooms with natural light",
	},
	{
		src: "/assets/space/room-kitchen-2.jpg",
		alt: "Kitchen",
		title: "Chef's Kitchen",
		description: "Fully equipped for community meals",
	},
	{
		src: "/assets/space/room-2.jpg",
		alt: "Bedroom 2",
		title: "Comfort & Style",
		description: "Designed for productivity and rest",
	},
	{
		src: "/assets/space/rooftop.jpg",
		alt: "Rooftop",
		title: "Rooftop Views",
		description: "Stunning views of the NYC skyline",
	},
	{
		src: "/assets/space/gym.jpg",
		alt: "Gym",
		title: "Fitness Center",
		description: "State-of-the-art equipment",
	},
	{
		src: "/assets/space/room-3.jpg",
		alt: "Bedroom 3",
		title: "Your Sanctuary",
		description: "A quiet place to focus",
	},
	{
		src: "/assets/space/surrounding.jpg",
		alt: "Neighborhood",
		title: "Chelsea Life",
		description: "Surrounded by art, food, and culture",
	},
];

export function Gallery() {
	const sectionRef = useRef<HTMLDivElement>(null);
	const triggerRef = useRef<HTMLDivElement>(null);
	const progressBarRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const ctx = gsap.context(() => {
			const totalWidth = sectionRef.current?.scrollWidth;
			const windowWidth = window.innerWidth;

			if (!totalWidth) return;

			const scrollTween = gsap.to(sectionRef.current, {
				x: () => -(totalWidth - windowWidth),
				ease: "none",
				scrollTrigger: {
					trigger: triggerRef.current,
					start: "top top",
					end: () => `+=${totalWidth}`,
					scrub: 0,
					pin: true,
					invalidateOnRefresh: true,
					anticipatePin: 1,
				},
			});

			const slides = gsap.utils.toArray<HTMLElement>(".gallery-slide");
			const indicators = gsap.utils.toArray<HTMLElement>(".scroll-fill");

			slides.forEach((slide, i) => {
				const img = slide.querySelector("img");
				if (!img) return;

				gsap.to(img, {
					filter: "grayscale(0%)",
					scale: 1.05,
					ease: "power2.out",
					scrollTrigger: {
						trigger: slide,
						containerAnimation: scrollTween,
						start: "center center+=25%",
						end: "center center-=25%",
						scrub: true,
						onEnter: () => {
							indicators.forEach((ind, idx) => {
								if (idx <= i) gsap.to(ind, { scaleX: 1, duration: 0.3 });
							});
						},
						onLeave: () => {
							gsap.to(indicators[i], { scaleX: 1, duration: 0.3 });
						},
						onEnterBack: () => {
							gsap.to(indicators[i], { scaleX: 1, duration: 0.3 });
							indicators.forEach((ind, idx) => {
								if (idx > i) gsap.to(ind, { scaleX: 0, duration: 0.3 });
							});
						},
						onLeaveBack: () => {
							gsap.to(indicators[i], { scaleX: 0, duration: 0.3 });
						},
					},
				});
			});
		}, triggerRef);

		return () => ctx.revert();
	}, []);

	return (
		<section className="overflow-hidden relative" ref={triggerRef}>
			{/* Custom Scrollbar */}
			<div
				ref={progressBarRef}
				className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[95%] h-0.5 z-20 flex gap-1"
			>
				{IMAGES.map((_, index) => (
					<div
						key={index}
						className="scroll-indicator h-full flex-1 bg-white/20 rounded-full overflow-hidden"
					>
						<div className="scroll-fill h-full w-full bg-white origin-left scale-x-0" />
					</div>
				))}
			</div>

			<div
				ref={sectionRef}
				className="flex h-screen items-center w-fit pl-8 md:pl-24 pr-8 md:pr-24"
			>
				{IMAGES.map((image, index) => (
					<div
						key={index}
						className={cn(
							"gallery-slide relative h-[60vh] md:h-[70vh] aspect-[16/9] flex-shrink-0 mx-4 md:mx-6 overflow-hidden rounded-sm group",
						)}
					>
						<img
							src={image.src}
							alt={image.alt}
							className="absolute inset-0 h-full w-full object-cover grayscale"
						/>
						<div className="absolute inset-0 bg-black/10 transition-colors duration-500" />
					</div>
				))}
			</div>
		</section>
	);
}
