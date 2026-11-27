/**
 * Whether a scroll-revealed block should show: as soon as its top edge is inside (or above) the viewport.
 * "Above" matters: jumping straight to the end of the page must not leave skipped sections invisible.
 */
export function shouldReveal(rectTop: number, viewportHeight: number, margin = 0.92): boolean {
  return rectTop < viewportHeight * margin;
}
