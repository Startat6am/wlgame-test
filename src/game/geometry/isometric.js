export const WORLD = Object.freeze({ width: 1600, height: 1000 });
export const ISO_VIEW = Object.freeze({
  width: 2000, height: 1200, centerX: 1000, centerY: 600, xScale: 0.75, yScale: 0.38
});

export function worldToScreen(x, y) {
  const dx = x - WORLD.width / 2;
  const dy = y - WORLD.height / 2;
  return {
    x: ISO_VIEW.centerX + (dx - dy) * ISO_VIEW.xScale,
    y: ISO_VIEW.centerY + (dx + dy) * ISO_VIEW.yScale
  };
}

export function screenToWorld(x, y) {
  const sx = (x - ISO_VIEW.centerX) / ISO_VIEW.xScale;
  const sy = (y - ISO_VIEW.centerY) / ISO_VIEW.yScale;
  return {
    x: WORLD.width / 2 + (sx + sy) / 2,
    y: WORLD.height / 2 + (sy - sx) / 2
  };
}

export function screenVectorToWorld(x, y) {
  const sx = x / ISO_VIEW.xScale;
  const sy = y / ISO_VIEW.yScale;
  return { x: (sx + sy) / 2, y: (sy - sx) / 2 };
}

export function projectedAngle(x, y) {
  const point = worldToScreen(x, y);
  const origin = worldToScreen(0, 0);
  return Math.atan2(point.y - origin.y, point.x - origin.x);
}
