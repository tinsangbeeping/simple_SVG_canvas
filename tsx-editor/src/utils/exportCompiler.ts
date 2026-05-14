import type { ExportGraph, ExportTrace, ExportNetLabel } from '../types/exportGraph'

const compileTrace = (trace: ExportTrace): string => {
  return `<trace from="${trace.from}" to="${trace.to}" />`
}

const compileNetLabel = (label: ExportNetLabel): string => {
  const schX = Number(label.schX)
  const schY = Number(label.schY)
  const schXAttr = Number.isFinite(schX) ? ` schX={${Math.round(schX * 1000) / 1000}}` : ''
  const schYAttr = Number.isFinite(schY) ? ` schY={${Math.round(schY * 1000) / 1000}}` : ''
  const netRoleRaw = String(label.netRole || '').trim()
  const netRoleAttr = netRoleRaw ? ` netRole="${netRoleRaw}"` : ''
  return `<netlabel net="${label.net}"${schXAttr}${schYAttr}${netRoleAttr} />`
}

export const compileExportGraphToTSXNodes = (graph: ExportGraph): string[] => {
  const out: string[] = []
  graph.nodes.forEach((node) => {
    if (node.kind === 'trace') {
      out.push(compileTrace(node))
      return
    }
    if (node.kind === 'netlabel') {
      out.push(compileNetLabel(node))
    }
  })
  return out
}
