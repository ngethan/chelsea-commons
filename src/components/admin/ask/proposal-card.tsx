import type { ProposalState } from "@/components/admin/ask/use-ask";
import { ConfirmDialog } from "@/components/ui/alert-dialog";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	type EnrichedOperation,
	OPERATION_LABEL,
	type OperationKind,
	fieldChanges,
	isDestructive,
	summarizeCounts,
} from "@/lib/ai-operations";
import { STATUS_LABEL, normalizeStatus } from "@/lib/status";
import { cn } from "@/lib/utils";
import {
	Building2,
	Check,
	CreativeCommons,
	FileText,
	KeyRound,
	Link as LinkIcon,
	UserMinus,
	UserPlus,
	UserRound,
	X,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

/**
 * The card. Everything the model wants to change, row by row, with what is
 * there now beside what it would become, and two buttons. This is the whole
 * of the safeguard: the model can describe a change in as much detail as it
 * likes, and none of it happens until the person reads this and presses
 * Apply. Removing anything asks twice.
 *
 * The rows never disappear. After Apply each one carries its own result, so
 * a batch where one row failed says which, and a discarded card stays in the
 * conversation greyed rather than vanishing, because "what did I just say
 * no to" is a question people ask.
 */

const ICON: Record<OperationKind, typeof UserRound> = {
	create_contact: UserPlus,
	update_contact: UserRound,
	remove_contact: UserMinus,
	create_organization: Building2,
	update_organization: Building2,
	remove_organization: Building2,
	create_update: FileText,
	remove_update: FileText,
	create_links: LinkIcon,
	revoke_link: LinkIcon,
	invite: KeyRound,
	revoke_access: KeyRound,
	restore_access: KeyRound,
};

const FIELD_LABEL: Record<string, string> = {
	name: "name",
	email: "email",
	phone: "phone",
	status: "status",
	tags: "tags",
	notes: "notes",
	organization: "organization",
	alternateEmails: "also",
	domain: "domain",
	slug: "post",
};

const STATUS_TONE: Record<ProposalState["status"], Tone> = {
	pending: "neutral",
	applying: "neutral",
	applied: "success",
	discarded: "neutral",
	skipped: "neutral",
};

/** Rows beyond this fold away until asked for. */
const FOLD_AT = 12;

function value(field: string, raw: string | null) {
	if (raw === null) return null;
	if (field === "status") return STATUS_LABEL[normalizeStatus(raw)];
	return raw;
}

function Row({
	entry,
	result,
}: {
	entry: EnrichedOperation;
	result?: { ok: boolean; message: string };
}) {
	const { operation, before } = entry;
	const Icon = ICON[operation.op];
	const destructive = isDestructive(operation);
	const changes = fieldChanges(operation, before).map((change) => {
		// The organization is given as a reference; the card shows its name.
		if (change.field === "organization" && operation.op !== "create_links") {
			const to =
				entry.organization?.name ?? (change.to ? `${change.to} (new)` : null);
			return { ...change, to };
		}
		return change;
	});

	return (
		<li className="grid grid-cols-[16px_minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-4 py-2.5">
			<Icon
				className={cn(
					"mt-0.5 size-4",
					destructive ? "text-destructive" : "text-muted-foreground",
				)}
			/>
			<div className="min-w-0">
				<div className="flex flex-wrap items-baseline gap-x-2">
					<span className="truncate text-[13px] font-medium">
						{entry.label}
					</span>
					<span
						className={cn(
							"text-[11px] uppercase tracking-[0.06em]",
							destructive ? "text-destructive" : "text-muted-foreground",
						)}
					>
						{OPERATION_LABEL[operation.op]}
					</span>
				</div>

				{operation.op === "create_links" && (
					<div className="mt-0.5 text-[12px] text-muted-foreground">
						{operation.contactIds.length}{" "}
						{operation.contactIds.length === 1 ? "person" : "people"}
					</div>
				)}

				{destructive && before && (
					<div className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground">
						{Object.values(before)
							.filter((v) => v !== null && v !== undefined && v !== "")
							.map((v) => (Array.isArray(v) ? v.join(", ") : String(v)))
							.join(" · ")}
					</div>
				)}

				{changes.length > 0 && (
					<dl className="mt-1 flex flex-col gap-0.5">
						{changes.map((change) => (
							<div
								key={change.field}
								className="flex flex-wrap items-baseline gap-x-1.5 text-[12px]"
							>
								<dt className="text-muted-foreground">
									{FIELD_LABEL[change.field] ?? change.field}
								</dt>
								<dd className="min-w-0 break-words">
									{before && change.from !== null && (
										<>
											<span className="text-muted-foreground line-through decoration-muted-foreground/50">
												{value(change.field, change.from)}
											</span>
											<span className="mx-1.5 text-muted-foreground/60">→</span>
										</>
									)}
									<span
										className={cn(
											change.to === null && "text-muted-foreground italic",
										)}
									>
										{value(change.field, change.to) ?? "nothing"}
									</span>
								</dd>
							</div>
						))}
					</dl>
				)}

				{entry.warnings.map((warning) => (
					<div
						key={warning}
						className="mt-1 flex items-center gap-1.5 text-[11.5px] text-warning"
					>
						<span className="size-1.5 rounded-full bg-warning" />
						{warning}
					</div>
				))}

				{result && !result.ok && (
					<div className="mt-1 text-[11.5px] text-destructive">
						{result.message}
					</div>
				)}
			</div>

			<div className="flex items-start pt-0.5">
				{result &&
					(result.ok ? (
						<motion.span
							initial={{ scale: 0.6, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							transition={{ type: "spring", stiffness: 500, damping: 30 }}
							className="flex size-4 items-center justify-center rounded-full bg-success/15 text-success"
						>
							<Check className="size-3" strokeWidth={2.5} />
						</motion.span>
					) : (
						<span className="flex size-4 items-center justify-center rounded-full bg-destructive/15 text-destructive">
							<X className="size-3" strokeWidth={2.5} />
						</span>
					))}
			</div>
		</li>
	);
}

export function ProposalCard({
	entry,
	onDecide,
}: {
	entry: ProposalState;
	onDecide: (decision: "apply" | "discard") => void;
}) {
	const { proposal, status, result } = entry;
	const [confirming, setConfirming] = useState(false);
	const [unfolded, setUnfolded] = useState(false);

	const operations = proposal.operations;
	const shown = unfolded ? operations : operations.slice(0, FOLD_AT);
	const hidden = operations.length - shown.length;
	const counts = summarizeCounts(operations.map((o) => o.operation));
	const closed = status === "discarded" || status === "skipped";
	const removed = operations.filter((o) => isDestructive(o.operation)).length;

	const badge =
		status === "applied"
			? result && result.failed > 0
				? {
						tone: "warning" as Tone,
						text: `${result.applied} of ${result.results.length} applied`,
					}
				: { tone: "success" as Tone, text: "Applied" }
			: status === "applying"
				? { tone: "neutral" as Tone, text: "Applying" }
				: status === "discarded"
					? { tone: "neutral" as Tone, text: "Discarded" }
					: status === "skipped"
						? { tone: "neutral" as Tone, text: "Skipped" }
						: null;

	return (
		<motion.div
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.18, ease: "easeOut" }}
			className={cn(
				"my-3 border bg-card transition-colors",
				proposal.destructive && status === "pending"
					? "border-destructive/40"
					: "border-border",
				closed && "opacity-60",
			)}
		>
			<div className="flex items-start gap-3 border-b border-border px-4 py-3">
				<CreativeCommons
					className={cn(
						"mt-0.5 size-4 shrink-0",
						status === "pending" ? "text-primary" : "text-muted-foreground",
					)}
				/>
				<div className="min-w-0 flex-1">
					<div className="text-[13.5px] font-medium leading-snug">
						{proposal.summary}
					</div>
					<div className="mt-0.5 text-[12px] text-muted-foreground">
						{counts}
					</div>
				</div>
				{badge && (
					<Badge
						tone={STATUS_TONE[status] === "neutral" ? badge.tone : badge.tone}
					>
						{badge.text}
					</Badge>
				)}
			</div>

			<ul className="divide-y divide-border">
				{shown.map((op, index) => (
					<Row
						key={`${op.operation.op}:${index}`}
						entry={op}
						result={result?.results.find((r) => r.index === index)}
					/>
				))}
			</ul>

			{hidden > 0 && (
				<button
					type="button"
					onClick={() => setUnfolded(true)}
					className="w-full cursor-pointer border-t border-border px-4 py-2 text-left text-[12px] text-muted-foreground hover:bg-hover-muted hover:text-foreground"
				>
					{hidden} more
				</button>
			)}

			{(status === "pending" || status === "applying") && (
				<div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
					<Button
						size="sm"
						variant={proposal.destructive ? "outline" : "default"}
						disabled={status === "applying"}
						onClick={() =>
							proposal.destructive ? setConfirming(true) : onDecide("apply")
						}
					>
						{status === "applying"
							? "Applying"
							: operations.length === 1
								? "Apply"
								: `Apply ${operations.length} changes`}
					</Button>
					<Button
						size="sm"
						variant="text"
						disabled={status === "applying"}
						onClick={() => onDecide("discard")}
					>
						Discard
					</Button>
				</div>
			)}

			<ConfirmDialog
				open={confirming}
				onOpenChange={setConfirming}
				title={
					removed === 1 ? "Remove this one?" : `Remove ${removed} of these?`
				}
				description={
					removed === operations.length
						? "Contacts come off the list but keep their history; organizations, updates and revoked links are gone for good."
						: `${removed} of the ${operations.length} changes remove or revoke something. The rest are ordinary edits.`
				}
				action="Apply"
				onConfirm={() => {
					setConfirming(false);
					onDecide("apply");
				}}
			/>
		</motion.div>
	);
}
