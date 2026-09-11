import { Button } from "@/components/ui/button";
import {
	Command,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";

/**
 * A tag as it appears on a person: a pill, with a cross when it can come
 * off. The one place tags are drawn, so a tag looks the same in a field, a
 * table cell and a card.
 */
export function TagPill({
	name,
	onRemove,
	className,
}: {
	name: string;
	onRemove?: () => void;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"inline-flex h-6 shrink-0 items-center gap-0.5 rounded-full bg-secondary pl-2.5 text-[12px] text-foreground",
				onRemove ? "pr-0.5" : "pr-2.5",
				className,
			)}
		>
			<span className="truncate">{name}</span>
			{onRemove && (
				<Button
					variant="icon"
					size="icon-2xs"
					className="size-5"
					aria-label={`Remove ${name}`}
					onClick={(e) => {
						e.stopPropagation();
						onRemove();
					}}
				>
					<X className="size-3" />
				</Button>
			)}
		</span>
	);
}

/** How many pills the field shows before folding the rest into "+N". */
const SHOWN = 3;

/**
 * The tags field. Looks like every other floating-label field, holds pills
 * on one line (the first few, then "+N"), and opens a list of every tag
 * that exists with a check on the ones this person has. Typing narrows the
 * list; typing something that is not a tag offers to make it, so a new tag
 * is created where it is first needed and never in a settings screen
 * first. The field is a fixed height, so the grid never shifts.
 */
export function TagPicker({
	label = "Tags",
	value,
	onChange,
	className,
}: {
	label?: string;
	value: string[];
	onChange: (tags: string[]) => void;
	className?: string;
}) {
	const utils = trpc.useUtils();
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("");
	const tags = trpc.tags.list.useQuery(undefined, { enabled: open });

	const create = trpc.tags.create.useMutation({
		onSuccess: async (row) => {
			await utils.tags.list.invalidate();
			add(row.name);
			setText("");
		},
		onError: (err) => toast.error(err.message),
	});

	const has = (name: string) =>
		value.some((v) => v.toLowerCase() === name.toLowerCase());
	const add = (name: string) => {
		if (!has(name)) onChange([...value, name]);
	};
	const remove = (name: string) =>
		onChange(value.filter((v) => v.toLowerCase() !== name.toLowerCase()));
	const toggle = (name: string) => (has(name) ? remove(name) : add(name));

	const needle = text.trim().toLowerCase();
	const shown = (tags.data ?? []).filter(
		(t) => !needle || t.name.toLowerCase().includes(needle),
	);
	const exact = (tags.data ?? []).some((t) => t.name.toLowerCase() === needle);
	const floated = open || value.length > 0;

	return (
		<Popover
			open={open}
			onOpenChange={(next) => {
				setOpen(next);
				if (!next) setText("");
			}}
		>
			<PopoverTrigger asChild>
				{/* A div, not a button: the pills inside carry their own remove
				    buttons, and a button may not contain a button. It is still
				    focusable and opens on Enter or Space like one. */}
				{/* biome-ignore lint/a11y/useSemanticElements: see above; the nested remove buttons rule out a <button> here. */}
				<div
					role="button"
					tabIndex={0}
					aria-haspopup="listbox"
					aria-expanded={open}
					data-open={open}
					onKeyDown={(e) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							setOpen(true);
						}
					}}
					className={cn(
						"relative flex h-14 w-full min-w-0 cursor-pointer items-center gap-1.5 overflow-hidden rounded-none border border-input bg-card px-3.5 pt-5 pb-1.5 text-left outline-none transition-colors focus-visible:border-input-focus data-[open=true]:border-input-focus",
						className,
					)}
				>
					{value.slice(0, SHOWN).map((name) => (
						<TagPill key={name} name={name} onRemove={() => remove(name)} />
					))}
					{value.length > SHOWN && (
						<span className="inline-flex h-6 shrink-0 items-center rounded-full bg-secondary px-2.5 text-[12px] text-muted-foreground tabular-nums">
							+{value.length - SHOWN}
						</span>
					)}
					<span className={cn("fl-label", floated && "fl-up")}>{label}</span>
				</div>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
				<Command shouldFilter={false} loop>
					<CommandInput
						value={text}
						onValueChange={setText}
						placeholder="Find or create a tag"
						className="text-[13px]"
					/>
					<CommandList className="max-h-[260px]">
						{tags.isLoading && (
							<div className="py-6 text-center text-[13px] text-muted-foreground">
								Loading
							</div>
						)}
						{!tags.isLoading && shown.length === 0 && !needle && (
							<div className="py-6 text-center text-[13px] text-muted-foreground">
								No tags yet. Type one.
							</div>
						)}
						<CommandGroup>
							{needle && !exact && (
								<CommandItem
									value={`create:${needle}`}
									disabled={create.isPending}
									onSelect={() => create.mutate({ name: text.trim() })}
								>
									<Plus />
									<span className="truncate">Create “{text.trim()}”</span>
								</CommandItem>
							)}
							{shown.map((t) => (
								<CommandItem
									key={t.id}
									value={`tag:${t.id}`}
									onSelect={() => toggle(t.name)}
								>
									<Check
										className={cn(
											"size-3.5",
											has(t.name) ? "opacity-100" : "opacity-0",
										)}
									/>
									<span className="truncate">{t.name}</span>
									<span className="ml-auto pl-3 text-[11.5px] text-muted-foreground tabular-nums">
										{t.count}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

/**
 * The same list as a one-shot: pick a tag (or make one) and hand it back.
 * For the selection bar, where a tag goes onto many people at once.
 */
export function TagChooser({
	onPick,
	children,
}: {
	onPick: (name: string) => void;
	children: React.ReactElement;
}) {
	const utils = trpc.useUtils();
	const [open, setOpen] = useState(false);
	const [text, setText] = useState("");
	const tags = trpc.tags.list.useQuery(undefined, { enabled: open });

	const create = trpc.tags.create.useMutation({
		onSuccess: async (row) => {
			await utils.tags.list.invalidate();
			setOpen(false);
			setText("");
			onPick(row.name);
		},
		onError: (err) => toast.error(err.message),
	});

	const needle = text.trim().toLowerCase();
	const shown = (tags.data ?? []).filter(
		(t) => !needle || t.name.toLowerCase().includes(needle),
	);
	const exact = (tags.data ?? []).some((t) => t.name.toLowerCase() === needle);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>{children}</PopoverTrigger>
			<PopoverContent align="end" className="w-[300px] p-0">
				<Command shouldFilter={false} loop>
					<CommandInput
						value={text}
						onValueChange={setText}
						placeholder="Find or create a tag"
						className="text-[13px]"
					/>
					<CommandList className="max-h-[260px]">
						<CommandGroup>
							{needle && !exact && (
								<CommandItem
									value={`create:${needle}`}
									disabled={create.isPending}
									onSelect={() => create.mutate({ name: text.trim() })}
								>
									<Plus />
									<span className="truncate">Create “{text.trim()}”</span>
								</CommandItem>
							)}
							{shown.map((t) => (
								<CommandItem
									key={t.id}
									value={`tag:${t.id}`}
									onSelect={() => {
										setOpen(false);
										onPick(t.name);
									}}
								>
									<span className="truncate">{t.name}</span>
									<span className="ml-auto pl-3 text-[11.5px] text-muted-foreground tabular-nums">
										{t.count}
									</span>
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
