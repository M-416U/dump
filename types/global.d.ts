import type { Workspace } from "../workspace/WorkspaceManager";

// declare global {
//   namespace NodeJS {
//     interface Global {
//       workspace: Workspace | null;
//     }
//   }
// }

declare global {
  var workspace: Workspace | null;
}
export {};
