import { FSMap } from './catalog'

export interface WorkspaceData {
  id: string
  name: string
  fsMap: FSMap
  openFilePaths: string[]
  activeFilePath: string
}

export interface WorkspaceExport {
  version: 1
  name: string
  files: FSMap
}

export interface StoredWorkspaceState {
  workspaces: Record<string, WorkspaceData>
  activeWorkspaceId: string
}
