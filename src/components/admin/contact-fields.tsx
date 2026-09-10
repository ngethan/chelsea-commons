import { PocPicker } from "@/components/admin/pocs";
import { TagPicker } from "@/components/admin/tag-picker";
import {
	FloatingCombobox,
	FloatingInput,
	FloatingSelect,
	FloatingTextarea,
} from "@/components/ui/floating-field";
import { CONTACT_STATUSES, STATUS_LABEL, normalizeStatus } from "@/lib/status";
import { toast } from "@/lib/toast";
import { trpc } from "@/trpc/client";

/**
 * A person's fields, as the form holds them. One shape for adding and for
 * editing, so the two screens cannot drift apart: the Add sheet and the
 * drawer both render `ContactFields` over a `Draft`.
 */
export type Draft = {
	name: string;
	email: string;
	title: string;
	phone: string;
	status: string;
	tags: string[];
	pocs: string[];
	notes: string;
	organizationId: string | null;
};

export const EMPTY_DRAFT: Draft = {
	name: "",
	email: "",
	title: "",
	phone: "",
	status: "prospect",
	tags: [],
	pocs: [],
	notes: "",
	organizationId: null,
};

export function draftFrom(row: {
	name: string | null;
	email: string | null;
	title: string | null;
	phone: string | null;
	status: string;
	tags: string[];
	pocs: string[];
	notes: string | null;
	organizationId: string | null;
}): Draft {
	return {
		name: row.name ?? "",
		email: row.email ?? "",
		title: row.title ?? "",
		phone: row.phone ?? "",
		status: row.status,
		tags: row.tags,
		pocs: row.pocs,
		notes: row.notes ?? "",
		organizationId: row.organizationId,
	};
}

/** The draft as the router wants it: blanks become nulls. */
export function toInput(draft: Draft) {
	return {
		name: draft.name.trim() || null,
		email: draft.email.trim() || null,
		title: draft.title.trim() || null,
		phone: draft.phone.trim() || null,
		status: normalizeStatus(draft.status),
		tags: draft.tags,
		pocs: draft.pocs,
		notes: draft.notes.trim() || null,
		organizationId: draft.organizationId,
	};
}

export const same = (a: Draft, b: Draft) =>
	JSON.stringify(a) === JSON.stringify(b);

/**
 * The grid of fields. Two columns, notes across both. The organization
 * box can make an organization that does not exist yet, so a person at a
 * new company is one form rather than two screens.
 */
export function ContactFields({
	draft,
	onChange,
	autoFocus,
}: {
	draft: Draft;
	onChange: (next: Draft) => void;
	/** Put the caret in the name field on mount, for the Add sheet. */
	autoFocus?: boolean;
}) {
	const utils = trpc.useUtils();
	const organizations = trpc.organizations.list.useQuery();

	const createOrganization = trpc.organizations.create.useMutation({
		onSuccess: async (row) => {
			await utils.organizations.list.invalidate();
			onChange({ ...draft, organizationId: row.id });
		},
		onError: (err) => toast.error(err.message),
	});

	const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
		onChange({ ...draft, [key]: value });

	return (
		<div className="grid grid-cols-2 gap-4">
			<FloatingInput
				label="Name"
				value={draft.name}
				onChange={(e) => set("name", e.target.value)}
				autoFocus={autoFocus}
			/>
			<FloatingInput
				label="Email"
				type="email"
				value={draft.email}
				onChange={(e) => set("email", e.target.value)}
			/>
			<FloatingInput
				label="Title"
				value={draft.title}
				onChange={(e) => set("title", e.target.value)}
			/>
			<FloatingCombobox
				label="Organization"
				value={draft.organizationId}
				onChange={(value) => set("organizationId", value)}
				clearLabel="None"
				options={(organizations.data ?? []).map((o) => ({
					value: o.id,
					label: o.name,
					hint: o.domain,
				}))}
				onCreate={(name) => createOrganization.mutate({ name })}
			/>
			<FloatingInput
				label="Phone"
				value={draft.phone}
				onChange={(e) => set("phone", e.target.value)}
			/>
			<FloatingSelect
				label="Status"
				value={draft.status}
				onChange={(value) => set("status", value)}
				options={CONTACT_STATUSES.map((status) => ({
					value: status,
					label: STATUS_LABEL[status],
				}))}
			/>
			<PocPicker value={draft.pocs} onChange={(pocs) => set("pocs", pocs)} />
			<TagPicker value={draft.tags} onChange={(tags) => set("tags", tags)} />
			<FloatingTextarea
				label="Notes"
				className="col-span-2"
				value={draft.notes}
				onChange={(e) => set("notes", e.target.value)}
			/>
		</div>
	);
}
