import { Router } from "express";
import { workspaceManager } from "../server";

const workspaceRouter = Router();

workspaceRouter.post("/api/workspaces", async (req, res) => {
  try {
    const { name, basePath } = req.body;
    if (!basePath) {
      return res.status(400).json({ error: "base path is required" });
    }
    const workspace = workspaceManager.createWorkspace(
      name || "Untitled",
      basePath
    );
    global.workspace = workspace;
    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ error: "Failed to create workspace" });
  }
});

workspaceRouter.get("/api/workspaces", async (req, res) => {
  try {
    const workspaces = await workspaceManager.getAllWorkspaces();
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve workspaces" });
  }
});

workspaceRouter.post("/api/workspaces/:id/open", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const workspace = await workspaceManager.openWorkspace(id);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    global.workspace = workspace;

    res.json(workspace);
  } catch (error) {
    res.status(500).json({ error: "Failed to open workspace" });
  }
});
