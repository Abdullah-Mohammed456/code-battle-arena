import { useEffect } from "react";

export function MotionEffects({
  enabled,
  routeKey,
}: {
  enabled: boolean;
  routeKey: string;
}) {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let cleanup = () => {};
    void Promise.all([
      import("gsap"),
      import("lenis"),
      import("gsap/ScrollTrigger"),
    ])
      .then(([{ gsap }, { default: Lenis }, { ScrollTrigger }]) => {
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);

        const lenis = enabled
          ? new Lenis({ lerp: 0.1, smoothWheel: true })
          : undefined;
        const tick = lenis ? (time: number) => lenis.raf(time * 1000) : null;
        if (tick) {
          lenis?.on("scroll", ScrollTrigger.update);
          gsap.ticker.add(tick);
          gsap.ticker.lagSmoothing(0);
          lenis?.scrollTo(0, { immediate: true });
        }

        const content = document.querySelector<HTMLElement>(".route-content");
        const context = content
          ? gsap.context(() => {
              gsap.fromTo(
                content,
                { autoAlpha: 0, y: 14 },
                { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" },
              );
              gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((item) =>
                gsap.fromTo(
                  item,
                  { autoAlpha: 0, y: 24 },
                  {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.65,
                    ease: "power3.out",
                    scrollTrigger: {
                      trigger: item,
                      start: "top 88%",
                      once: true,
                    },
                  },
                ),
              );
            }, content)
          : undefined;

        const dot = document.querySelector<HTMLElement>(".cursor-dot");
        const ring = document.querySelector<HTMLElement>(".cursor-ring");
        if (!matchMedia("(pointer: fine)").matches || !dot || !ring) {
          cleanup = () => {
            context?.revert();
            ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
            if (tick) {
              gsap.ticker.remove(tick);
              gsap.ticker.lagSmoothing(500, 33);
              lenis?.destroy();
            }
          };
          return;
        }

        document.body.classList.add("has-cursor");
        gsap.set([dot, ring], { xPercent: -50, yPercent: -50 });
        const dotX = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power3" });
        const dotY = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power3" });
        const ringX = gsap.quickTo(ring, "x", {
          duration: 0.32,
          ease: "power3",
        });
        const ringY = gsap.quickTo(ring, "y", {
          duration: 0.32,
          ease: "power3",
        });
        const ringScale = gsap.quickTo(ring, "scale", {
          duration: 0.2,
          ease: "power2.out",
        });
        const onMove = (event: PointerEvent) => {
          const target = event.target;
          const textField =
            target instanceof Element &&
            target.closest(
              "input, textarea, select, [contenteditable='true'], .cm-editor",
            );
          dot.style.opacity = textField ? "0" : "1";
          ring.style.opacity = textField ? "0" : "1";
          dotX(event.clientX);
          dotY(event.clientY);
          ringX(event.clientX);
          ringY(event.clientY);
          const element = target instanceof Element ? target : null;
          ringScale(
            element?.closest(".cl-rootBox")
              ? 1.8
              : element?.closest("a, button, [role='button']")
                ? 1.6
                : 1,
          );
        };
        const onLeave = () => {
          dot.style.opacity = "0";
          ring.style.opacity = "0";
        };
        const onOver = (event: PointerEvent) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const interactive = target.closest<HTMLElement>("a, button");
          if (interactive && matchMedia("(pointer: fine)").matches)
            gsap.to(interactive, {
              y: -2,
              duration: 0.2,
              ease: "power2.out",
              overwrite: true,
            });
        };
        const onOut = (event: PointerEvent) => {
          const target = event.target;
          if (!(target instanceof Element)) return;
          const interactive = target.closest<HTMLElement>("a, button");
          if (
            interactive &&
            !(
              event.relatedTarget instanceof Node &&
              interactive.contains(event.relatedTarget)
            )
          )
            gsap.to(interactive, {
              y: 0,
              duration: 0.28,
              ease: "power3.out",
              overwrite: true,
            });
        };
        window.addEventListener("pointermove", onMove);
        document.addEventListener("pointerover", onOver);
        document.addEventListener("pointerout", onOut);
        document.documentElement.addEventListener("pointerleave", onLeave);
        cleanup = () => {
          window.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerover", onOver);
          document.removeEventListener("pointerout", onOut);
          document.documentElement.removeEventListener("pointerleave", onLeave);
          dot.style.opacity = "0";
          ring.style.opacity = "0";
          document.body.classList.remove("has-cursor");
          context?.revert();
          if (tick) {
            gsap.ticker.remove(tick);
            gsap.ticker.lagSmoothing(500, 33);
            lenis?.destroy();
          }
          ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
        };
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [enabled, routeKey]);

  return (
    <>
      <span className="cursor-ring" aria-hidden="true" />
      <span className="cursor-dot" aria-hidden="true" />
    </>
  );
}
