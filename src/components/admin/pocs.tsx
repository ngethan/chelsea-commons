import { PersonAvatar } from "@/components/admin/person-avatar";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
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
import { cn } from "@/lib/utils";
import { trpc } from "@/trpc/client";
import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";

/**
 * Points of contact are the people who can sign in here. A contact's
 * `pocs` holds their user ids; a value that is not an id is a name that
 * predates the roster (an import wrote "Will" before Will had an account)
 * and is shown as plain text until somebody reassigns it. Nothing here
 * invents a user: the picker only offers people from the roster.
 */

export type Poc = {
	id: string;
	name: string;
	email: string;
	image: string | null;
};

/** The roster, and a way to turn a stored value into something to show. */
export function usePocs() {
	const users = trpc.access.users.useQuery(undefined, { staleTime: 300_000 });
	const byId = useMemo(
		() => new Map((users.data ?? []).map((u) => [u.id, u])),
		[users.data],
	);
	return {
		users: users.data ?? [],
		loading: users.isLoading,
		resolve: (value: string): Poc | null => byId.get(value) ?? null,
		label: (value: string) => byId.get(value)?.name ?? value,
	};
}

export function PocAvatar({
	poc,
	className,
}: {
	poc: Poc;
	className?: string;
}) {
	return <PersonAvatar person={poc} size="xs" className={className} />;
}

/** One POC as a pill: avatar and name, or the bare name for an old value. */
export function PocPill({
	value,
	onRemove,
}: {
	value: string;
	onRemove?: () => void;
}) {
	const { resolve } = usePocs();
	const poc = resolve(value);
	return (
		<span
			className={cn(
				"inline-flex h-7 shrink-0 items-center gap-2 rounded-full bg-secondary text-[12.5px]",
				poc ? "pl-1" : "pl-3",
				onRemove ? "pr-1" : "pr-3",
				!poc && "text-muted-foreground",
			)}
			title={poc ? poc.email : "Not on the roster yet"}
		>
			{poc && <PocAvatar poc={poc} />}
			<span className="truncate">{poc?.name ?? value}</span>
			{onRemove && (
				<Button
					variant="icon"
					size="icon-2xs"
					className="size-5"
					aria-label={`Remove ${poc?.name ?? value}`}
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

/** A row of POCs, for a table cell. */
export function PocList({ values }: { values: string[] }) {
	const { resolve } = usePocs();
	if (values.length === 0)
		return <span className="text-[12.5px] text-muted-foreground">—</span>;
	return (
		<div className="flex flex-wrap items-center gap-1">
			{values.map((value) => {
				const poc = resolve(value);
				return poc ? (
					<span
						key={value}
						className="inline-flex items-center gap-1.5 text-[12.5px]"
						title={poc.email}
					>
						<PocAvatar poc={poc} />
						{poc.name}
					</span>
				) : (
					<span
						key={value}
						className="text-[12.5px] text-muted-foreground"
						title="Not on the roster yet"
					>
						{value}
					</span>
				);
			})}
		</div>
	);
}

/** How many faces the field shows before folding the rest into "+N". */
const FACES = 4;

/**
 * The people chosen, drawn to fit one line: small faces side by side, then
 * the names as one truncated line. A value that is not on the roster has
 * no face and shows as a muted name.
 */
export function PocStack({ values }: { values: string[] }) {
	const { resolve } = usePocs();
	const people = values.map((v) => ({ value: v, poc: resolve(v) }));
	const faces = people.filter((p) => p.poc).slice(0, FACES);
	const more = people.filter((p) => p.poc).length - faces.length;
	return (
		<div className="flex min-w-0 items-center gap-2.5">
			{faces.length > 0 && (
				<div className="flex shrink-0 items-center gap-1">
					{faces.map(({ value, poc }) =>
						poc ? <PocAvatar key={value} poc={poc} className="size-5" /> : null,
					)}
					{more > 0 && (
						<span className="flex size-5 items-center justify-center rounded-full bg-avatar text-[9px] text-muted-foreground tabular-nums">
							+{more}
						</span>
					)}
				</div>
			)}
			<span className="truncate text-[14px]">
				{people.map(({ value, poc }, i) => (
					<span key={value} className={poc ? "" : "text-muted-foreground"}>
						{i > 0 && <span className="text-muted-foreground">, </span>}
						{poc?.name ?? value}
					</span>
				))}
			</span>
		</div>
	);
}

/**
 * The POCs field: a floating-label field over a list of everybody who can
 * sign in, several at a time. The field is a fixed height and shows the
 * chosen people as faces and a line of names; choosing and unchoosing both
 * happen in the list, so the field never grows and the grid never shifts.
 */
export function PocPicker({
	label = "POCs",
	value,
	onChange,
	className,
}: {
	label?: string;
	value: string[];
	onChange: (values: string[]) => void;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const { users, loading } = usePocs();

	const has = (id: string) => value.includes(id);
	const toggle = (id: string) =>
		onChange(has(id) ? value.filter((v) => v !== id) : [...value, id]);
	const floated = open || value.length > 0;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				{/* A div, not a button: the pills inside carry their own remove
				    buttons, and a button may not contain a button. */}
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
						"relative flex h-14 w-full min-w-0 cursor-pointer items-center rounded-none border border-input bg-card px-3.5 pt-5 pb-1.5 text-left outline-none transition-colors focus-visible:border-input-focus data-[open=true]:border-input-focus",
						className,
					)}
				>
					<PocStack values={value} />
					<span className={cn("fl-label", floated && "fl-up")}>{label}</span>
				</div>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
				<Command loop>
					<CommandInput placeholder="Search people" className="text-[13px]" />
					<CommandList className="max-h-[260px]">
						<CommandEmpty>
							{loading ? "Loading" : "Nobody matches."}
						</CommandEmpty>
						<CommandGroup>
							{users.map((u) => (
								<CommandItem
									key={u.id}
									value={`${u.name} ${u.email}`}
									onSelect={() => toggle(u.id)}
								>
									{/* Picture and name, and a tick on the right for the ones
									    chosen. No blank tick slot in front of a face, and no
									    address: the face is the identity here. */}
									<PocAvatar poc={u} />
									<span className="truncate">{u.name}</span>
									{has(u.id) && (
										<Check className="ml-auto size-3.5 shrink-0 text-foreground" />
									)}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
