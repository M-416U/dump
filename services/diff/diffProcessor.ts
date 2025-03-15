import type { DiffBlock } from "./diffBlock";
import { DeletedFileDiffBlock } from "./processors/deletedFileProcessor";
import { ModifiedFileDiffBlock } from "./processors/modifiedFileProcessor";
import { NewFileDiffBlock } from "./processors/newFileProcessor";
import { ReplaceInFileDiffBlock } from "./processors/replaceInFileProcessor";

export class DiffProcessor {
  process(diffContent: string) {
    try {
      const blocks = this.splitDiffBlocks(diffContent);
      for (const block of blocks) {
        this.processBlock(block);
      }
      return null;
    } catch (error: any) {
      console.error(`❌ Error processing diff: ${error.message}`);
      return new Error(`Error processing diff: ${error.message}`);
    }
  }

  private splitDiffBlocks(diffContent: string): string[] {
    const blocks: string[] = [];

    // First check for CODE blocks
    const codeRegex = /<CODE>\s*([\s\S]*?)\s*<\/CODE>/g;
    let codeMatch: RegExpExecArray | null;
    while ((codeMatch = codeRegex.exec(diffContent)) !== null) {
      if (codeMatch[1]) {
        blocks.push(codeMatch[1].trim());
      }
    }

    // Then check for DIFFBLOCK blocks
    if (blocks.length === 0) {
      const diffBlockRegex = /<DIFFBLOCK>\s*([\s\S]*?)\s*<\/DIFFBLOCK>/g;
      let diffMatch: RegExpExecArray | null;
      while ((diffMatch = diffBlockRegex.exec(diffContent)) !== null) {
        if (diffMatch[1]) {
          blocks.push(diffMatch[1].trim());
        }
      }
    }

    // Then check for REPLACEINFILE blocks
    if (blocks.length === 0) {
      const replaceRegex = /<REPLACEINFILE>\s*([\s\S]*?)\s*<\/REPLACEINFILE>/g;
      let replaceMatch: RegExpExecArray | null;
      while ((replaceMatch = replaceRegex.exec(diffContent)) !== null) {
        if (replaceMatch[1]) {
          blocks.push(replaceMatch[1].trim());
        }
      }
    }
    return blocks.length === 0 ? [diffContent] : blocks;
  }

  private processBlock(diffBlock: string) {
    let blockInstance: DiffBlock | null = null;

    if (diffBlock.startsWith("<REPLACEINFILE>")) {
      blockInstance = new ReplaceInFileDiffBlock(diffBlock);
    } else if (diffBlock.startsWith("new file mode")) {
      blockInstance = new NewFileDiffBlock(diffBlock);
    } else if (diffBlock.startsWith("deleted file mode")) {
      blockInstance = new DeletedFileDiffBlock(diffBlock);
    } else {
      blockInstance = new ModifiedFileDiffBlock(diffBlock);
    }

    if (blockInstance) {
      try {
        console.log(`🚀 Processing block: ${diffBlock.substring(0, 50)}...`);
        blockInstance.apply();
      } catch (error: any) {
        console.error(`❌ Error processing diff block: ${error.message}`);
      }
    } else {
      console.warn(
        `⚠️ Unknown diff block type: ${diffBlock.substring(0, 50)}...`
      );
    }
  }
}
