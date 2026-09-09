import { cn } from "@/lib/utils";
import type * as React from "react";

/**
 * The rail is drawn by the items rather than by the container: each row owns
 * the segment of line above its own marker, so the line stops exactly at the
 * last marker instead of running past it.
 */
export function Timeline({ className, children }: React.ComponentProps<"ol">) {
	return <ol className={cn("relative", className)}>{children}</ol>;
}

export function TimelineItem({
	title,
	at,
	muted,
	last,
	children,
}: {
	title: React.ReactNode;
	at?: string;
	/** Dimmed rather than hidden: a scanner's hit is evidence, not a click. */
	muted?: boolean;
	last?: boolean;
	children?: React.ReactNode;
}) {
	return (
		<li
			className={cn(
				"relative flex gap-3 pb-4 last:pb-0",
				muted && "opacity-55",
			)}
		>
			<div className="relative flex w-3 shrink-0 justify-center pt-[6px]">
				<span
					className={cn(
						"size-[7px] rounded-full",
						muted ? "bg-border" : "bg-foreground",
					)}
				/>
				{!last && (
					<span className="absolute top-[15px] bottom-[-16px] w-px bg-border" />
				)}
			</div>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<span className="text-[13px]">{title}</span>
					{at && (
						<span className="font-mono text-[11px] text-muted-foreground tabular-nums">
							{at}
						</span>
					)}
				</div>
				{children && (
					<div className="mt-0.5 text-[12.5px] text-muted-foreground">
						{children}
					</div>
				)}
			</div>
		</li>
	);
}
