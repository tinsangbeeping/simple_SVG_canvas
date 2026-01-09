import type { Patch } from "./types"
import { loadPatches, savePatches } from "../storage"

export const patchRegistry: Record<string, Patch> = {}

function loadFromStorage(): void {
  try {
    const patches = loadPatches()
    for (const patch of patches) {
      patchRegistry[patch.id] = patch
    }
    if (patches.length > 0) {
      console.log(`Loaded ${patches.length} patches from storage`)
    }
  } catch (err) {
    console.error("Failed to load patches from storage:", err)
  }
}

function saveToStorage(): void {
  try {
    const allPatches = Object.values(patchRegistry)
    savePatches(allPatches)
    console.log(`Saved ${allPatches.length} patches to storage`)
  } catch (err) {
    console.error("Failed to save patches to storage:", err)
  }
}

// Initialize
loadFromStorage()

export function registerPatch(patch: Patch): void {
  patchRegistry[patch.id] = patch
  saveToStorage()
}

export function unregisterPatch(patchId: string): boolean {
  if (patchRegistry[patchId]) {
    delete patchRegistry[patchId]
    saveToStorage()
    return true
  }
  return false
}

export function getPatch(patchId: string): Patch | null {
  return patchRegistry[patchId] || null
}

export function listPatches(): Patch[] {
  return Object.values(patchRegistry)
}

export function getPatchCount(): number {
  return Object.keys(patchRegistry).length
}

export function clearAllPatches(): void {
  for (const key of Object.keys(patchRegistry)) {
    delete patchRegistry[key]
  }
  saveToStorage()
}
