/**
 * The MIRK logo: the falling-exclamation mark beside a lowercase "mirk" set in
 * the display face. Both inherit `currentColor`; size the lockup with font-size.
 */

import { MARK_SHAPES, MARK_STROKE, MARK_VIEWBOX } from "./wordmark-data";

export { MARK_SHAPES, MARK_VIEWBOX, markSvg } from "./wordmark-data";

export function Mark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={MARK_STROKE}
      strokeLinejoin="round"
    >
      {title ? <title>{title}</title> : null}
      {MARK_SHAPES.map((points) => (
        <polygon key={points} points={points} />
      ))}
    </svg>
  );
}

export function Wordmark({ className, title = "MIRK" }: { className?: string; title?: string }) {
  return (
    <span
      role="img"
      aria-label={title}
      className={`inline-flex items-center gap-[0.22em] leading-none font-semibold tracking-[-0.045em] ${className ?? ""}`}
    >
      <Mark className="h-[1.08em] w-auto -translate-y-[0.04em]" />
      <span aria-hidden>mirk</span>
    </span>
  );
}
