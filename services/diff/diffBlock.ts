export abstract class DiffBlock {
  protected diffContent: string;
  protected baseDir: string;
  constructor(diffContent: string) {
    this.diffContent = diffContent;
    this.baseDir = workspace.path;
  }

  // Subclasses must implement this method
  abstract apply(): void;
}
