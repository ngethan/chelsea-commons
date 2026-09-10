import { relations, sql } from "drizzle-orm";
import {
	bigserial,
	boolean,
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	vector,
} from "drizzle-orm/pg-core";

/**
 * Semantic search. Every searchable table carries the same pair: the vector,
 * and the exact text it was computed from. The text is what makes reindexing
 * cheap: a row whose document has not changed is skipped without a call to
 * the embedding API, and a row that has is visibly stale rather than silently
 * wrong. 1536 is `text-embedding-3-small`'s width; see `src/server/search`.
 */
export const EMBEDDING_DIMENSIONS = 1536;
const embeddingColumns = {
	embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
	embeddingText: text("embedding_text"),
};

/* -------------------------------------------------------------------------- *
 * Better Auth
 *
 * Property keys are Better Auth's own field names and are not ours to rename:
 * the Drizzle adapter resolves `schema[model][fieldName]`, so `emailVerified`
 * has to be spelled that way here even though the column underneath is
 * snake_case. Only the column names in the string arguments are a choice.
 * -------------------------------------------------------------------------- */

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull().default(false),
	image: text("image"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export const session = pgTable(
	"session",
	{
		id: text("id").primaryKey(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		token: text("token").notNull().unique(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
	},
	(t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
	"account",
	{
		id: text("id").primaryKey(),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at", {
			withTimezone: true,
		}),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
			withTimezone: true,
		}),
		scope: text("scope"),
		password: text("password"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow(),
});

/* -------------------------------------------------------------------------- *
 * Access
 * -------------------------------------------------------------------------- */

/**
 * The roster. Signing in with Google succeeds only if a live row here matches
 * the address, so this table is the whole of "signups are disabled".
 *
 * Deliberately not Better Auth's `user` table: that one is the library's to
 * shape, and pre-writing rows into it would mean inventing a placeholder name
 * that shows in the UI until the person first signs in. Keeping the roster
 * separate also makes "invited but never signed in" a state we can render.
 */
export const invitedUser = pgTable(
	"invited_user",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		email: text("email").notNull(),
		invitedBy: text("invited_by").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		/** Withdrawn. A timestamp rather than a delete, so the log still reads. */
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
	},
	(t) => [
		/**
		 * Case-insensitive, and only over live rows: withdrawing an invite and
		 * later sending a new one to the same address has to be allowed, and a
		 * plain unique index would refuse it forever.
		 */
		uniqueIndex("one_invite_per_email")
			.on(sql`lower(${t.email})`)
			.where(sql`${t.revokedAt} is null`),
	],
);

/* -------------------------------------------------------------------------- *
 * CRM
 * -------------------------------------------------------------------------- */

export const organization = pgTable(
	"organization",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name").notNull(),
		/**
		 * Earns its place beyond display: pasting a block of addresses matches
		 * `@example.com` against this and suggests the organization, instead of
		 * setting it by hand on fourteen rows.
		 */
		domain: text("domain"),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		...embeddingColumns,
	},
	(t) => [
		index("organization_embedding_idx").using(
			"hnsw",
			t.embedding.op("vector_cosine_ops"),
		),
	],
);

export const contact = pgTable(
	"contact",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		name: text("name"),
		/**
		 * Optional: half the people worth remembering were met at a dinner and
		 * never wrote down an address. A row needs a name or an email, which
		 * the router enforces; the database only insists that an address, when
		 * there is one, is held by one live contact.
		 */
		email: text("email"),
		/** Their role, when it is worth more than the organization: "Principal". */
		title: text("title"),
		/**
		 * Old work addresses. No uniqueness and no primary flag: these exist so
		 * a paste-import can recognise somebody already on the list, not so a
		 * message can be addressed to one of them.
		 */
		alternateEmails: text("alternate_emails").array().notNull().default([]),
		phone: text("phone"),
		organizationId: uuid("organization_id").references(() => organization.id, {
			onDelete: "set null",
		}),
		/** Pipeline position only. What somebody *is* lives in `tags`. */
		status: text("status").notNull().default("prospect"),
		tags: text("tags").array().notNull().default([]),
		/**
		 * Who in the house holds the relationship. Names, and more than one,
		 * because "Will's podcast guest whom Sachin then pitched" is two people
		 * and neither of them is a user of this admin.
		 */
		pocs: text("pocs").array().notNull().default([]),
		notes: text("notes"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
		...embeddingColumns,
	},
	(t) => [
		/**
		 * One live contact per address, matched case-insensitively. Partial over
		 * `deleted_at is null` for the same reason as invites: a soft delete
		 * must not lock the address out of the list permanently.
		 */
		uniqueIndex("one_contact_per_email")
			.on(sql`lower(${t.email})`)
			.where(sql`${t.deletedAt} is null`),
		index("contact_organization_idx").on(t.organizationId),
		index("contact_status_idx").on(t.status),
		index("contact_embedding_idx").using(
			"hnsw",
			t.embedding.op("vector_cosine_ops"),
		),
	],
);

/**
 * What we did with somebody, when. Written by a person (or proposed by the
 * assistant and applied by a person), never by the system: the system's own
 * record of edits and clicks is `activity`. One row per touchpoint, so
 * "shared the update, asked about a venue" in June and "had a call" in July
 * are two rows rather than one overwritten note.
 */
export const interaction = pgTable(
	"interaction",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		contactId: uuid("contact_id")
			.notNull()
			.references(() => contact.id, { onDelete: "cascade" }),
		occurredAt: timestamp("occurred_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		/** A short category: "Investor update outreach", "Meeting". Free text. */
		topic: text("topic"),
		summary: text("summary").notNull(),
		createdBy: text("created_by").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("interaction_contact_idx").on(t.contactId, t.occurredAt.desc()),
	],
);

