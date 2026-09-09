Posts.

Every markdown file in this directory is a post, rendered at /writing/<filename>.
The frontmatter block at the top decides how it behaves:

  name        required  the title, shown on the page and in the index
  description required  one line, used as the index blurb and the meta tag
  visibility  required  "public" lists it at /writing; "private" does not
  date        required  "Sep 2026"; orders the index
  subtitle    optional  small label under the title, for letters
  tags        optional  shown in the index when present
  readTime    optional  shown in the index when present

Only the exact string "public" publishes. Missing, misspelled, or any other
value is treated as private, so a typo fails closed.

A private post still renders for anyone with its URL. It is unlisted and
noindex, not access controlled, which is what makes it usable as the landing
page for a tracked investor update (see /admin/updates). Private posts also drop
the blog chrome: no back link into an index they are not in, and no share
buttons.

Beyond ordinary markdown, the renderer understands four fenced blocks:
partners, moonshots, cards, photos. See src/lib/markdown-blocks.ts.
