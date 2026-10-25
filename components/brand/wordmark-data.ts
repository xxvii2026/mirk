/**
 * Geometry for the MIRK mark: three exclamation points falling out of line,
 * traced from the master artwork. Each shape is a polygon drawn with a round
 * stroke of the same colour, which gives the soft corners of the original.
 */

export const MARK_VIEWBOX = "0 0 398 554";
export const MARK_STROKE = 16;

export const MARK_SHAPES: readonly string[] = [
  "23,10 42,12 113,272 92,292 80,289 9,72",
  "104,350 123,336 131,340 145,386 125,395 118,392",
  "161,94 279,64 283,72 268,436 260,440 203,416 197,410",
  "207,478 209,472 265,497 267,502 265,542 260,544 208,514",
  "349,408 358,404 387,421 389,428 361,495 354,496 332,481 331,474",
  "321,518 325,514 341,525 343,532 339,535 323,527",
];

export function markSvg(fill: string): string {
  const shapes = MARK_SHAPES.map((p) => `<polygon points="${p}"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" fill="${fill}" stroke="${fill}" stroke-width="${MARK_STROKE}" stroke-linejoin="round"><title>MIRK</title>${shapes}</svg>\n`;
}
