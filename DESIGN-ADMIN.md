# The admin's design rules

`/admin` and `/sign-in` are one product and this is its system. `DESIGN.md`
is the public site's and does not apply here beyond the fonts. Where a rule
below can be enforced by a component, it is: the primitive has no prop for
the thing the rule forbids, so the rule holds the next time somebody adds a
screen without reading this file.

## Palette

- Dark, always. Berth's palette, transcribed in the `.dark` block of
  `src/styles.css`. `__root.tsx` puts `dark` on `<html>` for these routes
  and nowhere else. The cream tokens above it are the public site's.
- One accent (`--primary`, orange). It marks the primary button, the
  in-conversation status, and a semantic-search hit. Not focus, not borders,
  not the rail.
- **No red.** There is no destructive button, menu row, badge tone or status
  colour. Delete is an outline button with a trash icon; the confirm dialog
  behind it carries the weight. "Passed" and "revoked" are muted text. The
  `--destructive` token exists for error toasts and invalid fields only.
- Focus is a brighter neutral edge (`--input-focus`), never the accent.

## Shape

- Square in the page: buttons, inputs, selects and their lists, comboboxes,
  the search-or-filter box and its panel, tables, kbd, in-page cards,
  sheets, alert dialogs, toasts.
- **Badges, chips and tabs are pills** (`rounded-full`), the way Ramp's are:
  they are labels that sit on a row, not controls that sit in the page. A
  filter chip is two-tone: icon and label on the pill, the value in a darker
  inner pill, a cross to clear.
- Rounded only when floating over the page from a rounded trigger: the ⌘K
  palette and the topbar search that opens it, dropdown and right-click
  menus, tooltips. Rail rows keep shadcn's small radius. Icon buttons and
  avatars are circles.
- Badges are berth's tones: a deep fill of the hue under a pale ink of it,
  no border. They appear in the ⌘K palette only. A table cell shows status
  as coloured text (`StatusText`, `Tinted`), never a chip.

## Layout

- Rail on the left (navigation only, XII wordmark, collapses to an icon
  strip where the wordmark gives way to the expand control on hover). Topbar
  across the content: centred search, account on the right. The page starts
  under both with 40px above a 32px title.
- Every list page is: `PageHead` (title, optional meta, actions, optional
  toolbar), `PageScroll` holding a `ListTable`, then `TableFoot`.
- **Counts live in `TableFoot` and nowhere else.** Not in titles, not in
  tabs, not in section headings.
- The toolbar is `FilterBar`: a real text field that narrows the list as you
  type, with a panel under it for filters and chips beside it for what is
  applied. Search stays in the field; the panel never holds an input.
- Tables are full-bleed with ruled columns and a sticky header. The outer
  cells carry the page gutter (32px) so the first column aligns with the
  title. Rows open on click and offer more on right-click (`RowMenu`).
- The active rail row is brighter text. Nothing else lights up.

## Copy

- No explanatory text. No page subtitles that explain the page, no sheet
  descriptions that explain the form, no keyboard hints, no "add one to get
  started". Empty states are two words. Titles and controls only.
- Confirm dialogs keep their consequence sentence: that is a warning, not
  documentation.
- Toasts report outcomes in a few words. Errors get the server's message.

## Forms

- Every field is a floating-label field from `ui/floating-field`:
  `FloatingInput`, `FloatingTextarea`, `FloatingSelect` for a closed list,
  `FloatingCombobox` (searchable) for anything that grows. There is no
  stacked label primitive, on purpose.
- 56px fields, 14px text, 16px gap, two columns in a drawer with notes
  spanning both.

## Drawers

- 720px sheet. Title 24px, 32px gutters, sections 40px apart under an
  11px caps heading. A section's control (an Add button) sits at the
  heading's trailing edge.
- Footer is right-aligned: `[Delete] [Save]`. Delete is outline with a trash
  icon; Save is the primary button and is disabled until something changed.
- Closing with edits asks "Discard changes?" (`useUnsavedGuard`). Every
  drawer and every "new" sheet uses it.
- One scrim at a time: an alert raised from a drawer dims page and drawer
  together (see the `body:has` rule in `styles.css`).

## Controls

- Button default is 40px (`h-10`). `sm` 32, `xs` 28, `2xs` 24, `lg` 44.
  Icon sizes match. Page actions use the default; rows and toolbars use
  `sm` or `xs`.
- Menus and the palette are the only surfaces with a radius. Palette rows
  are `rounded-md` like rail rows; rows inside a field's popover are square.

## Search

- ⌘K is hybrid: literal `ILIKE` first, then pgvector, from
  `src/server/search`. Results carry a similarity and the palette shows it.
- Every mutation re-embeds its own row through `reindexQuietly`, which never
  fails the save. Settings has a rebuild button for the rest.
