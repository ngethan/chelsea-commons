# Agent conventions

Project context lives in `PRODUCT.md` (audiences, purpose, principles) and
`DESIGN.md` (the design system). This file is the short list of rules that are
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

## Content

Posts are markdown files in `content/blog`, rendered at `/writing/<filename>`.
The frontmatter decides whether a post is listed. `visibility: public` lists it
at `/writing`; anything else, including a typo, stays private and noindex. See
`content/blog/README.txt` for the full frontmatter contract and
`src/lib/markdown-blocks.ts` for the custom fenced blocks the renderer adds on
top of ordinary markdown.
