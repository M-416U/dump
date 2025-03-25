import path from "path";
import { FileHandler } from "../../../shared/fileHandler";
import { DiffBlock } from "../diffBlock";

export class DeletedFileDiffBlock extends DiffBlock {
  apply(): null | Error {
    try {
      this.process();
      return null;
    } catch (error: any) {
      return new Error(`Error applying delete-file: ${error.message}`);
    }
  }
  process(): void {
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

      if (FileHandler.fileExists(fullPath)) {
        FileHandler.deleteFile(fullPath);
      } else {
        console.warn(`⚠️ File does not exist: ${filePath}`);
      }
    } catch (error: any) {
      console.error(`❌ Error processing deleted file: ${error.message}`);
      throw new Error(`${error.message}`);
    }
  }
}
