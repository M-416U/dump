import path from "path";
import { FileHandler } from "../../../shared/fileHandler";
import { DiffBlock } from "../diffBlock";
import { Logger } from "../../../helpers/logger";

export class DeletedFileDiffBlock extends DiffBlock {
  apply(): null | Error {
    try {
      Logger.logToMarkdown(
        "DeletedFileDiffBlock",
        `Applying delete-file ${this.baseDir}`,
        "tool"
      );
      this.process();
      return null;
    } catch (error: any) {
      Logger.logToMarkdown(
        "DeletedFileDiffBlock",
        `❌ Error applying delete-file: ${error.message}`,
        "tool"
      );
      return new Error(`Error applying delete-file: ${error.message}`);
    }
  }
  process(): Error | null {
    try {
      // Extract the file path from the diff block
      const filePathMatch =
        this.diffContent.match(/--- a\/([^\n]+)/) ||
        this.diffContent.match(/--- ([^\n]+)/);

      if (!filePathMatch) {
        throw new Error("Could not find file path in deleted file block.");
      }

      const filePath = filePathMatch[1]?.trim().replace(/^a\//, "") ?? "";
      const fullPath = path.join(this.baseDir, filePath);

      console.log(`🗑️ Deleting file: ${filePath}`);

      if (FileHandler.fileExists(fullPath)) {
        FileHandler.deleteFile(fullPath);
        console.log(`✅ Deleted file: ${filePath}`);
      } else {
        console.warn(`⚠️ File does not exist: ${filePath}`);
      }

      return null;
    } catch (error: any) {
      console.error(`❌ Error processing deleted file: ${error.message}`);
      return error;
    }
  }
}