/**
 * Two contacts somebody looked at and said are not the same person.
 * Duplicate candidates are computed on read (same name, same phone, an
 * address that is another row's alternate), so the only thing worth storing
 * is the decision to stop asking. `a` sorts before `b` so a pair is one row.
 */
export const duplicateDismissal = pgTable(
	"duplicate_dismissal",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		contactA: uuid("contact_a")
			.notNull()
			.references(() => contact.id, { onDelete: "cascade" }),
		contactB: uuid("contact_b")
			.notNull()
			.references(() => contact.id, { onDelete: "cascade" }),
		createdBy: text("created_by").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [uniqueIndex("one_dismissal_per_pair").on(t.contactA, t.contactB)],
);

/* -------------------------------------------------------------------------- *
 * Updates and tracked links
 * -------------------------------------------------------------------------- */

/**
 * One investor update. The text itself stays a markdown file in
 * `content/blog`; this row is what recipients and clicks hang off, and it
 * exists before anybody has clicked anything.
 *
 * `title` is a snapshot rather than a lookup so renaming a markdown file later
 * does not silently rewrite what you sent.
 */
export const update = pgTable(
	"update",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		createdBy: text("created_by").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		...embeddingColumns,
	},
	(t) => [
		index("update_embedding_idx").using(
			"hnsw",
			t.embedding.op("vector_cosine_ops"),
		),
	],
);

export const link = pgTable(
	"link",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		ref: text("ref").notNull().unique(),
		contactId: uuid("contact_id")
			.notNull()
			.references(() => contact.id, { onDelete: "cascade" }),
		updateId: uuid("update_id")
			.notNull()
			.references(() => update.id, { onDelete: "cascade" }),
		createdBy: text("created_by").references(() => user.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
	},
	(t) => [
		/**
		 * One ref per person per update. Two refs would split one reader's
		 * history in half, and the halves look like ordinary numbers, so
		 * nothing would ever tell you it had happened.
		 */
		uniqueIndex("one_link_per_contact_per_update").on(t.contactId, t.updateId),
		index("link_update_idx").on(t.updateId),
	],
);

export const linkEvent = pgTable(
	"link_event",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		ref: text("ref")
			.notNull()
			.references(() => link.ref, { onDelete: "cascade" }),
		kind: text("kind").notNull(),
		userAgent: text("user_agent"),
		ip: text("ip"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("link_event_ref_idx").on(t.ref, t.createdAt.desc())],
);

/* -------------------------------------------------------------------------- *
 * Activity
 * -------------------------------------------------------------------------- */

/**
 * Who changed what, when. Written explicitly by the mutations that change
 * something, rather than diffed automatically underneath Drizzle: a generic
 * differ produces `updated_at changed from X to Y` and you spend the rest of
 * the project filtering its own noise back out.
 *
 * `entityId` is text rather than a uuid so one table covers every entity
 * without a column per foreign key, and rows survive their subject.
 */
export const activity = pgTable(
	"activity",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		actorUserId: text("actor_user_id").references(() => user.id, {
			onDelete: "set null",
		}),
		entityType: text("entity_type").notNull(),
		entityId: text("entity_id").notNull(),
		verb: text("verb").notNull(),
		field: text("field"),
		oldValue: text("old_value"),
		newValue: text("new_value"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		index("activity_entity_idx").on(
			t.entityType,
			t.entityId,
			t.createdAt.desc(),
		),
	],
);

/* -------------------------------------------------------------------------- *
 * Ask AI
 * -------------------------------------------------------------------------- */

/**
 * One conversation with the assistant, kept so it can be reopened later.
 *
 * `state` is the browser's whole picture in one document: the transcript in
 * the API's own message shape, what each tool call returned, and each
 * proposal with what the person did about it. One column rather than a
 * table per part because it is only ever read and written whole, by one
 * person, and the shape belongs to the client code that renders it.
 *
 * Scoped to the person who had it: a conversation is a train of thought,
 * not a record, and somebody else's half-finished paste is noise.
 */
export const aiConversation = pgTable(
	"ai_conversation",
	{
		id: uuid("id").primaryKey().defaultRandom(),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		/** The first thing the person said, cut short. */
		title: text("title").notNull(),
		state: jsonb("state").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [index("ai_conversation_user_idx").on(t.userId, t.updatedAt.desc())],
);

/* -------------------------------------------------------------------------- *
 * Relations
 * -------------------------------------------------------------------------- */

export const organizationRelations = relations(organization, ({ many }) => ({
	contacts: many(contact),
}));

export const contactRelations = relations(contact, ({ one, many }) => ({
	organization: one(organization, {
		fields: [contact.organizationId],
		references: [organization.id],
	}),
	links: many(link),
	interactions: many(interaction),
}));

export const interactionRelations = relations(interaction, ({ one }) => ({
	contact: one(contact, {
		fields: [interaction.contactId],
		references: [contact.id],
	}),
}));

export const updateRelations = relations(update, ({ many }) => ({
	links: many(link),
}));

export const linkRelations = relations(link, ({ one, many }) => ({
	contact: one(contact, {
		fields: [link.contactId],
		references: [contact.id],
	}),
	update: one(update, {
		fields: [link.updateId],
		references: [update.id],
	}),
	events: many(linkEvent),
}));

export const linkEventRelations = relations(linkEvent, ({ one }) => ({
	link: one(link, { fields: [linkEvent.ref], references: [link.ref] }),
}));
