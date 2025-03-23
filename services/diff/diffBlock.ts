export abstract class DiffBlock {
  protected diffContent: string;
  protected baseDir: string;
  constructor(diffContent: string, codebase: string) {
    this.diffContent = diffContent;
    this.baseDir = codebase;
  }

  // Subclasses must implement this method
  abstract apply(): void;
}
