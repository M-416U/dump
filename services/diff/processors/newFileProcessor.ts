import path from "path";
import { FileHandler } from "../../../shared/fileHandler";
import { DiffBlock } from "../diffBlock";

export class NewFileDiffBlock extends DiffBlock {
  apply(): null | Error {
    try {
      this.process();
      return null;
    } catch (error: any) {
      return new Error(`Error applying new-file: ${error.message}`);
    }
  }

  process(): void {
    try {
      // Extract the file path from the diff block
      const filePathMatch =
        this.diffContent.match(/\+\+\+ b\/([^\n]+)/) ||
        this.diffContent.match(/\+\+\+ ([^\n]+)/);

      if (!filePathMatch) {
        throw new Error("Could not find file path in new file block.");
      }

      const filePath = filePathMatch[1]?.trim().replace(/^b\//, "") ?? "";
      const fullPath = path.join(this.baseDir, filePath);

      console.log(`📦 Processing new file: ${filePath}`);

      const lines = this.diffContent.split("\n");
      let contentLines: string[] = [];
      let capture = false;

      for (const line of lines) {
        if (
          line.startsWith("new file mode") ||
          line.startsWith("---") ||
          line.startsWith("+++")
        ) {
          continue;
        }

        if (line.startsWith("@@")) {
          capture = true;
          continue;
        }

        if (capture) {
          if (line.startsWith("+")) {
            contentLines.push(line.slice(1).trimEnd());
          } else if (line.trim() === "") {
            contentLines.push("");
          }
        }
      }

      // Remove trailing empty lines
      while (
        contentLines.length > 0 &&
        contentLines[contentLines.length - 1] === ""
      ) {
        contentLines.pop();
      }

      const fileContent = contentLines.join("\n");
      FileHandler.writeFile(fullPath, fileContent + "\n");

      console.log(`✅ Created new file: ${filePath}`);
    } catch (error: any) {
      console.error(`❌ Error processing new file: ${error.message}`);
      throw new Error(error.message);
    }
  }
}
