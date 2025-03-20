import type {
  Workspace,
  WorkspaceManager,
} from "../workspace/WorkspaceManager";

declare global {
  var workspace: Workspace;
  var workspaceManager: WorkspaceManager;
}
export {};
