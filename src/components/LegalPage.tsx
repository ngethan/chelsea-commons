import type * as React from "react";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

/**
 * The frame for the privacy policy and the terms: one column of prose at
 * reading width, a title, the date it took effect, then sections. Plain on
 * purpose. These pages exist to be accurate and findable, not to be read
 * for pleasure.
 */
export function LegalPage({
	title,
	effective,
	children,
}: {
	title: string;
	effective: string;
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-screen flex flex-col">
			<Navbar />
			{/* The same column as a writing post: centred, reading width. */}
			<main className="flex-1">
				<article className="mx-auto max-w-2xl px-6 py-12 md:py-24">
					<header className="mb-10 border-b border-border pb-8">
						<h1 className="text-2xl font-medium text-foreground">{title}</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Effective {effective}
						</p>
					</header>
					<div className="flex flex-col gap-10 text-foreground leading-relaxed [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-muted-foreground [&_a]:transition-colors">
						{children}
					</div>
				</article>
			</main>
			<Footer />
		</div>
	);
}

export function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-3">
			<h2 className="text-lg font-medium">{title}</h2>
			{children}
		</section>
	);
}

/** A short list inside a section. */
export function Items({ children }: { children: React.ReactNode }) {
	return <ul className="list-disc pl-5 flex flex-col gap-1.5">{children}</ul>;
}
