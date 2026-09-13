import { cn } from "@/lib/utils";

/**
 * A grey shape where something is about to be. Rounded by default, because
 * what it usually stands in for is a line of text or a heading, and a
 * bar with square corners reads as a field or a button that has not
 * loaded rather than as words. A face passes `rounded-full`; the checkbox
 * skeleton in `RowsSkeleton` draws its own box with the checkbox's radius.
 */
function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("animate-pulse rounded bg-secondary", className)}
			{...props}
		/>
	);
}

export { Skeleton };
