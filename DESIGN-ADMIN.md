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
  the search-or-filter box and its panel, tables, in-page cards, sheets,
  alert dialogs, toasts. Two small things carry a 3px radius: the checkbox,
  which also has no fill and a heavier, brighter edge than a field, because
  a 16px outline needs all three to read as a box on a row; and `Kbd`,
  because a key cap is a rounded thing.
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
- While a list loads, `RowsSkeleton` is handed the row's cells by kind
  (tick, person, text, mono, number, date, faces, pills), each with the
  real cell's responsive classes. It draws the shape at the height the
  real thing will take, so the table does not jump when the rows land.
- Skeletons take the shape of what they stand in for, not the page's
  squareness. A line of text or a heading is a rounded bar (`Skeleton`'s
  default), a face is a circle, a pill is a pill, a checkbox is a 16px box
  with the checkbox's own radius and edge. Only a skeleton for something
  square in the page (a field, a button) is square.
- A page under another page (a post under Writing) passes `crumbs` to
  `PageHead`: small muted links above the title with a chevron between,
  ending in the page being read as plain text (its slug or name). Drawers
  are not pages and get no crumbs.
- Password fields are `FloatingPassword`: one eye at the trailing edge, and
  a form with two of them (new and confirm) runs both from one eye.
- Settings is one page with sections, and every section renders
  `SettingsHead`: the one title, the section's own control (Invite, Connect)
  as its action, and pills in the toolbar once the reader has more than one
  section to choose between. A member sees only Integrations, so no pills.
- **Counts live in `TableFoot` and nowhere else.** Not in titles, not in
  tabs, not in section headings.
- The toolbar is `FilterBar`: a real text field that narrows the list as you
  type, with a panel under it for filters and chips beside it for what is
  applied. Search stays in the field; the panel never holds an input.
- Tables are full-bleed with ruled columns and a sticky header. The outer
  cells carry the page gutter (32px) so the first column aligns with the
  title. Rows open on click and offer more on right-click (`RowMenu`).
- A selection column (`data-tick`) is 48px (40 on a phone) with the 16px
  box centred, the same on every table. It is a control, not text, so it
  does not start on the gutter line the title does.
- Sized columns are `ColumnHead` with widths from `useColumnWidths`; the
  first column is `FillHead`, has no width, and takes the rest. Every rule
  between two columns has a grip: dragging it moves that rule, and the two
  columns either side trade width. Nothing else moves and the table stays
  the page's width. Double-click a grip to put both columns back. Widths
  are per table, per browser, and never on the server.
- A cell that does not fit is cut with an ellipsis, never wrapped
  (`ListTable` sets this on every cell). A narrow column costs width, not
  row height.
- A date or number column sorts on click: its `ColumnHead` takes
  `sort={sorting.on(key)}` from `useSort`, and the rows go through
  `sortRows`. First click is most first (newest, largest), the second is
  the other way, the third is the list's own order. An arrow marks the
  column in force. The choice is in the URL as `sort`, beside the filters.
  Text columns do not sort; the search field is for finding a name.
- The active rail row is brighter text. Nothing else lights up.
- A face is as tall as the text beside it. `PersonAvatar` is `xs` or `sm`
  next to one line, `md` next to a table row's name with a line under it,
  `xl` next to a drawer head's title with its description. Never a small
  face pinned beside a two-line block.

## Copy

- No explanatory text. No page subtitles that explain the page, no sheet
  descriptions that explain the form, no keyboard hints, no "add one to get
  started". Empty states are two words. Titles and controls only.
- No reasons either. A duplicate is listed, not argued ("same name",
  "likely"); a warning shows who, not why. The person reading can tell.
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
- A check in a menu or picker sits at the trailing edge, after the label
  and any count. Nothing is indented to leave room for it: every row's
  label starts at the same edge whether or not it is chosen.

## Search

- ⌘K is hybrid: literal `ILIKE` first, then pgvector, from
  `src/server/search`. Results carry a similarity and the palette shows it.
- Every mutation re-embeds its own row through `reindexQuietly`, which never
  fails the save. `search.reindex` rebuilds the rest.
