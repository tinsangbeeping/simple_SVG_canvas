export const STORAGE_KEYS = {
  schematic: "currentSchematic",
  symbolLibrary: "symbolLibrary",
  patchLibrary: "patchLibrary_v1",
  recentSymbols: "recentSymbols",
  // Deprecated keys kept for cleanup/migrations
  useOnlyImportedSymbols: "useOnlyImportedSymbols",
} as const
