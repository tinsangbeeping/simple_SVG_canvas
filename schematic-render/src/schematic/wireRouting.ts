import type { SchematicDoc, Point } from "../schematic/types"
import { getSymbolDef } from "../symbol-lib/registry"

/**
 * Check if a line segment intersects with an instance's bounding box
 */
type ExpandedBBox = { minX: number; minY: number; maxX: number; maxY: number; instId: string }

function getExpandedBBoxes(doc: SchematicDoc, excludeInstIds: Set<string>, margin: number): ExpandedBBox[] {
  const result: ExpandedBBox[] = []
  for (const inst of doc.instances) {
    if (excludeInstIds.has(inst.id)) continue
    const sym = getSymbolDef(inst.symbolId)
    if (!sym || !sym.bbox) continue
    const bb = sym.bbox
    result.push({
      instId: inst.id,
      minX: inst.pos.x + bb.x - margin,
      minY: inst.pos.y + bb.y - margin,
      maxX: inst.pos.x + bb.x + bb.w + margin,
      maxY: inst.pos.y + bb.y + bb.h + margin,
    })
  }
  return result
}

function pointInsideAnyBBox(p: Point, bboxes: ExpandedBBox[]): boolean {
  // Strict interior test so we can route along the boundary.
  return bboxes.some((b) => p.x > b.minX && p.x < b.maxX && p.y > b.minY && p.y < b.maxY)
}

function segmentIntersectsAnyBBox(a: Point, b: Point, bboxes: ExpandedBBox[]): boolean {
  // Axis-aligned only (Manhattan routing)
  if (a.x !== b.x && a.y !== b.y) return true

  const minX = Math.min(a.x, b.x)
  const maxX = Math.max(a.x, b.x)
  const minY = Math.min(a.y, b.y)
  const maxY = Math.max(a.y, b.y)

  for (const box of bboxes) {
    // Horizontal segment
    if (a.y === b.y) {
      const y = a.y
      const overlapsY = y > box.minY && y < box.maxY
      const overlapsX = !(maxX < box.minX || minX > box.maxX)
      if (overlapsY && overlapsX) return true
    }
    // Vertical segment
    if (a.x === b.x) {
      const x = a.x
      const overlapsX = x > box.minX && x < box.maxX
      const overlapsY = !(maxY < box.minY || minY > box.maxY)
      if (overlapsX && overlapsY) return true
    }
  }
  return false
}

function uniqSorted(nums: number[]): number[] {
  return Array.from(new Set(nums)).sort((a, b) => a - b)
}

function key(p: Point) {
  return `${p.x},${p.y}`
}

function manhattan(a: Point, b: Point) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function compressCollinear(points: Point[]): Point[] {
  if (points.length <= 2) return points
  const out: Point[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const prev = out[out.length - 1]
    const curr = points[i]
    const next = points[i + 1]
    const collinear = (prev.x === curr.x && curr.x === next.x) || (prev.y === curr.y && curr.y === next.y)
    if (!collinear) out.push(curr)
  }
  out.push(points[points.length - 1])
  return out
}

/**
 * Compute wire points with smart routing that avoids component bodies.
 *
 * IMPORTANT: This module must not import from `pins.ts` (would create a circular dependency).
 */
