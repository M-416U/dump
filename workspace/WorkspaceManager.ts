import fs from "fs";
import path from "path";
import { db } from "../database/db";

export interface Workspace {
  id: number;
  name: string;
  path: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: number;
  workspaceId: number;
  role: "user" | "planner" | "system";
  content: string;
  timestamp: Date;
}

// Database row types
interface WorkspaceRow {
  id: number;
  name: string;
  path: string;
  created_at: string;
}

interface ChatHistoryRow {
  id: number;
  workspace_id: number;
  role: "user" | "planner" | "system";
  content: string;
  timestamp: string;
}

export class WorkspaceManager {
  private currentWorkspace: Workspace | null = null;

  constructor() {}

  /**
   * Create a new workspace
   */
  async createWorkspace(name: string, basePath: string): Promise<Workspace> {
    if (!name || !basePath) {
      throw new Error("Workspace name and path are required");
    }

    // Create workspace directory if it doesn't exist
    if (!fs.existsSync(basePath)) {
      fs.mkdirSync(basePath, { recursive: true });
    }

    const dumpWsPath = path.join(basePath, ".dump_ws");
    const logsPath = path.join(dumpWsPath, "logs");
    if (!fs.existsSync(dumpWsPath)) {
      fs.mkdirSync(dumpWsPath, { recursive: true });
    }
    if (!fs.existsSync(logsPath)) {
      fs.mkdirSync(logsPath, { recursive: true });
    }

    try {
      // Insert workspace into database
      const stmt = db.prepare(
        "INSERT INTO workspaces (name, path) VALUES (?, ?)"
      );
      const result = await stmt.run([name, basePath]);
      const lastId = result.lastID;

      const workspace: Workspace = {
        id: Number(lastId),
        name,
        path: basePath,
        createdAt: new Date(),
      };

      this.currentWorkspace = workspace;
      return workspace;
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    }
  }

  /**
   * Get all workspaces
   */
  async getAllWorkspaces(): Promise<Workspace[]> {
    const rows = (await db
      .prepare("SELECT * FROM workspaces ORDER BY created_at DESC")
      .all()) as unknown as WorkspaceRow[];
    return rows.map((row: WorkspaceRow) => ({
      id: row.id,
      name: row.name,
      path: row.path,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Open an existing workspace
   */
  async openWorkspace(id: number): Promise<Workspace | null> {
    const row = (await db
      .prepare("SELECT * FROM workspaces WHERE id = ?")
      .get(id)) as WorkspaceRow | undefined;

    if (!row) return null;

    const workspace: Workspace = {
      id: row.id,
      name: row.name,
      path: row.path,
      createdAt: new Date(row.created_at),
    };

    this.currentWorkspace = workspace;
    return workspace;
  }

  /**
   * Get current workspace
   */
  getCurrentWorkspace(): Workspace | null {
    return this.currentWorkspace;
  }

  /**
   * Save chat message to history
   */
  saveChatMessage(role: "user" | "planner" | "system", content: string): void {
    if (!this.currentWorkspace) {
      throw new Error("No workspace is currently open");
    }
    console.log("saving message", role, content);
    const stmt = db.prepare(
      "INSERT INTO chat_history (workspace_id, role, content) VALUES (?, ?, ?)"
    );
    stmt.run([this.currentWorkspace.id, role, content]);
  }

  /**
   * Get chat history for current workspace
   */
  async getChatHistory(): Promise<ChatMessage[]> {
    if (!this.currentWorkspace) {
      return [];
    }

    const rows = (await db
      .prepare(
        "SELECT * FROM chat_history WHERE workspace_id = ? ORDER BY timestamp ASC"
      )
      .all(this.currentWorkspace.id)) as unknown as ChatHistoryRow[];

    return rows.map((row: ChatHistoryRow) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      role: row.role,
      content: row.content,
      timestamp: new Date(row.timestamp),
    }));
  }
  /**
   * Get the logs directory path for the current workspace
   */
  getLogsPath(): string {
    if (!this.currentWorkspace) {
      throw new Error("No workspace is currently open");
    }

    return path.join(this.currentWorkspace.path, ".dump_ws/logs");
  }
}
