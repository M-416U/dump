import * as path from "path";
import * as fsExtra from "fs-extra";
import { DiffBlock } from "../diffBlock";
import { FileHandler } from "../../../shared/fileHandler";

export class ReplaceInFileDiffBlock extends DiffBlock {
  apply(): null | Error {
    try {
      this.process();
      return null;
    } catch (error: any) {
      console.error(`❌ Error applying replace-in-file: ${error.message}`);
      return new Error(`Error applying replace-in-file: ${error.message}`);
    }
  }
  process(): void {
    try {
      // Extract <path> and <diff>
      const pathMatch = this.diffContent.match(/<path>(.*?)<\/path>/);
      const diffMatch = this.diffContent.match(/<diff>([\s\S]*?)<\/diff>/);

      if (!pathMatch || !diffMatch) {
        throw new Error("Invalid <REPLACEINFILE> format");
      }

      const filePath = pathMatch[1]?.trim() ?? "";
      const fullPath = path.join(this.baseDir, filePath);
      let diffContent = diffMatch[1]?.trim() ?? "";

      console.log(`Processing replace in file: ${filePath}`);

      if (!FileHandler.fileExists(fullPath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }

      let fileContent = FileHandler.readFile(fullPath);

      try {
        fileContent = this.constructNewFileContent(diffContent, fullPath);
      } catch (error: any) {
        console.error(`❌ Diff processing failed: ${error.message}`);

        // Log error to file
        const logDir = path.join(this.baseDir, "../logs");
        fsExtra.ensureDirSync(logDir);
        const logFile = path.join(logDir, `replace-error.log`);

        const logContent = `
ERROR: ${error.message}
FILE PATH: ${filePath}
TIMESTAMP: ${new Date().toISOString()}

=== FILE CONTENT ===
${fileContent}

=== DIFF CONTENT ===
${diffContent}
`;

        fsExtra.writeFileSync(logFile, logContent);
        console.error(`📝 Error details logged to: ${logFile}`);

        throw new Error(
          `SEARCH block mismatch in ${filePath}: ${error.message}`
        );
      }

      fileContent = fileContent.trimEnd();
      FileHandler.writeFile(fullPath, fileContent);
      console.log(`✅ Applied <REPLACEINFILE> modifications to ${filePath}`);
    } catch (error: any) {
      console.error(`❌ Error in processReplaceInFile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Construct new file content using search/replace patterns
   */
  private constructNewFileContent(diff: string, filePath: string): string {
    const searchReplaceBlocks =
      diff.match(/<<<<<<< SEARCH[\s\S]*?>>>>>>> REPLACE/g) || [];

    if (searchReplaceBlocks.length === 0) {
      throw new Error("No valid SEARCH/REPLACE blocks found");
    }

    let fileContent = FileHandler.readFile(filePath);

    searchReplaceBlocks.forEach((block: string, index) => {
      console.log(`Processing block #${index + 1}:`, block);

      const match = block.match(
        /<<<<<<< SEARCH\s*([\s\S]*?)\s*=======\s*([\s\S]*?)\s*>>>>>>> REPLACE/
      );

      if (!match || match.length !== 3) {
        throw new Error(`Malformed SEARCH/REPLACE block (#${index + 1})`);
      }

      const searchPart = match[1]?.trimEnd() ?? "";
      const replacePart = match[2]?.trimEnd() ?? "";

      try {
        console.log("Attempting to match search string:", searchPart);
        fileContent = this.replaceCodeInFile(
          fileContent,
          searchPart,
          replacePart
        );
      } catch (error: any) {
        throw new Error(`Block #${index + 1}: ${error.message}`);
      }
    });

    return fileContent;
  }

  /**
   * Replaces code in file content while preserving formatting
   */
  private replaceCodeInFile(
    fileContent: string,
    searchString: string,
    replaceString: string
  ): string {
    const normalizedSearch = this.normalizeSearch(searchString);
    const fileLines = fileContent.split("\n");
    let matchStart = -1;
    let matchEnd = -1;

    // Find matching block using sliding window
    for (let i = 0; i < fileLines.length; i++) {
      const window = fileLines
        .slice(i, i + searchString.split("\n").length)
        .join("\n");

      if (this.normalizeSearch(window) === normalizedSearch) {
        matchStart = i;
        matchEnd = i + searchString.split("\n").length;
        break;
      }
    }

    if (matchStart === -1) {
      throw new Error(`Search pattern not found: ${searchString}`);
    }

    // Fix formatting for replacement block
    const replacementLines = this.fixDiff(replaceString.split("\n"));

    return [
      ...fileLines.slice(0, matchStart),
      ...replacementLines,
      ...fileLines.slice(matchEnd),
    ].join("\n");
  }

  /**
   * Normalize whitespace and newlines for search comparison
   */
  private normalizeSearch(str: string): string {
    return str
      .replace(/\s+/g, " ") // Collapse multiple spaces into one
      .replace(/\n+/g, " ") // Collapse multiple newlines into one
      .trim();
  }

  /**
   * Fix formatting for replacement block
   */
  private fixDiff(arr: string[]): string[] {
    return arr
      .filter((line) => {
        if (line.startsWith("-")) {
          return false; // Remove deleted lines
        }
        return true;
      })
      .map((line) => {
        if (line.startsWith("+ ")) {
          return "  " + line.substring(2); // Indent replacement lines
        }
        return line;
      });
  }
}
