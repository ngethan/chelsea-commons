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
to, the investor updates that have gone out, and who can sign in. It is behind
Google, and Google only admits an address that already has a live row in
`invited_user`, which is the whole of "signups are disabled".

- **Server calls are tRPC.** Routers live in `src/server/trpc/routers`, and
  `src/server/trpc/root.ts` is the one place every endpoint is visible.
  Everything is `protectedProcedure` unless `procedures.test.ts` carries a
  written argument for why it is not, and that test fails the build otherwise.
- **The database is Drizzle.** Schema in `src/db/schema.ts`, migrations
  generated with `pnpm db:generate` and applied by hand with `pnpm db:migrate`.
  Never during a build: Vercel builds on every push, so a build-time migration
  would let a preview branch migrate production.
- **Tracked links.** `/u/<ref>` records a click and redirects to
  `/writing/<slug>`. Unknown, revoked and malformed refs all answer 404, so a
  dead link cannot be told apart from one that never existed. There is no open
  tracking and nothing is emailed from here: you copy a link and write the
  message yourself.
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
- **Duplicates are found on read, resolved by hand.** `contacts.duplicates`
  pairs rows by normalized name, phone, or a shared alternate address, minus
  pairs somebody dismissed (`duplicate_dismissal`). `contacts.merge` folds
  one row into another (kept row wins, lists union, the dropped address
  becomes an alternate, interactions and links move) and soft-deletes the
  rest. The Contacts toolbar shows a count when there is anything to look at.
- **Search is hybrid.** cmd-K calls `search.query`, which runs a literal
  `ILIKE` first and then pgvector, in `src/server/search`. Every mutation
  re-embeds its own row through `reindexQuietly`, which never fails the save;
  Settings has a rebuild button for the rest. `embedding_text` holds the
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
page says it is off). `BETTER_AUTH_URL` is optional and only needed where
Vercel's own URL is wrong.

## Content

Posts are markdown files in `content/blog`, rendered at `/writing/<filename>`.
The frontmatter decides whether a post is listed. `visibility: public` lists it
at `/writing`; anything else, including a typo, stays private and noindex. See
`content/blog/README.txt` for the full frontmatter contract and
`src/lib/markdown-blocks.ts` for the custom fenced blocks the renderer adds on
top of ordinary markdown.
