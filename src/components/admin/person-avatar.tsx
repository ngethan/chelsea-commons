import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarColors, initialsFor } from "@/lib/avatar-hue";
import { cn } from "@/lib/utils";

/**
 * Anybody with a face in the admin: a contact, a user, the viewer. The
 * picture when there is one (Google gives users theirs; contacts have none
 * yet), otherwise initials on a colour that follows from the id, so the
 * same person is the same colour wherever they turn up.
 */
export type Person = {
	id: string;
	name?: string | null;
	email?: string | null;
	image?: string | null;
};

/**
 * Sized to what sits beside it. `xs` and `sm` for one line of text; `md`
 * for a table row's name with a line under it (36px, the two lines); `lg`
 * for a control; `xl` for a drawer head's title with its description (56px,
 * the two lines). A face shorter than the text beside it looks pinned on.
 */
const SIZE = {
	xs: { avatar: "size-5", text: "text-[9px]" },
	sm: { avatar: "size-7", text: "text-[11px]" },
	md: { avatar: "size-9", text: "text-[12.5px]" },
	lg: { avatar: "size-10", text: "text-[14px]" },
	xl: { avatar: "size-14", text: "text-[18px]" },
} as const;

export function PersonAvatar({
	person,
	size = "sm",
	className,
}: {
	person: Person;
	size?: keyof typeof SIZE;
	className?: string;
}) {
	return (
		<Avatar className={cn(SIZE[size].avatar, className)}>
			{person.image && <AvatarImage src={person.image} alt="" />}
			<AvatarFallback
				className={cn("border-transparent", SIZE[size].text)}
				style={avatarColors(person.id)}
			>
				{initialsFor(person.name, person.email)}
			</AvatarFallback>
		</Avatar>
	);
}
