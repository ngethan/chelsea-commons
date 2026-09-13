# Writing in the admin

Posts move out of `content/blog` and into the database, and the admin gets a
screen for writing them. The editor is TipTap over ProseMirror JSON, so the
stored document is a tree rather than markdown text, and `update` is folded
into the post row it was always pointing at.

This is a plan, not a record. Delete it once the work is in and fold whatever
survived into `AGENTS.md`.

## What this replaces

Today a post is a markdown file inlined at build time by `import.meta.glob` in
`src/lib/posts.ts`, parsed with `front-matter`, split on custom fences by
`src/lib/markdown-blocks.ts`, and rendered by Streamdown through the component
map in `src/components/blog/markdown-content.tsx`. `posts-server.ts` exists
only so that build-time inlining cannot ship a private letter's text to a
browser that did not ask for it.

All five files are test content, every one of them `visibility: private`, so
`/writing` has never listed anything and the public post chrome has never
rendered for a real reader. Nothing here is protecting live traffic.

## The decisions, and why

**ProseMirror JSON, not markdown.** The cost is real: Streamdown,
`markdown-blocks.ts`, `extractHeadings`, `front-matter` and the fence parser
all stop being the reading path, and the public page gets a new renderer. The
reason to pay it is that a person who does not write markdown should be able
to write a letter.

**Two axes, not one.** `status` says whether a post is live at its URL at all;
`visibility` says whether it appears at `/writing`. A draft is a 404 for
everyone. `published` plus `private` is the investor letter, unlisted and
noindex, which is the only thing this system has ever actually done.
`published` plus `public` is a blog post. Collapsing these into one enum would
make "an unlisted letter that is not finished yet" unrepresentable, which is
the state every letter is in the hour before it goes out.

**`kind` flips.** A letter can become a public post later. That is why there is
one screen with a filter rather than two screens partitioned by kind: a row
that can move between lists should not have its home decided at creation time.

**`update` is gone.** Once a post is a row, `update` was `id + slug + title`
where all three already existed on the post, with a unique slug making it one
to one. `link` now references the post directly. This is safe to do in one pass
because the link and click rows are test data.

**No `sent_at`.** Nothing here emails anything: you mint `/u/<ref>` links and
write the message yourself. So "sent" is `min(link.created_at)`, folded on
read the way recipient and open counts already are in `updates.list`. A stored
column would be a second truth about the same event with nothing enforcing it.

**Slug frozen on publish.** It follows the title while the post is a draft,
with a manual override, and locks when the post goes live. Title stays freely
renameable forever. Substack and Medium freeze; WordPress and Ghost let you
change it and hand you the redirect problem. With no public readers there is
nothing to redirect, and a redirect table is a feature to add the day there is.

**`photos` is the only custom node.** `cards` and `partners` and `moonshots`
each appear in zero or one test posts, and the one post that used the last two
is being deleted. A node type is cheap to add against a real need and expensive
to design against an imagined one. `src/lib/partner-logos.ts` stays: the
marketing strips read it, not just the blog.

**No AI.** Most of what an AI assist was wanted for here is a slash menu and
drag handles, which TipTap ships and which are instant, deterministic and free.
A model that mutates a ProseMirror document needs valid transactions and a
structural diff to review, and a bad output corrupts the post rather than
producing a bad sentence. Revisit once the editor has been used for a month.

## Schema

New `post` table in `src/db/schema.ts`:

```
id            uuid pk
slug          text unique not null      frozen once published_at is set
name          text not null             renameable forever
description   text                      nullable; falls back to the opening prose
subtitle      text                      the small caps line on a letter
doc           jsonb not null            the ProseMirror document
status        text not null             'draft' | 'published'
visibility    text not null             'public' | 'private', default 'private'
kind          text not null             'post' | 'letter', flippable
published_at  timestamptz               null while draft; editable after, so a date can be fixed
date_label    text                      overrides the rendered date, for "Sep 2026"
created_at    timestamptz not null      when writing started
updated_at    timestamptz not null
created_by    text -> user.id
...embeddingColumns
```

Defaults fail closed, the way `parsePost` does today: a new post is
`draft` and `private`, and only an explicit publish changes that.

`post_revision`: `id`, `post_id` (cascade), `doc`, `name`, `created_at`,
`created_by`. Written on publish and nowhere else for now. A handful of rows
per post, not thousands.

