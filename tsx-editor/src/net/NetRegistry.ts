/**
 * NetRegistry resolves net names to stable net IDs.
 *
 * Two calls to getNetId("VCC") will always return the same ID.
 * Comparison is case-insensitive ("vcc" and "VCC" are the same net).
 */
export type NetRole = 'power' | 'ground' | 'signal' | 'analog' | 'unknown'

export type NetSource = 'explicit-net' | 'netlabel' | 'trace' | 'connections' | 'inferred' | 'merge'

export interface NetEntry {
  id: string
  name: string
  role: NetRole
  source: NetSource
}

const normalizeNetToken = (value: string): string => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

export const inferNetRole = (name: string): NetRole => {
  const token = normalizeNetToken(String(name || ''))
  if (!token) return 'unknown'

  if (token === 'GND' || token.startsWith('VSS') || token.startsWith('VREGVSS')) return 'ground'
  if (token === 'VCC' || token === 'VDD' || token.startsWith('DVDD') || token.startsWith('AVDD') || token.startsWith('IOVDD')) return 'power'
  if (token.startsWith('DECOUPLE') || token.startsWith('VREGSW')) return 'analog'
  if (token.startsWith('RESETN') || token.startsWith('BODEN') || token.startsWith('SWDIO') || token.startsWith('SWCLK')) return 'signal'
  return 'unknown'
}

const ROLE_RANK: Record<NetRole, number> = {
  unknown: 0,
  signal: 1,
  analog: 2,
  power: 3,
  ground: 3
}

export class NetRegistry {
  private nameToId = new Map<string, string>()
  private idToEntry = new Map<string, NetEntry>()
  private idCounter = 0

  private mergeRole(current: NetRole, incoming: NetRole): NetRole {
    if (incoming === 'unknown') return current
    if (current === 'unknown') return incoming
    return ROLE_RANK[incoming] >= ROLE_RANK[current] ? incoming : current
  }

  /** Register a net with semantic metadata (creates one if needed). */
  registerNet(name: string, options?: { role?: NetRole; source?: NetSource }): string {
    const key = String(name || '').toUpperCase()
    const incomingRole = options?.role || inferNetRole(name)
    const incomingSource = options?.source || 'inferred'

    if (!this.nameToId.has(key)) {
      const id = `net_${this.idCounter++}`
      this.nameToId.set(key, id)
      this.idToEntry.set(id, {
        id,
        name,
        role: incomingRole,
        source: incomingSource
      })
      return id
    }

    const id = this.nameToId.get(key)!
    const existing = this.idToEntry.get(id)
    if (existing) {
      this.idToEntry.set(id, {
        ...existing,
        role: this.mergeRole(existing.role, incomingRole),
        source: incomingSource
      })
    }

    return id
  }

  /** Return the canonical net ID for a given name (creates one if needed). */
  getNetId(name: string): string {
    return this.registerNet(name, { source: 'inferred' })
  }

  /** Return the canonical (display) name for a net ID. */
  getNetName(id: string): string | undefined {
    return this.idToEntry.get(id)?.name
  }

  /** Return full metadata for a net ID. */
  getNetEntry(id: string): NetEntry | undefined {
    return this.idToEntry.get(id)
  }

  /** Return net role by net ID or net name. */
  getNetRole(idOrName: string): NetRole | undefined {
    if (this.idToEntry.has(idOrName)) {
      return this.idToEntry.get(idOrName)?.role
    }

    const id = this.nameToId.get(String(idOrName || '').toUpperCase())
    if (!id) return undefined
    return this.idToEntry.get(id)?.role
  }

  /** True if a net with this name has already been registered. */
  has(name: string): boolean {
    return this.nameToId.has(name.toUpperCase())
  }

  /** All registered entries, useful for debugging. */
  entries(): NetEntry[] {
    return [...this.idToEntry.values()]
  }

  /** Reset the registry (useful between parse runs). */
  reset(): void {
    this.nameToId.clear()
    this.idToEntry.clear()
    this.idCounter = 0
  }
}
