/**
 * The MIRK mark: a soft square carrying an M of three slanted pills. It is the
 * whole logo; there is no wordmark. Inherits `currentColor`; size it with height and width.
 */

import { MARK_PATH, MARK_VIEWBOX } from "./wordmark-data";

export { MARK_PATH, MARK_VIEWBOX, markSvg } from "./wordmark-data";

export function Mark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="currentColor"
    >
      {title ? <title>{title}</title> : null}
      <path fillRule="evenodd" d={MARK_PATH} />
    </svg>
  );
}

/** The mark at tile size, for empty states. The mark is already a tile. */
export function MarkTile({ className = "size-12" }: { className?: string }) {
  return <Mark className={`text-ink ${className}`} />;
}

/** The logo as a labelled image, for headers and footers. */
export function Logo({ className = "size-8" }: { className?: string }) {
  return <Mark className={className} title="MIRK" />;
}
