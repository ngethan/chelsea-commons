import type {
	ApplyResult,
	Operation,
	OperationResult,
} from "@/lib/ai-operations";
import { TRPCError } from "@trpc/server";
import type { ToolContext } from "./read-tools";

/**
 * Runs an approved proposal.
 *
 * Every operation goes through the tRPC procedure the admin's own button
 * would call, so the duplicate-address check, the activity log entry and
 * the search reindex are the ordinary ones, attributed to the signed-in
 * person. Operations run in order and independently: one failing does not
 * roll back the ones before it, because the procedures underneath are not
 * transactional either, and the card reports each row on its own so a
 * partial result is visible rather than hidden.
 */
export async function applyOperations(
	operations: Operation[],
	tc: ToolContext,
): Promise<ApplyResult> {
	const { caller } = tc;
	const results: OperationResult[] = [];

	/**
	 * "At Acme" resolves once per proposal. Names are matched against the
	 * live list case-insensitively and created when nothing matches, and the
	 * result is remembered so twelve people at Acme make one organization.
	 */
	const organizationIds = new Map<string, string>();
	async function organizationId(
		ref: { id: string } | { name: string } | null | undefined,
	): Promise<string | null | undefined> {
		if (ref === undefined) return undefined;
		if (ref === null) return null;
		if ("id" in ref) return ref.id;
		const key = ref.name.trim().toLowerCase();
		const known = organizationIds.get(key);
		if (known) return known;
		const existing = (await caller.organizations.list()).find(
			(o) => o.name.toLowerCase() === key,
		);
		const id =
			existing?.id ??
			(await caller.organizations.create({ name: ref.name.trim() })).id;
		organizationIds.set(key, id);
		return id;
	}

	for (const [index, operation] of operations.entries()) {
		try {
			results.push({ index, ...(await run(operation)) });
		} catch (err) {
			results.push({
				index,
				ok: false,
				message:
					err instanceof TRPCError
						? err.message
						: "Something went wrong applying this one.",
			});
			if (!(err instanceof TRPCError)) console.error("[ai.apply]", err);
		}
	}

	async function run(
		operation: Operation,
	): Promise<Omit<OperationResult, "index">> {
		switch (operation.op) {
			case "create_contact": {
				const row = await caller.contacts.create({
					name: operation.name ?? null,
					email: operation.email,
					alternateEmails: operation.alternateEmails ?? [],
					phone: operation.phone ?? null,
					organizationId:
						(await organizationId(operation.organization)) ?? null,
					status: operation.status ?? "prospect",
					tags: operation.tags ?? [],
					notes: operation.notes ?? null,
				});
				return {
					ok: true,
					message: `Added ${row.name || row.email}`,
					id: row.id,
				};
			}

			case "update_contact": {
				const { id, op: _op, organization, ...fields } = operation;
				const orgId = await organizationId(organization);
				const row = await caller.contacts.update({
					id,
					...defined(fields),
					...(orgId !== undefined ? { organizationId: orgId } : {}),
				});
				return { ok: true, message: `Updated ${row.name || row.email}`, id };
			}

			case "remove_contact":
				await caller.contacts.remove({ id: operation.id });
				return { ok: true, message: "Removed", id: operation.id };

			case "create_organization": {
				const row = await caller.organizations.create({
					name: operation.name,
					domain: operation.domain ?? null,
					notes: operation.notes ?? null,
				});
				organizationIds.set(row.name.toLowerCase(), row.id);
				return { ok: true, message: `Added ${row.name}`, id: row.id };
			}

			case "update_organization": {
				const { id, op: _op, ...fields } = operation;
				const row = await caller.organizations.update({
					id,
					...defined(fields),
				});
				return { ok: true, message: `Updated ${row.name}`, id };
			}

			case "remove_organization":
				await caller.organizations.remove({ id: operation.id });
				return { ok: true, message: "Removed", id: operation.id };

			case "create_update": {
				const row = await caller.updates.create({ slug: operation.slug });
				return { ok: true, message: `Created ${row.title}`, id: row.id };
			}

			case "remove_update":
				await caller.updates.remove({ id: operation.id });
				return { ok: true, message: "Deleted", id: operation.id };

			case "create_links": {
				const out = await caller.links.createForContacts({
					updateId: operation.updateId,
					contactIds: operation.contactIds,
				});
				return {
					ok: true,
					message: `${out.created} new ${out.created === 1 ? "link" : "links"}${out.existing ? `, ${out.existing} already had one` : ""}`,
					id: operation.updateId,
				};
			}

			case "revoke_link": {
				const out = await caller.links.revoke({ id: operation.id });
				return out.revoked
					? { ok: true, message: "Revoked", id: operation.id }
					: { ok: false, message: "That link was already revoked." };
			}

			case "invite": {
				const row = await caller.access.invite({ email: operation.email });
				return { ok: true, message: `Invited ${row.email}`, id: row.id };
			}

			case "revoke_access":
				await caller.access.revoke({ id: operation.id });
				return { ok: true, message: "Revoked", id: operation.id };

			case "restore_access": {
				const row = await caller.access.restore({ id: operation.id });
				return { ok: true, message: `Restored ${row.email}`, id: row.id };
			}
		}
	}

	const applied = results.filter((r) => r.ok).length;
	return { results, applied, failed: results.length - applied };
}

/** Drops the keys an operation left unset, so a patch only touches what it names. */
function defined<T extends Record<string, unknown>>(fields: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(fields).filter(([, v]) => v !== undefined),
	) as Partial<T>;
}