`link.update_id` becomes `link.post_id`, referencing `post` with
`on delete restrict`, so the database refuses to delete a post somebody has
been sent. `one_link_per_contact_per_update` becomes
`one_link_per_contact_per_post`. The `update` table and
`update_embedding_idx` are dropped.

Migration `0009_posts.sql`, hand-written and applied with `pnpm db:migrate`.
Never at build time: Vercel builds every push and a preview branch would
migrate production.

Hand-written rather than generated because the snapshots in `drizzle/meta/`
stop at `0005`: `0006` through `0008` were written by hand too, so
`db:generate` would diff against a schema three migrations stale.

## Server

**Public reads stay server functions, not tRPC.** `src/lib/posts-server.ts`
keeps its shape and changes its implementation from a filesystem read to a
database query. Two reasons. The invariant `procedures.test.ts` enforces is
that every router procedure is protected unless somebody wrote down why, and a
public posts router would be the second entry in that list forever. And the
comment at the top of that file stays true for a better reason than before:
a private letter's text is now never anywhere near the client bundle, because
it is a row fetched by slug.

`fetchPost` returns a post only when `status = 'published'`, or when the caller
has an admin session (that is what makes the preview route work). `fetchPublicPosts`
returns summaries where `status = 'published' and visibility = 'public'`.

**`postsRouter`** in `src/server/trpc/routers/posts.ts`, all `adminProcedure`
except `list` and `byId`, which are `protectedProcedure` so members can read:

```
list       filter: all | posts | letters | drafts
byId
create
update     autosaved; bumps updated_at
publish    snapshots a revision, sets status and published_at, freezes slug
unpublish  back to draft; the URL starts 404ing
remove     refused when the post has links (the restrict, surfaced as a message)
revisions  list, and restore
```

Every mutation calls `reindexQuietly` like the rest of the app, so posts are
findable in cmd-K. `embedding_text` is the title, description and the document
flattened to plain text.

**`updatesRouter` is deleted.** `availablePosts` goes with it: you never pick a
post out of a list again, you tick a box on the post you just wrote.
`linksRouter` takes `postId` instead of `updateId`. `contacts.ts` has two joins
through `update` to repoint, including the one in the delete path.
`search/index.ts` has five references to move from `update` to `post`.
`list_posts` in `src/server/ai/read-tools.ts` becomes a query over `post` left
joined to `link`. `create_update` and `remove_update` in
`src/lib/ai-operations.ts` become `mark_as_letter` and `unmark_as_letter`, or
are dropped if the assistant has no reason to reach for them.

## Editor

TipTap with StarterKit, minus what the renderer does not support, plus:

- A `photos` node holding an array of `{ src, alt }`, with a node view that
  uploads on drop or paste and shows the grid as it will render.
- A slash menu for inserting headings, lists, quotes, rules and photos.
- Drag handles for reordering blocks.
- Autosave on a ~2s debounce with a quiet "Saved" indicator.

The form fields around it are floating-label fields from `ui/floating-field`
per `DESIGN-ADMIN.md`: name, description, subtitle, slug, date label. Status,
visibility and kind are `FloatingSelect`. Ticking kind to `letter` forces
`visibility: private` and greys the control, because a letter listed on the
public blog is a mistake, not a choice. Unticking it is refused once links
exist.

## Public renderer

`renderNode(node)` walks the JSON and returns React, mirroring today's
`streamdownComponents` object almost line for line: generated anchor ids on
h1 and h2, `target` and `rel` on external links, the `--semi-foreground` var on
`strong`, the serif blockquote, and `PhotoGrid` for the photos node. Keep
`generateSlug` exactly as it is so heading anchors match what any existing link
points at.

The table of contents becomes a walk over `heading` nodes rather than a regex
over markdown, producing the same slugs.

One `PostBody` component, rendered by both `/writing/$slug` and the admin
preview. If those two render separate copies of the layout they will drift, and
the way you find out is from a recipient.

## Admin screens

`Updates` leaves the rail and `Writing` takes its place. One list page, the
standard shape: `PageHead` with a `FilterBar` offering all, posts, letters and
drafts, a `PageScroll` holding a `ListTable`, and counts in `TableFoot` and
nowhere else. Columns: name, kind, status, visibility, updated. A letter row
also shows recipients and opens, folded from links on read exactly as
`updates.list` does today.

