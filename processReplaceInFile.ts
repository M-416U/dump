/**
 * Normalizes a string by collapsing whitespace and newlines
 * @param str The string to normalize
 * @returns Normalized string with collapsed whitespace
 */
const normalizeSearch = (str: string): string => {
  return str
    .replace(/\s+/g, " ") // Collapse all whitespaces (spaces, tabs) into a single space
    .replace(/\n+/g, " ") // Collapse multiple newlines into a single space
    .trim(); // Remove leading and trailing spaces
};

/**
 * Replaces a code block in a file content with a new code block
 * @param fileContent The content of the file
 * @param searchString The string to search for
 * @param replaceString The string to replace with
 * @returns The updated file content
 */
export function replaceCodeInFile(
  fileContent: string,
  searchString: string,
  replaceString: string
): string {
  const normalizedSearch = normalizeSearch(searchString); // Normalize the search string
  const fileLines = fileContent.split("\n");
  let matchStart = -1;
  let matchEnd = -1;

  // Find matching block using sliding window approach
  for (let i = 0; i < fileLines.length; i++) {
    const window = fileLines
      .slice(i, i + searchString.split("\n").length)
      .join("\n");

    if (normalizeSearch(window) === normalizedSearch) {
      matchStart = i;
      matchEnd = i + searchString.split("\n").length;
      break;
    }
  }

  if (matchStart === -1) {
    throw new Error(`Search pattern not found: ${searchString}`);
  }

  // Preserve the exact formatting for the replace block
  const replacementLines = replaceString.split("\n");

  // Rebuild content with replacement (preserving the replace block formatting)
  return [
    ...fileLines.slice(0, matchStart),
    ...replacementLines,
    ...fileLines.slice(matchEnd),
  ].join("\n");
}
