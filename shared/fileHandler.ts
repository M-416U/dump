import fsExtra from "fs-extra";
import path from "path";

export class FileHandler {
  /**
   * Ensures that the file exists.
   * @param filePath The file path to ensure exists.
   */
  static fileExists(filePath: string): boolean {
    return fsExtra.existsSync(filePath);
  }
  /**
   * Ensures that the base directory exists.
   * @param baseDir The directory path to ensure exists.
   */
  static ensureDir(baseDir: string): void {
    fsExtra.ensureDirSync(baseDir);
    console.log(`📂 Ensured base directory exists: ${baseDir}`);
  }

  /**
   * Reads the content of a file.
   * @param filePath The path to the file.
   * @returns The content of the file as a string.
   * @throws If the file does not exist.
   */
  static readFile(filePath: string): string {
    if (!fsExtra.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    return fsExtra.readFileSync(filePath, "utf8");
  }

  /**
   * Writes content to a file.
   * @param filePath The path to the file.
   * @param content The content to write.
   */
  static writeFile(filePath: string, content: string, encoding?: string): void {
    fsExtra.ensureDirSync(path.dirname(filePath));
    fsExtra.writeFileSync(filePath, content, (encoding as "utf8") || "utf8");
    console.log(`✅ Successfully wrote to file: ${filePath}`);
  }

  /**
   * Deletes a file if it exists.
   * @param filePath The path to the file.
   */
  static deleteFile(filePath: string): void {
    if (fsExtra.existsSync(filePath)) {
      fsExtra.removeSync(filePath);
      console.log(`🗑️ Deleted file: ${filePath}`);
    } else {
      console.warn(`⚠️ File ${filePath} does not exist, skipping deletion.`);
    }
  }
}