The editor is a page under it, with `crumbs` back to Writing. Recipients and
minting links live in a section on that page for letters, which is what
`/admin/updates/$id` does now.

Preview is a full-bleed route at `/admin/writing/$id/preview` that escapes
`AdminShell` and renders `PostBody` in the real public layout, grain and all.
A fixed bar at the top says Draft when the post is not published, so a preview
can never be mistaken for the live page. A preview pane inside the admin shell
would be 240px narrower, differently scaled and missing the grain, which is a
preview you cannot trust.

## Images

Vercel Blob for storage, which is already on a global edge CDN, so there is no
CDN to build. An `images` block in `vercel.json` with `remotePatterns` for the
blob host turns on Vercel's image optimization, and `@unpic/react`, already in
`package.json` and currently unused, emits the `srcset` for it. Today's
`PhotoGrid` renders a bare `<img>` with no optimization at all, so this is
strictly better than the thing it replaces.

`BLOB_READ_WRITE_TOKEN` joins the environment list in `AGENTS.md`.

## The converter

A throwaway script in `scripts/` that reads `content/blog/*.md` and writes post
rows. It handles prose and one fence type, because `partners` and `moonshots`
are being deleted with the letter that used them and `cards` was never used.
Run it, read the five posts against the current site, then delete the script in
the same PR. Watch for smart quotes, the `\-` escape in `raising-a-fund.md`,
and hard line breaks, which are where a converter damages things quietly.

`to-our-collaborators.md` is not migrated. It is an old letter and it is the
only user of the two blocks being dropped.

## Deletions

- `content/blog/` and `content/blog/README.txt`
- `src/lib/posts.ts`, `src/lib/posts.test.ts`, `src/lib/markdown-blocks.ts`,
  `src/lib/markdown-blocks.test.ts`, `src/lib/post-path.ts`
- `src/components/blog/markdown-content.tsx`, replaced by `PostBody`
- `src/routes/admin.updates.tsx`, `src/routes/admin.updates.$id.tsx`
- `src/server/trpc/routers/updates.ts`
- `front-matter` from `package.json`

Streamdown stays: `src/components/admin/ask/chat.tsx` renders the assistant's
replies with it. `partner-logos.ts` stays: the marketing strips read it.

`AGENTS.md` needs its Content section rewritten, its tracked-links bullet
updated, and `DESIGN-ADMIN.md` needs its "an update under Updates" example
changed to a post under Writing.

## Order

1. ~~Schema, migration, `postsRouter`, and the converter.~~ Done.
2. ~~Repoint `link`, `contacts`, `search/index.ts` and the AI read tools.
   Delete `updatesRouter`.~~ Done.
3. ~~`PostBody`. Point `/writing/$slug` and `/writing/` at the database.~~ Done.
4. ~~Blob upload and the `photos` node view.~~ Done.
5. ~~The editor page, the list page, the preview route. Drop `Updates` from the
   rail.~~ Done.
6. ~~Docs.~~ Done.

What is left is the part that needs a database and a person looking at it:

7. `pnpm db:migrate`, then `node --env-file=.env.local scripts/import-blog.mjs`.
8. Read the four imported posts against the current site. Watch the smart
   quotes, the `\-` that opens `raising-a-fund`, and the two `photos` blocks.
9. Set `BLOB_READ_WRITE_TOKEN` and add the `images` block to `vercel.json`,
   then drop a photo into a post to check the upload path end to end.
10. Delete `content/blog`, `src/lib/posts.ts`, `posts.test.ts`,
    `markdown-blocks.ts`, `markdown-blocks.test.ts`, `post-path.ts`,
    `markdown-content.tsx`, `scripts/import-blog.mjs`, and `front-matter` from
    `package.json`. Nothing imports any of them now except their own tests.

## Not in v1

- Any AI in the editor
- `cover_image_url` and per-post OG images. Nothing is public, so nothing
  shares. One column and one line in `buildSeoTags` when something is.
- Scheduled publishing. The cron exists (`api/cron/sync-events`), so it is
  possible, but it is a feature and not a default.
- A `post_slug` redirect table. Needed the day a published URL has to move.
- `cards`, `partners` and `tiles` nodes.
- A trash can. Delete is a hard delete behind a confirm, refused when links
  exist. WordPress has a trash because it has many authors; this has three.
