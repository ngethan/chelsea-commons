# Agent conventions

Project context lives in `PRODUCT.md` (audiences, purpose, principles),
`DESIGN.md` (the public site's design system) and `DESIGN-ADMIN.md` (the
admin's, which is a different product with different rules). This file is the short list of rules that are
easy to break by accident.

## Brand

- **Never italicize "Chelsea Commons."** The name is always set upright, in any
  medium: page copy, the navbar wordmark, email templates, decks, alt text. The
  serif italic treatment is for other display text, not for the name itself.
- **Never write the house's street address.** Not in page copy, not in email
  footers, not in these docs. "Chelsea" or "New York" is as specific as it gets.

## Writing

- No em dashes. Use a comma, a colon, or two sentences.
- No marketing fluff or superlatives. The voice is human and direct; ambition
  is shown by what the community does, not claimed.

## Styling

- Fonts are set by the `--font-*` tokens in `src/styles.css`. Change them there
  and nowhere else. The classes in `src/styles/font-utilities.css` all read
  their token; hard-coding a stack back into one of those classes silently
  overrides the token for the whole site, which is exactly how the serif and
  the sans drifted apart before.
- `Memoir` is available as `.font-memoir`. It is a caps-only display face with
  no italic or bold cut, so lowercase input renders as capitals. Do not use it
  as body or default heading type.

## The admin

`/admin` is the private side: a contact list, the organizations people belong
to, the investor updates that have gone out, and the settings, where the
roster of who can sign in lives. Sign-in is Google or email and password, and
either only admits an address that already has a live row in `invited_user`,
which is the whole of "signups are by invitation". Somebody on the roster
makes their own account at `/sign-in?mode=create`; Settings › Users copies
that link, because the app sends no mail (so no verification and no password
reset either).

- **Roles are on the invite, not the user.** `invited_user.role` is one of
  `ROLES` in `src/lib/roles.ts`: owner, admin, member, viewer. It is read
  from the roster on every request (`createTRPCContext`), so a change takes
  effect on the next click, never the next sign-in. Enforcement is three
  procedures and nothing else: `protectedProcedure` refuses a viewer's
  mutations by the procedure's type, `adminProcedure` (invite) admits owners
  and admins, and `ownerProcedure` (role, revoke, restore) admits owners. An
  admin may only invite members and viewers; `assignableRoles` is the one
  list of who may hand out what. A member is "everything that does not
  check". Nobody can revoke or re-role their own row, which is what keeps at
  least one owner in the house. Migration 0007 made everybody already on the
  roster an admin and 0008 made the first owner.
- **Settings is the roster, for now.** `/admin/settings` redirects to
  `/admin/settings/users`, and the rail only offers Settings to owners and
  admins. The tag registry and the search index have procedures
  (`tags.rename`, `tags.remove`, `search.reindex`) but no screen at the
  moment; the General section that held them was taken out and is in the
  history if it is wanted back.

- **Server calls are tRPC.** Routers live in `src/server/trpc/routers`, and
  `src/server/trpc/root.ts` is the one place every endpoint is visible.
  Everything is `protectedProcedure` or `adminProcedure` unless
  `procedures.test.ts` carries a written argument for why it is not, and that
  test fails the build otherwise.
- **The database is Drizzle.** Schema in `src/db/schema.ts`, migrations
  generated with `pnpm db:generate` and applied by hand with `pnpm db:migrate`.
  Never during a build: Vercel builds on every push, so a build-time migration
  would let a preview branch migrate production.
- **Tracked links.** `/u/<ref>` records a click and redirects to
  `/writing/<slug>`. Unknown, revoked and malformed refs all answer 404, so a
  dead link cannot be told apart from one that never existed. There is no open
  tracking and nothing is emailed from here: you copy a link and write the
  message yourself. That is also why there is no `sent_at`: a post went out
  when its first link did, and the list folds that on read.
- **Which clicks count** is decided on read, in `src/lib/bots.ts`, never on
  write. Every hit is stored with its user agent, including the obvious
  scanners, so the heuristic can be improved later without having thrown away
  what it was guessing from.
- **A contact needs a name or an email, not both.** Half the people worth
  remembering were met at a dinner and never gave an address, so `email`
  is nullable and the one-live-contact-per-address index only applies when
  there is one. `title` is their role; the company is the organization.
  `pocs` is who in the house holds the relationship, several allowed.
- **Interactions are a table, not a note.** `interaction` is one row per
  touchpoint (date, topic, summary), written by a person or proposed by the
  assistant through `log_interaction` and applied by a person. `notes` is
  standing context about who somebody is. Both feed the embedding.
- **Tags are names on the contact, backed by a registry.** `contact.tags`
  stays an array of names (every list, filter and embedding reads it);
  `tag` is the registry the picker lists, so a tag can exist before anybody
  has it and be renamed or deleted everywhere (`tags.rename`, `tags.remove`;
  no screen for them at the moment). The contact
  mutations pass tags through `registerTags`, which creates missing ones
  and canonicalizes spelling, so the assistant and bulk paste stay honest.
- **Duplicates are found on read, resolved by hand.** `contacts.duplicates`
  pairs rows by normalized name, phone, a shared alternate address, or a
  trigram-similar name (`pg_trgm`, migration 0006; 0.7 alone, 0.5 at the
  same organization), minus pairs somebody dismissed (`duplicate_dismissal`).
  The embeddings were measured and rejected for this: colleagues with alike
  notes sit closer than one person entered twice. `contacts.twins` is the
  same check for one row, run while a name is typed in the Add sheet and
  for the record a drawer shows. Both return who, never why: the UI shows
  faces and names, no reasons or confidence. `contacts.merge` folds
  one row into another (kept row wins, lists union, the dropped address
  becomes an alternate, interactions and links move) and soft-deletes the
  rest. The Contacts toolbar shows a count when there is anything to look at.
- **Search is hybrid.** cmd-K calls `search.query`, which runs a literal
  `ILIKE` first and then pgvector, in `src/server/search`. Every mutation
  re-embeds its own row through `reindexQuietly`, which never fails the save;
  `search.reindex` rebuilds the rest (no screen for it at the moment). `embedding_text` holds the
  exact text a row was embedded from, so a stale row is visible and a
  re-run is cheap. The model is pinned in `src/server/search/embed.ts`;
  changing it means re-embedding everything.
- **It is dark, and only it is dark.** `__root.tsx` puts `dark` on `<html>`
  for `/admin` and `/sign-in` via `src/lib/admin-theme.ts`. The palette is
  berth's, in the `.dark` block of `styles.css`; the cream tokens above it
  are the public site's and stay put. Portals mount on `<body>`, which is why
  the class is on the root and not on the shell.
- **Its design system is `DESIGN-ADMIN.md`**, not `DESIGN.md`. The short
  version: square everything in the page, no red anywhere, badges only in
  the palette, counts only in table footers, no explanatory copy, floating
  labels for every field, Delete as an outline button left of Save. Where a
  rule can be enforced by a primitive it is: `Button` has no destructive
  variant, `Badge` has no red tone, `PageHead` takes no count.

- **Ask AI never writes.** The drawer at the foot of the rail (⌘J) talks to
  `/api/ai/chat`, a streaming
  route in `src/server/ai`. The model gets read tools that run at once and
  one write tool, `propose_changes`, whose operations (`src/lib/ai-operations.ts`)
  are validated, shown as a card, and applied only when the person presses
  Apply, through `ai.applyProposal`, which runs each one through the ordinary tRPC
  procedure. Adding a capability means adding an operation there, not a tool
  that touches the database. The transcript lives in the browser and is sent
  whole with every request; the server keeps nothing between turns.

Environment: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY` (embeddings; without it search is
text only and the admin says so), `ANTHROPIC_API_KEY` (Ask AI; without it the
page says it is off), `BLOB_READ_WRITE_TOKEN` (photo uploads; without it the
editor says uploads are off). `BETTER_AUTH_URL` is optional and only needed where
Vercel's own URL is wrong.

## Content

Posts are rows in `post`, written in the admin at `/admin/writing` and read at
`/writing/<slug>`. There is no `content/blog` any more and no frontmatter.

- **The body is a ProseMirror document**, not markdown. `doc` is the tree the
  editor saved; `src/components/blog/post-body.tsx` walks it and returns React.
  Not `generateHTML` into `dangerouslySetInnerHTML`: headings carry generated
  anchor ids, links decide their own `target` and `rel`, and photos are a
  component, so an HTML string would mean writing all of that twice.
- **Three fields, three questions**, in `src/lib/post-state.ts`. `status` is
  whether it is live at its URL at all (a draft is a 404 for everybody but a
  signed-in admin, which is what makes the preview work). `visibility` is
  whether it is listed at `/writing`. `kind` is whether it is a letter, and it
  flips: a letter sent in March is a blog post in May if you decide so. All
  three default to the closed answer.
- **A letter is a post with links.** There is no separate `update` table; a
  letter is `kind = 'letter'` and `link.post_id` points at it with
  `on delete restrict`, so a post somebody has been sent cannot be deleted out
  from under its clicks.
- **The slug follows the title while a post is a draft and freezes on
  publish.** The address is in somebody's inbox. The title stays renameable
  forever.
- **`photos` is the only custom node.** Images go to Vercel Blob through
  `/api/upload`; the grid's shape lives in `src/lib/photos.ts` so the editor's
  node view and the public renderer lay it out the same way.
- **The preview is the real page.** `/admin/writing/<id>/preview` is routed
  from `admin_.writing.$id.preview.tsx`: the trailing underscore keeps it out
  of the admin layout, so it renders `PostPage`, grain and all, with a Draft
  bar across the top.
- **Public reads are server functions, not tRPC** (`src/lib/posts-server.ts`),
  so `procedures.test.ts` keeps its "every router procedure is protected"
  invariant without an exception written down for the blog.
