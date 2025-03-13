import fsExtra from "fs-extra";
import path from "path";
import { applyPatch, parsePatch, type ParsedDiff } from "diff";
import { replaceCodeInFile } from "./processReplaceInFile.js";

interface ErrorWithIndex {
  index: number;
  error: Error;
}

/**
 * Process diff blocks from input text and apply changes to files
 */
export function processDiffBlocks(
  input: string,
  baseDir: string
): Error | null {
  try {
    input = input.replace(`\\ No newline at end of file`, "");
    fsExtra.ensureDirSync(baseDir);
    console.log(`📂 Ensured base directory exists: ${baseDir}`);

    const diffBlocks = extractDiffBlocks(input);
    if (diffBlocks.length === 0) {
      console.log("⚠️ No valid diff blocks found in input.");
      return new Error("No valid diff blocks found in input");
    }

    console.log(`🔄 Processing ${diffBlocks.length} diff blocks...`);
    const errors: ErrorWithIndex[] = [];

    diffBlocks.forEach((diffBlock, index) => {
      console.log(
        `\n📦 Processing diff block ${index + 1}/${diffBlocks.length}`
      );
      let error: Error | null = null;

      if (diffBlock.includes("<REPLACEINFILE>")) {
        error = processReplaceInFile(diffBlock, baseDir);
      } else if (diffBlock.includes("new file mode")) {
        error = processNewFile(diffBlock, baseDir);
      } else if (diffBlock.includes("deleted file mode")) {
        error = processDeletedFile(diffBlock, baseDir);
      } else {
        error = processModifiedFile(diffBlock, baseDir);
      }

      if (error) {
        errors.push({ index: index + 1, error });
      }
    });

    if (errors.length > 0) {
      console.error(
        `\n❌ Encountered ${errors.length} errors during processing.`
      );
      return new Error(JSON.stringify(errors));
    }

    console.log("\n✅ All diff blocks processed successfully!");
    return null;
  } catch (error: any) {
    console.error(`\n❌ Fatal error in processDiffBlocks: ${error.message}`);
    return error;
  }
}

/**
 * Extract diff blocks from input text
 */
function extractDiffBlocks(input: string): string[] {
  const blocks: string[] = [];

  // First check for CODE blocks
  const codeRegex = /<CODE>\s*([\s\S]*?)\s*<\/CODE>/g;
  let codeMatch: RegExpExecArray | null;
  while ((codeMatch = codeRegex.exec(input)) !== null) {
    if (codeMatch[1]) {
      blocks.push(codeMatch[1].trim());
    }
  }

  // Then check for DIFFBLOCK blocks
  if (blocks.length === 0) {
    const diffBlockRegex = /<DIFFBLOCK>\s*([\s\S]*?)\s*<\/DIFFBLOCK>/g;
    let diffMatch: RegExpExecArray | null;
    while ((diffMatch = diffBlockRegex.exec(input)) !== null) {
      if (diffMatch[1]) {
        blocks.push(diffMatch[1].trim());
      }
    }
  }

  // Then check for REPLACEINFILE blocks
  if (blocks.length === 0) {
    const replaceRegex = /<REPLACEINFILE>\s*([\s\S]*?)\s*<\/REPLACEINFILE>/g;
    let replaceMatch: RegExpExecArray | null;
    while ((replaceMatch = replaceRegex.exec(input)) !== null) {
      if (replaceMatch[1]) {
        blocks.push(replaceMatch[1].trim());
      }
    }
  }

  // If no blocks found, treat the entire input as a single block
  return blocks.length === 0 ? [input] : blocks;
}

/**
 * Process a new file diff block
 */
