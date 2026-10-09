# DESIGN.md

Look and feel for the web client. The primary reference is https://serious-job-517948.framer.app/: quiet, typographic, very smooth. This file records the direction and what must still be measured. Do not guess values; extract them.

References from the owner:

- https://serious-job-517948.framer.app/ (primary, confirmed 2026-10-10)

- https://lenis.dev/
- https://lenis.dev/templates
- the Framer project "lenis-framer-website-copy"

## What the owner wants

- All UI copy is English only.
- Same colors, same smoothness, same background and cursor animation feel as the reference, built with GSAP and Lenis.
- Nothing that reads as generic AI output: no purple gradients, no neon glow, no default dark-with-accent template, no emojis in the UI.
- Fewer, larger, more deliberate elements.

## Scope of "exactly like"

Reproduce the system: scroll feel, easing, type scale, spacing rhythm, color palette, cursor behavior, background behavior, page transitions. Do not copy the reference's content: its text, logos, videos, showcase assets, or the Lenis and darkroom.engineering names. Those belong to their authors, and a portfolio piece is stronger when it is clearly its own thing built with the same craft.

## What is known so far

The published Framer reference was inspected in the browser on 2026-10-10.

- Black canvas with pink display lettering and controls, white supporting text, and a shaded background.
- Oversized display artwork and short labels; exact font families and sizing are not measured yet.
- The old black-and-white assumption was based only on metadata and is superseded by the owner's published reference.
- The demo controls and donation modal belong to the Lenis demo, not to this product.

Exact color values, fonts, breakpoints, easing, cursor and background implementation remain unmeasured. Extract them in M5 before building the design system. The M0 page is a boot check only.

## Extraction task (do this before building the UI)

Use the browser DevTools, or a Playwright script the agent writes, against the live site. Record real values into the table below.

1. Colors: `getComputedStyle` for `body`, headings, links, buttons, borders; list every distinct color on the page and where it is used.
2. Fonts: family, weights, sizes, line heights, letter spacing for `h1`, `h2`, body, nav, labels. Identify the font files in the Network tab; check licenses and pick the same family if it is free (Google Fonts or open source), otherwise the closest free match.
3. Layout: container max width, grid columns, gutters, section padding at 1440, 1024, 390 px widths.
4. Motion: scroll duration and easing (read Lenis options in use), hover transitions, reveal animations (duration, ease, stagger, trigger points). Measure with the Performance panel or by frame-stepping a screen recording.
5. Cursor: shape, size, blend mode, follow delay, hover states.
6. Background: what it is (CSS, canvas, WebGL), what drives it (time, scroll, pointer), colors, speed.
7. Screenshots at 1440 and 390 for every section, saved under `docs/reference/` for the agent to compare against.

The owner can also send screenshots and screen recordings to the assistant to speed this up.

## Tokens (fill after extraction)

| Token            | Value | Source / note                                            |
| ---------------- | ----- | -------------------------------------------------------- |
| `--bg`           | TBD   |                                                          |
| `--fg`           | TBD   |                                                          |
| `--muted`        | TBD   |                                                          |
| `--line`         | TBD   |                                                          |
| `--accent`       | TBD   | may not exist; the reference may be pure black and white |
| `--font-display` | TBD   |                                                          |
| `--font-body`    | TBD   |                                                          |
| `--font-mono`    | TBD   | for code only                                            |
| type scale       | TBD   |                                                          |
| `--space-*`      | TBD   |                                                          |
| `--ease-main`    | TBD   |                                                          |
| `--dur-*`        | TBD   |                                                          |

Verdict colors are needed for the product (AC, WA, TLE, MLE, RE, CE, IE). Keep them desaturated and in the same family as the palette, and always pair color with an icon and a label.

## Page map

| Route                  | Scroll | Notes                                                                                                             |
| ---------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `/` landing            | Lenis  | Hero with large type, scroll hint, numbered "how it works" list, problem index teaser, live battle teaser, footer |
| `/problems`            | Lenis  | Editorial index: large rows, hover preview, filters as text toggles, progress marks                               |
| `/problems/:slug`      | native | Workspace: statement, editor, results. Functional first                                                           |
| `/battle`              | Lenis  | Lobby: create, join by code, queue                                                                                |
| `/battle/:id`          | native | Room: timer, opponents, editor, results                                                                           |
| `/profile`             | Lenis  | Rating, progress, history                                                                                         |
| `/sign-in`, `/sign-up` | native | Clerk components with matching `appearance`                                                                       |

Copy is written by the owner or marked `[copy]` in the UI until provided. Do not invent marketing text.

## Components

Buttons (text-first, thin outline or filled, no shadows), links with animated underline, tags, inputs, tabs, verdict badge, problem row, results list, timer, rating delta, empty and error states. Each has default, hover, focus-visible, disabled and loading states.

## Accessibility

- Focus rings always visible, never removed.
- Contrast AA in every state, including verdict colors.
- Custom cursor hidden on touch and when `prefers-reduced-motion` is set; the native cursor stays for text inputs and the editor.
- All motion has a reduced-motion version: no parallax, no long reveals, instant transitions.
- Real buttons and links, labels on inputs, keyboard path through every flow.

## Responsive

Desktop first for the workspace and battle (they are keyboard heavy). Landing and lists must work well at 390 px. The editor on phones is usable but not a priority.

## Review checklist per screen

- [ ] Matches the extracted tokens, no one-off values
- [ ] Holds at 1440, 1024, 390
- [ ] Reduced motion tested
- [ ] 60fps while scrolling and animating (Performance panel)
- [ ] Looks specific to this product, not like a template
