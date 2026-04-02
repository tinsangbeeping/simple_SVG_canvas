import { FSMap } from './catalog'

export interface WorkspaceData {
  id: string
  name: string
  fsMap: FSMap
  openFilePaths: string[]
  activeFilePath: string
}

export interface StoredWorkspaceState {
  workspaces: Record<string, WorkspaceData>
  activeWorkspaceId: string
}
