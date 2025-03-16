import { applyPatch, parsePatch, type ParsedDiff } from "diff";
import path from "path";
import { FileHandler } from "../../../shared/fileHandler";
import { DiffBlock } from "../diffBlock";
import { Logger } from "../../../helpers/logger";

export class ModifiedFileDiffBlock extends DiffBlock {
  apply(): null | Error {
    try {
      this.process();
      return null;
    } catch (error: any) {
      Logger.logToMarkdown(
        "ModifiedFileDiffBlock",
        `❌ Error applying modified-in-file: ${error.message}`,
        "tool"
      );
      return new Error(`Error applying modified-in-file: ${error.message}`);
    }
  }

  private process(): void {
    const filePath = this.extractFilePath();
    const fullPath = path.join(this.baseDir, filePath);

    console.log(
      `Processing modified file: ${filePath} (full path: ${fullPath})`
    );

    if (!FileHandler.fileExists(fullPath)) {
      FileHandler.writeFile(fullPath, ""); // Create an empty file if missing
      console.log(`📄 Created an empty file for modification: ${filePath}`);
    }

    // Read current file content
    let fileContent = FileHandler.readFile(fullPath);
    fileContent = this.normalizeText(fileContent);

    const normalizedDiff = this.normalizeText(this.diffContent);
    const patches = parsePatch(normalizedDiff);

    if (!patches.length) {
      throw new Error(`Failed to parse patch for ${filePath}`);
    }

    const patchedContent = applyPatch(fileContent, patches[0] as ParsedDiff, {
      fuzzFactor: 10, // Allow fuzzy matching
    });

    if (patchedContent === false) {
      throw new Error(`Patch application failed for ${filePath}`);
    }

    // Write updated content back to file
    FileHandler.writeFile(fullPath, patchedContent);
    console.log(`✅ Successfully applied diff to ${filePath}`);
  }

  private extractFilePath(): string {
    const match =
      this.diffContent.match(/\+\+\+ b\/([^\n]+)/) ||
      this.diffContent.match(/\+\+\+ ([^\n]+)/);

    if (!match || !match[1]) {
      throw new Error("Could not determine target file path in diff block.");
    }
    return match[1].trim().replace(/^b\//, "");
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\t/g, "  ") // Convert tabs to spaces
      .replace(/\r\n/g, "\n") // Normalize line endings
      .replace(/ +$/gm, ""); // Remove trailing spaces
  }
}
