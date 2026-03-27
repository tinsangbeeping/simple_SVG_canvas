/**
 * NetRegistry resolves net names to stable net IDs.
 *
 * Two calls to getNetId("VCC") will always return the same ID.
 * Comparison is case-insensitive ("vcc" and "VCC" are the same net).
 */
export class NetRegistry {
  private nameToId = new Map<string, string>()
  private idToName = new Map<string, string>()
  private idCounter = 0

  /** Return the canonical net ID for a given name (creates one if needed). */
  getNetId(name: string): string {
    const key = name.toUpperCase()

    if (!this.nameToId.has(key)) {
      const id = `net_${this.idCounter++}`
      this.nameToId.set(key, id)
      this.idToName.set(id, name) // preserve original casing of first registration
    }

    return this.nameToId.get(key)!
  }

  /** Return the canonical (display) name for a net ID. */
  getNetName(id: string): string | undefined {
    return this.idToName.get(id)
  }

  /** True if a net with this name has already been registered. */
  has(name: string): boolean {
    return this.nameToId.has(name.toUpperCase())
  }

  /** All registered (id → name) pairs, useful for debugging. */
  entries(): Array<{ id: string; name: string }> {
    return [...this.idToName.entries()].map(([id, name]) => ({ id, name }))
  }

  /** Reset the registry (useful between parse runs). */
  reset(): void {
    this.nameToId.clear()
    this.idToName.clear()
    this.idCounter = 0
  }
}