export function computeWirePointsSmartFromPoints(
  aPos: Point,
  bPos: Point,
  doc: SchematicDoc,
  excludeInstIds: Set<string>
): Point[] {
  const margin = 15
  const bboxes = getExpandedBBoxes(doc, excludeInstIds, margin)

  // If endpoints are inside an obstacle (shouldn't happen), fall back.
  if (pointInsideAnyBBox(aPos, bboxes) || pointInsideAnyBBox(bPos, bboxes)) {
    return [aPos, { x: bPos.x, y: aPos.y }, bPos]
  }

  // Build candidate x/y coordinates from endpoints and obstacle edges.
  const xs: number[] = [aPos.x, bPos.x]
  const ys: number[] = [aPos.y, bPos.y]
  for (const b of bboxes) {
    xs.push(b.minX, b.maxX)
    ys.push(b.minY, b.maxY)
  }
  const X = uniqSorted(xs)
  const Y = uniqSorted(ys)

  // Build nodes at (x,y) grid intersections that are not inside obstacles.
  const nodes: Point[] = []
  const nodeSet = new Set<string>()
  for (const x of X) {
    for (const y of Y) {
      const p = { x, y }
      if (pointInsideAnyBBox(p, bboxes)) continue
      const k = key(p)
      if (!nodeSet.has(k)) {
        nodeSet.add(k)
        nodes.push(p)
      }
    }
  }

  // Ensure endpoints are included.
  for (const p of [aPos, bPos]) {
    const k = key(p)
    if (!nodeSet.has(k) && !pointInsideAnyBBox(p, bboxes)) {
      nodeSet.add(k)
      nodes.push(p)
    }
  }

  // Index nodes by x and by y for adjacency.
  const byX = new Map<number, Point[]>()
  const byY = new Map<number, Point[]>()
  for (const p of nodes) {
    const arrX = byX.get(p.x) ?? []
    arrX.push(p)
    byX.set(p.x, arrX)
    const arrY = byY.get(p.y) ?? []
    arrY.push(p)
    byY.set(p.y, arrY)
  }
  for (const arr of byX.values()) arr.sort((a, b) => a.y - b.y)
  for (const arr of byY.values()) arr.sort((a, b) => a.x - b.x)

  // Dijkstra on this sparse Manhattan graph: connect adjacent nodes along same x or same y
  const startK = key(aPos)
  const goalK = key(bPos)
  const dist = new Map<string, number>()
  const prev = new Map<string, string | null>()
  const visited = new Set<string>()
  const pq: Array<{ k: string; d: number }> = []

  function push(k: string, d: number) {
    pq.push({ k, d })
    pq.sort((a, b) => a.d - b.d)
  }

  dist.set(startK, 0)
  prev.set(startK, null)
  push(startK, 0)

  const nodeByKey = new Map<string, Point>()
  for (const p of nodes) nodeByKey.set(key(p), p)

  function neighbors(p: Point): Point[] {
    const out: Point[] = []
    const xsame = byX.get(p.x) ?? []
    const ysame = byY.get(p.y) ?? []
    const ix = xsame.findIndex((q) => q.y === p.y)
    if (ix >= 0) {
      if (ix > 0) out.push(xsame[ix - 1])
      if (ix < xsame.length - 1) out.push(xsame[ix + 1])
    }
    const iy = ysame.findIndex((q) => q.x === p.x)
    if (iy >= 0) {
      if (iy > 0) out.push(ysame[iy - 1])
      if (iy < ysame.length - 1) out.push(ysame[iy + 1])
    }
    return out
  }

  while (pq.length > 0) {
    const cur = pq.shift()!
    if (visited.has(cur.k)) continue
    visited.add(cur.k)
    if (cur.k === goalK) break

    const p = nodeByKey.get(cur.k)
    if (!p) continue
    const base = dist.get(cur.k) ?? Infinity

    for (const nb of neighbors(p)) {
      const nk = key(nb)
      if (visited.has(nk)) continue

      // Segment must not intersect obstacles.
      if (segmentIntersectsAnyBBox(p, nb, bboxes)) continue

      const nd = base + manhattan(p, nb)
      const old = dist.get(nk)
      if (old === undefined || nd < old) {
        dist.set(nk, nd)
        prev.set(nk, cur.k)
        push(nk, nd)
      }
    }
  }

  if (!prev.has(goalK)) {
    // No path found on this grid → fallback.
    return [aPos, { x: bPos.x, y: aPos.y }, bPos]
  }

  // Reconstruct path
  const rev: Point[] = []
  let curK: string | null = goalK
  while (curK) {
    const p = nodeByKey.get(curK)
    if (p) rev.push(p)
    curK = prev.get(curK) ?? null
  }
  rev.reverse()
  return compressCollinear(rev)
}

