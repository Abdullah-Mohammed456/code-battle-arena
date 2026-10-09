# MOTION.md

Smooth scroll, cursor and background. All of it lives in `apps/web/src/motion/`.

## Smooth scroll: Lenis + GSAP

Lenis drives scroll; GSAP's ticker drives Lenis, so ScrollTrigger and Lenis share one frame loop. This is the pattern from the Lenis docs.

```ts
import Lenis from "lenis";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function startLenis() {
  const lenis = new Lenis({ autoRaf: false });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}
```

Rules:

- Create one instance in a provider and destroy it on unmount.
- Turn Lenis off on workspace routes (problem page, battle room). CodeMirror, result panels and split panes have their own scrolling. For a nested scrollable area inside a Lenis page, put `data-lenis-prevent` on it.
- Skip Lenis entirely when `prefers-reduced-motion: reduce`.
- Tune `lerp` or `duration` and `easing` to the values extracted in `docs/DESIGN.md`. Do not leave defaults unless they match the reference.
- Anchor links and route changes use `lenis.scrollTo`, and reset to the top on navigation.

## Cursor

A small element that follows the pointer with GSAP `quickTo`, and reacts to elements marked with `data-cursor`.

```ts
export function startCursor(el: HTMLElement) {
  const x = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3" });
  const y = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3" });
  window.addEventListener("pointermove", (e) => {
    x(e.clientX);
    y(e.clientY);
  });
}
```

- Duration and ease come from the extraction, not from this snippet.
- Hover states: scale, label, or blend mode change on links, buttons and `data-cursor` targets.
- Disabled on touch (`(pointer: coarse)`), on reduced motion, and over the editor and inputs.
- `pointer-events: none` on the cursor element. Position with transforms only.

## Background

The background type is decided after extraction. Until then, build the simplest version that can be swapped: a full-screen `<canvas>` behind the content.

Implementation rules whatever the final look is:

- One canvas, one `requestAnimationFrame` via `gsap.ticker`, not a second loop.
- Cap device pixel ratio at 2. Resize with `ResizeObserver`.
- Pause when the tab is hidden and when the canvas is off screen.
- Do not run on the workspace and battle routes (the editor needs the frame budget). Use a flat color there.
- If it needs shaders, use `ogl` (small) instead of three.js.
- Static fallback for reduced motion and low power devices.

## Reveals and page transitions

- Reveals: GSAP with ScrollTrigger, `once: true`, small distances, short durations. Prefer transform and opacity only.
- Page transition: a short fade or wipe between routes, under 600 ms total, never blocking input. Use `useGSAP` and clean up on unmount.
- Never animate layout properties (`width`, `height`, `top`). Never animate while data is loading; show the skeleton first.

## React integration

- `useGSAP` from `@gsap/react` for scoped animations with automatic cleanup.
- Refs, not `document.querySelector`, inside components.
- Register plugins once in `motion/index.ts`.

## Performance budget

- 60fps on a mid-range laptop while scrolling the landing page.
- No long tasks over 50 ms during animation.
- Motion code under 15 KB gzip beyond the libraries.
- Check with the Performance panel before merging any motion change.

## Tasks (see `PLAN.md` M5)

- [ ] `startLenis` wired in a provider, with route-based enable and disable
- [ ] Cursor with hover states and fallbacks
- [ ] Background canvas with pause, resize, fallback
- [ ] Route transition
- [ ] Reduced motion pass
