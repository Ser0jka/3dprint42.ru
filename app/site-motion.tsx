"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const animatedContentSelector = [
  "main > section:not(#start) h2",
  "main > section:not(#start) article",
  "main > section:not(#start) figure",
  "main > section:not(#start) ol > li",
  "main > section:not(#start) [role='row']",
  "main > section:not(#start) details",
  "main > div > section h2",
  "main > div > section article",
  "main > div > section figure",
  "main > div > section ol > li",
  "main > div > section [role='row']",
  "main > div > section details",
].join(",");

const pageSectionSelector =
  "main > section:not(#start), main > div > section";

export default function SiteMotion() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let cancelled = false;
    let cleanupMotion: (() => void) | undefined;

    const initializeMotion = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);

      if (cancelled) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      const scheduledFrames = new Set<number>();
      let pageMotionContext: { revert: () => void } | null = null;

      const scheduleFrame = (callback: () => void) => {
        const frame = window.requestAnimationFrame(() => {
          scheduledFrames.delete(frame);
          callback();
        });
        scheduledFrames.add(frame);
      };

      const clearAnimatedContentStyles = () => {
        const animatedContent =
          document.querySelectorAll<HTMLElement>(animatedContentSelector);

        if (animatedContent.length > 0) {
          gsap.set(animatedContent, { clearProps: "all" });
        }
      };

      const restoreHashPosition = () => {
        const targetId = decodeURIComponent(window.location.hash.slice(1));
        const target = targetId ? document.getElementById(targetId) : null;

        if (!target) {
          return;
        }

        const previousScrollBehavior =
          document.documentElement.style.scrollBehavior;
        document.documentElement.style.scrollBehavior = "auto";
        target.scrollIntoView();
        document.documentElement.style.scrollBehavior = previousScrollBehavior;
      };

      const setupPageMotion = () => {
        pageMotionContext?.revert();
        clearAnimatedContentStyles();

        pageMotionContext = gsap.context(() => {
          document
            .querySelectorAll<HTMLElement>(pageSectionSelector)
            .forEach((section) => {
              const isAlreadyVisible =
                section.getBoundingClientRect().top <= window.innerHeight * 0.9;

              if (isAlreadyVisible) {
                return;
              }

              const heading = section.querySelector<HTMLElement>("h2");
              const items = section.querySelectorAll<HTMLElement>(
                "article, figure, ol > li, [role='row'], details",
              );

              if (heading) {
                gsap.from(heading, {
                  opacity: 0,
                  y: 14,
                  duration: 0.5,
                  ease: "power2.out",
                  force3D: true,
                  willChange: "transform,opacity",
                  onComplete: () => {
                    scheduleFrame(() => gsap.set(heading, { clearProps: "all" }));
                  },
                  scrollTrigger: {
                    trigger: heading,
                    start: "top 90%",
                    once: true,
                  },
                });
              }

              if (items.length > 0) {
                gsap.from(items, {
                  opacity: 0,
                  y: 12,
                  duration: 0.4,
                  stagger: 0.03,
                  ease: "power2.out",
                  force3D: true,
                  willChange: "transform,opacity",
                  onComplete: () => {
                    scheduleFrame(() => gsap.set(items, { clearProps: "all" }));
                  },
                  scrollTrigger: {
                    trigger: items[0],
                    start: "top 90%",
                    once: true,
                  },
                });
              }
            });

          document.querySelectorAll<HTMLElement>("figure img").forEach((image) => {
            gsap.fromTo(
              image,
              { yPercent: -3, scale: 1.07 },
              {
                yPercent: 3,
                scale: 1.07,
                ease: "none",
                force3D: true,
                scrollTrigger: {
                  trigger: image.parentElement,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.9,
                },
              },
            );
          });
        });

        scheduleFrame(() => ScrollTrigger.refresh());
      };

      scheduleFrame(() => {
        if (window.location.hash) {
          restoreHashPosition();
        }

        scheduleFrame(setupPageMotion);
      });

      cleanupMotion = () => {
        scheduledFrames.forEach((frame) => window.cancelAnimationFrame(frame));
        pageMotionContext?.revert();
        clearAnimatedContentStyles();
      };
    };

    void initializeMotion();

    return () => {
      cancelled = true;
      cleanupMotion?.();
    };
  }, [pathname]);

  return null;
}
