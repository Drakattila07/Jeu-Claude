export interface GridPoint { readonly x: number; readonly y: number }

export function findPath(
  start: GridPoint,
  goal: GridPoint,
  canWalk: (x: number, y: number) => boolean,
  width = 16,
  height = 14,
): readonly GridPoint[] {
  const key = (point: GridPoint): string => `${point.x},${point.y}`;
  const open: GridPoint[] = [start];
  const cameFrom = new Map<string, GridPoint>();
  const gScore = new Map<string, number>([[key(start), 0]]);
  const f = (point: GridPoint): number =>
    (gScore.get(key(point)) ?? Infinity) + Math.abs(goal.x - point.x) + Math.abs(goal.y - point.y);
  while (open.length > 0) {
    open.sort((a, b) => f(a) - f(b) || a.y - b.y || a.x - b.x);
    const current = open.shift()!;
    if (current.x === goal.x && current.y === goal.y) {
      const path: GridPoint[] = [current];
      let cursor = current;
      while (cameFrom.has(key(cursor))) {
        cursor = cameFrom.get(key(cursor))!;
        path.unshift(cursor);
      }
      return path;
    }
    const neighbors = [
      { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 },
    ].filter((point) => point.x >= 0 && point.y >= 0 && point.x < width && point.y < height
      && canWalk(point.x, point.y));
    for (const neighbor of neighbors) {
      const tentative = (gScore.get(key(current)) ?? Infinity) + 1;
      if (tentative >= (gScore.get(key(neighbor)) ?? Infinity)) continue;
      cameFrom.set(key(neighbor), current);
      gScore.set(key(neighbor), tentative);
      if (!open.some((point) => key(point) === key(neighbor))) open.push(neighbor);
    }
  }
  return [];
}