function processNewFile(diffBlock: string, baseDir: string): Error | null {
  try {
    // Look for the path in the format "+++ b/path/to/file" or "+++ /dev/null"
    const filePathMatch =
      diffBlock.match(/\+\+\+ b\/([^\n]+)/) ||
      diffBlock.match(/\+\+\+ ([^\n]+)/);
    if (!filePathMatch) {
      throw new Error("Could not find file path in new file block.");
    }

    // Extract the file path, removing the "b/" prefix if present
    const filePath = filePathMatch[1]?.trim().replace(/^b\//, "") ?? "";
    const fullPath = path.join(baseDir, filePath);

    console.log(`Processing new file: ${filePath} (full path: ${fullPath})`);

    const lines = diffBlock.split("\n");
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

    while (
      contentLines.length > 0 &&
      contentLines[contentLines.length - 1] === ""
    ) {
      contentLines.pop();
    }

    const fileContent = contentLines.join("\n");

    fsExtra.ensureDirSync(path.dirname(fullPath));
    fsExtra.writeFileSync(fullPath, fileContent + "\n");
    console.log(`📄 Created new file: ${filePath}`);
    return null; // Return null to indicate success
  } catch (error: any) {
    console.error(`❌ Error processing new file: ${error.message}`);
    return error; // Return the error object
  }
}

/**
 * Process a deleted file diff block
 */
function processDeletedFile(diffBlock: string, baseDir: string): Error | null {
  try {
    const filePathMatch = diffBlock.match(/--- a\/(.+)/);
    if (!filePathMatch) {
      throw new Error("Could not find file path in delete block.");
    }

    const filePath = filePathMatch[1]?.trim() ?? "";
    const fullPath = path.join(baseDir, filePath);

    if (fsExtra.existsSync(fullPath)) {
      fsExtra.removeSync(fullPath);
      console.log(`🗑️ Deleted file: ${filePath}`);
    } else {
      console.warn(`⚠️ File ${filePath} does not exist, skipping deletion.`);
    }
    return null; // Return null to indicate success
  } catch (error: any) {
    console.error(`❌ Error processing deleted file: ${error.message}`);
    return error; // Return the error object
  }
}

/**
 * Process a modified file diff block
 */
function processModifiedFile(diffBlock: string, baseDir: string): Error | null {
  try {
    // Look for the path in the format "+++ b/path/to/file" or "+++ path/to/file"
    const filePathMatch =
      diffBlock.match(/\+\+\+ b\/([^\n]+)/) ||
      diffBlock.match(/\+\+\+ ([^\n]+)/);
    if (!filePathMatch) {
      throw new Error("Could not determine target file path in diff block.");
    }

    // Extract the file path, removing the "b/" prefix if present
    const filePath = filePathMatch[1]?.trim().replace(/^b\//, "") ?? "";
    const fullPath = path.join(baseDir, filePath);

    console.log(
      `Processing modified file: ${filePath} (full path: ${fullPath})`
    );

    if (!fsExtra.existsSync(fullPath)) {
      fsExtra.ensureDirSync(path.dirname(fullPath));
      fsExtra.writeFileSync(fullPath, "", "utf8");
      console.log(`📄 Created an empty file for modification: ${filePath}`);
    }

    // Read the file content and normalize it
    let fileContent = fsExtra.readFileSync(fullPath, "utf8");

    // Normalize indentation and whitespace to avoid mismatches
    const normalizeText = (text: string): string => {
      return text
        .replace(/\t/g, "  ") // Convert tabs to spaces
        .replace(/\r\n/g, "\n") // Normalize line endings
        .replace(/ +$/gm, ""); // Remove trailing spaces
    };

    fileContent = normalizeText(fileContent);
    const normalizedDiff = normalizeText(diffBlock);

    const patches = parsePatch(normalizedDiff);
    if (!patches.length) {
      throw new Error(`Failed to parse patch for ${filePath}`);
    }

    const patchedContent = applyPatch(fileContent, patches[0] as ParsedDiff, {
      fuzzFactor: 10,
    });

    if (patchedContent === false) {
      throw new Error(`Patch application failed for ${filePath}`);
    }

    fsExtra.writeFileSync(fullPath, patchedContent, "utf8");
    console.log(`✅ Successfully applied diff to ${filePath}`);

    return null;
  } catch (error: any) {
    console.error(`❌ Error in processModifiedFile: ${error.message}`);
    return error; // Return error instead of throwing it
  }
}

/**
 * Process a replace-in-file diff block
 */
export function processReplaceInFile(
  diffBlock: string,
  baseDir: string
): Error | null {
  try {
    // 1. Extract & Validate Input
    const pathMatch = diffBlock.match(/<path>(.*?)<\/path>/);
    const diffMatch = diffBlock.match(/<diff>([\s\S]*?)<\/diff>/);
    if (!pathMatch || !diffMatch) {
      throw new Error("Invalid <REPLACEINFILE> format");
    }
    const filePath = pathMatch[1]?.trim() ?? "";
    const fullPath = path.join(baseDir, filePath);
    let diffContent = diffMatch[1]?.trim() ?? "";

    // 2. Determine File Existence
    if (!fsExtra.existsSync(fullPath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }
    let fileContent = fsExtra.readFileSync(fullPath, "utf8");

    try {
      fileContent = improvedConstructNewFileContent(diffContent, fullPath);
    } catch (error: any) {
      console.error(`❌ Diff processing failed: ${error.message}`);

      // Log to file for debugging
      const logDir = path.join(baseDir, "../logs");
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

      throw new Error(`SEARCH block mismatch in ${filePath}: ${error.message}`);
    }

    fileContent = fileContent.trimEnd();
    fsExtra.writeFileSync(fullPath, fileContent, "utf8");

    console.log(`✅ Applied <REPLACEINFILE> modifications to ${filePath}`);
    return null;
  } catch (error: any) {
    console.error(`❌ Error in processReplaceInFile: ${error.message}`);
    return error;
  }
}

/**
 * Improve file content with diff block
 */
function improvedConstructNewFileContent(
  diff: string,
  filePath: string
): string {
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
      fileContent = replaceCodeInFile(fileContent, searchPart, replacePart);
    } catch (error: any) {
      throw new Error(`Block #${index + 1}: ${error.message}`);
    }
  });

  return fileContent;
}
