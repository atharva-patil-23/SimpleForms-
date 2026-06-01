"use client";

/**
 * Scroll-reveal wrapper. Renders its children invisible-and-lowered, then adds
 * data-inview="true" the first time they cross into the viewport, which lets the
 * `.reveal` CSS utility (globals.css) fade + lift them into place. Reveal-once:
 * the observer disconnects after the first intersection so things don't
 * re-animate on scroll-back.
 *
 * - `delay` staggers siblings (e.g. hero lines arriving one after another).
 * - If IntersectionObserver is missing (very old browsers) or the user prefers
 *   reduced motion, content shows immediately — no element is ever stranded
 *   invisible.
 */
import { useEffect, useRef, useState, type ElementType, type ReactNode } from "react";

export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Stagger in milliseconds before this element settles. */
  delay?: number;
  /** Extra classes merged after the base `.reveal` utility. */
  className?: string;
  /** Element to render as (defaults to a div). */
  as?: ElementType;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className ? `reveal ${className}` : "reveal"}
      data-inview={inView}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
