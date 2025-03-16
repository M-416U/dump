import * as path from "path";
import * as fsExtra from "fs-extra";
import { DiffBlock } from "../diffBlock";
import { Logger } from "../../../helpers/logger";
import { FileHandler } from "../../../shared/fileHandler";

export class ReplaceInFileDiffBlock extends DiffBlock {
  apply(): null | Error {
    try {
      this.process();
      return null;
    } catch (error: any) {
      Logger.logToMarkdown(
        "ReplaceInFileDiffBlock",
        `❌ Error applying replace-in-file: ${error.message}`,
        "tool"
      );
      return new Error(`Error applying replace-in-file: ${error.message}`);
    }
  }
  process(): Error | null {
    try {
      // 1. Extract & Validate Input
      const pathMatch = this.diffContent.match(/<path>(.*?)<\/path>/);
      const diffMatch = this.diffContent.match(/<diff>([\s\S]*?)<\/diff>/);
      if (!pathMatch || !diffMatch) {
        throw new Error("Invalid <REPLACEINFILE> format");
      }
      const filePath = pathMatch[1]?.trim() ?? "";
      const fullPath = path.join(this.baseDir, filePath);
      let diffContent = diffMatch[1]?.trim() ?? "";

      // 2. Determine File Existence
      if (!fsExtra.existsSync(fullPath)) {
        throw new Error(`File does not exist: ${filePath}`);
      }
      let fileContent = fsExtra.readFileSync(fullPath, "utf8");

      try {
        fileContent = this.constructNewFileContent(diffContent, fullPath);
      } catch (error: any) {
        console.error(`❌ Diff processing failed: ${error.message}`);

        const logContent = `
 ERROR: ${error.message}
 FILE PATH: ${filePath}
 TIMESTAMP: ${new Date().toISOString()}
 
 === FILE CONTENT ===
 ${fileContent}
 
 === DIFF CONTENT ===
 ${diffContent}
 `;

        Logger.logToMarkdown("ReplaceInFileDiffBlock", `${logContent}`, "tool");

        throw new Error(
          `SEARCH block mismatch in ${filePath}: ${error.message}`
        );
      }

      fileContent = fileContent.trimEnd();
      FileHandler.writeFile(fullPath, fileContent);

      console.log(`✅ Applied <REPLACEINFILE> modifications to ${filePath}`);
      return null;
    } catch (error: any) {
      console.error(`❌ Error in processReplaceInFile: ${error.message}`);
      return error;
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

    let fileContent = fsExtra.readFileSync(filePath, "utf8");

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
    const normalizedSearch = this.normalizeSearch(
      this.fixDiff(searchString.split("\n")).join("\n")
    ); // Normalize the search string
    const fileLines = fileContent.split("\n");
    let matchStart = -1;
    let matchEnd = -1;

    // Find matching block using sliding window approach
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

    // Preserve the exact formatting for the replace block
    let replacementLines = this.fixDiff(replaceString.split("\n"));

    // Rebuild content with replacement (preserving the replace block formatting)
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
      .replace(/\s+/g, " ") // Collapse all whitespaces (spaces, tabs) into a single space
      .replace(/\n+/g, " ") // Collapse multiple newlines into a single space
      .trim(); // Remove leading and trailing spaces
  }

  /**
   * Fix formatting for replacement block
   */
  private fixDiff(arr: string[]): string[] {
    return arr
      .filter((line) => {
        if (line.startsWith("-")) {
          return false;
        }
        return true;
      })
      .map((line) => {
        if (line.startsWith("+")) {
          return line.substring(1);
        }
        return line;
      });
  }
}
