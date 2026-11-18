export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = { left: number; top: number; width: number; height: number };

/** これより小さい囲み（画面上の px）は、指が触れただけとみなして無視する */
const MIN_DISPLAY_SIZE = 20;

/** 2 点（指でなぞった始点と終点）から、画面上の四角を作る。画像の外にはみ出した分は切り詰める */
export function rectFromPoints(a: Point, b: Point, display: Size): Rect | null {
  const clampX = (v: number) => Math.min(Math.max(v, 0), display.width);
  const clampY = (v: number) => Math.min(Math.max(v, 0), display.height);
  const left = clampX(Math.min(a.x, b.x));
  const right = clampX(Math.max(a.x, b.x));
  const top = clampY(Math.min(a.y, b.y));
  const bottom = clampY(Math.max(a.y, b.y));
  if (right - left < MIN_DISPLAY_SIZE || bottom - top < MIN_DISPLAY_SIZE) return null;
  return { left, top, width: right - left, height: bottom - top };
}

/** 画面上の四角を、元の写真の大きさ（px）での四角に直す */
export function toImageRect(rect: Rect, display: Size, natural: Size): Rect {
  const sx = natural.width / display.width;
  const sy = natural.height / display.height;
  return {
    left: Math.round(rect.left * sx),
    top: Math.round(rect.top * sy),
    width: Math.round(rect.width * sx),
    height: Math.round(rect.height * sy),
  };
}
