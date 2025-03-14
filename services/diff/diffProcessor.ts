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
    return diffContent
      .split(/(?=^<.*?>)/m)
      .map((block) => block.trim())
      .filter(Boolean);
  }

  private processBlock(diffBlock: string) {
    let blockInstance: DiffBlock | null = null;

    if (diffBlock.startsWith("<NEWFILE>")) {
      blockInstance = new NewFileDiffBlock(diffBlock);
    } else if (diffBlock.startsWith("<DELETEFILE>")) {
      blockInstance = new DeletedFileDiffBlock(diffBlock);
    } else if (diffBlock.startsWith("<MODIFYFILE>")) {
      blockInstance = new ModifiedFileDiffBlock(diffBlock);
    } else if (diffBlock.startsWith("<REPLACEINFILE>")) {
      blockInstance = new ReplaceInFileDiffBlock(diffBlock);
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
