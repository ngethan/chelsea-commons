import { PersonAvatar } from "@/components/admin/person-avatar";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { trpc } from "@/trpc/client";

/**
 * "This may already be somebody on the list", for the Add sheet while a
 * name is typed and for a drawer's own record. One line per candidate, a
 * face and a way to look, never a block: two people can share a
 * name, and the person reading can tell.
 */
export function TwinsNotice({
	name,
	email,
	exceptId,
	onView,
}: {
	name: string;
	email: string;
	exceptId?: string;
	onView: (id: string) => void;
}) {
	// A pause in typing, not every keystroke: each check is a query.
	const settledName = useDebouncedValue(name.trim(), 300);
	const settledEmail = useDebouncedValue(email.trim(), 300);
	const twins = trpc.contacts.twins.useQuery(
		{ name: settledName, email: settledEmail, exceptId },
		{
			enabled: settledName.length >= 3 || settledEmail.includes("@"),
			staleTime: 30_000,
		},
	);

	const rows = twins.data ?? [];
	if (rows.length === 0) return null;

	return (
		<div className="flex flex-col gap-1.5 border border-warning/40 bg-warning/10 px-3.5 py-3 text-[13px]">
			{rows.map((twin) => (
				<div key={twin.id} className="flex items-center gap-2.5">
					<PersonAvatar person={twin} size="xs" />
					<span className="min-w-0 flex-1 truncate">
						<span className="font-medium">
							{twin.name || twin.email || "Somebody"}
						</span>
						{twin.organizationName && (
							<span className="text-muted-foreground">
								{" "}
								at {twin.organizationName}
							</span>
						)}
					</span>
					<Button variant="text" size="2xs" onClick={() => onView(twin.id)}>
						View
					</Button>
				</div>
			))}
		</div>
	);
}
