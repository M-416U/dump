export const toolDescriptions = `
## **Format Rules**  
1. **Use \`<CODE>\` for new files and file deletion:**  
   - Use \`<DIFFBLOCK>\` for code diffs.  
   - **Include \`+\` and \`-\` symbols in \`<CODE>\` blocks** following git-style diff format.
   - **Only use \`<CODE>\` when creating a file for the first time** or deleting a file.  
   - If creating multiple files, wrap each file's diff in a separate \`<DIFFBLOCK>\`.  

2. **Ensure consistent indentation and formatting.**  
3. **ALWAYS run linting and cleanup after generation.**  
4. **Every SEARCH MUST HAVE a REPLACE.**  
5. **Never assume unknown information—always ask.**  

---

## **Tool Descriptions**  
### \`<READFILE>\`  
- **Purpose:** Read the content of a file.  
- **Input:** Relative file path.  
- **Output:** File content or "File not found."  

**Example:**  
\`\`\`xml
<READFILE>/src/index.js</READFILE>
\`\`\`

---

### \`<COMMAND>\`  
- **Purpose:** Execute a shell command.  
- **Input:** Command.  
- **Output:** Command result or error.  

**Example:**  
\`\`\`xml
<COMMAND>ls</COMMAND>
\`\`\`

---

### \`<ASKUSER>\`  
- **Purpose:** Get input from user.  
- **Input:** Question.  
- **Output:** User input.  

**Example:**  
\`\`\`xml
<ASKUSER>What framework do you want to use?</ASKUSER>
\`\`\`

---

### \`<CODE>\`  
- **Purpose:** Generate new files or delete files only.  
- **Input:** Code wrapped in one or more \`<DIFFBLOCK>\` elements.  
- **Output:** "Code processed successfully" or error.  
- **Usage Notes:**
   - Use \`<CODE>\` **EXCLUSIVELY** for creating files for the very first time or deleting existing files.  
   - Use \`<CODE>\` **only when creating a file for the first time** or deleting a file.  
   - **DO USE \`+\` and \`-\` symbols** in \`<CODE>\` blocks following git-style diff format.
   - You can create multiple files in one \`<CODE>\` block by adding each file's diff inside a separate \`<DIFFBLOCK>\`.  

✅ Creating multiple files:  
\`\`\`xml
<CODE>
<DIFFBLOCK>
new file mode 100644
--- /dev/null
+++ b/index.js
@@ -0,0 +1,3 @@
+console.log("Hello, World!");
+module.exports = {};
</DIFFBLOCK>
<DIFFBLOCK>
new file mode 100644
--- /dev/null
+++ b/server.js
@@-0,0 +1,3 @@
+console.log("Hello, server!");
+module.exports = {};
</DIFFBLOCK>
</CODE>
\`\`\`

✅ Deleting a file:  
\`\`\`xml
<CODE>
<DIFFBLOCK>
deleted file mode 100644
--- a/config.js
+++ /dev/null
</DIFFBLOCK>
</CODE>
\`\`\`

---

## REPLACEINFILE
Description: Request to replace sections of content in an existing file using SEARCH/REPLACE blocks that define exact changes to specific parts of the file. This tool should be used when you need to make targeted changes to specific parts of a file.
Parameters:
- path: (required) The path of the file to modify (relative to the current working directory)
- blocks: (required) One or more SEARCH/REPLACE blocks following this exact format:
  \`\`\`
  <<<<<<< SEARCH
  [exact content to find]
  =======
  [new content to replace with]
  >>>>>>> REPLACE
  \`\`\`
  Critical rules:
  1. SEARCH content must match the associated file section to find EXACTLY:
     * Match character-for-character including whitespace, indentation, line endings
     * Include all comments, docstrings, etc.
  2. SEARCH/REPLACE blocks will ONLY replace the first match occurrence.
     * Including multiple unique SEARCH/REPLACE blocks if you need to make multiple changes.
     * Include *just* enough lines in each SEARCH section to uniquely match each set of lines that need to change.
     * When using multiple SEARCH/REPLACE blocks, list them in the order they appear in the file.
  3. Keep SEARCH/REPLACE blocks concise:
     * Break large SEARCH/REPLACE blocks into a series of smaller blocks that each change a small portion of the file.
     * Include just the changing lines, and a few surrounding lines if needed for uniqueness.
     * Do not include long runs of unchanging lines in SEARCH/REPLACE blocks.
     * Each line must be complete. Never truncate lines mid-way through as this can cause matching failures.
  4. Special operations:
     * To move code: Use two SEARCH/REPLACE blocks (one to delete from original + one to insert at new location)
     * To delete code: Use empty REPLACE section
     * **Notes**
     *   every SEARCH must have closing REPLACE tag between them \`=======\`
Usage:
<REPLACEINFILE>
<path>File path here</path>
<blocks>
Search and replace blocks here
   ex:
      <<<<<<< SEARCH
      content to search
      =======
      new content
      >>>>>>> REPLACE
</blocks>
</REPLACEINFILE>
---

### \`<LISTFILES>\`  
- **Purpose:** List all files in the project.  
- **Input:** None.  
- **Output:** List of file names.  

**Example:**  
\`\`\`xml
<LISTFILES></LISTFILES>
\`\`\`

---

### \`<WRITETOFILE>\`  
- **Purpose:** Write content to a file (create or overwrite).  
- **Input:** File path and content.  
- **Output:** "File written successfully" or error.  

**Example:**  
\`\`\`xml
<WRITETOFILE>
<path>/src/data.json</path>
<content>{"key": "value"}</content>
</WRITETOFILE>
\`\`\`

---

## **MCP Tools**  
{{MCPTOOLS}}


---
✅ Modify Existing File:  
\`\`\`xml
<REPLACEINFILE>
<path>/src/App.jsx</path>
<blocks>
<<<<<<< SEARCH
const title = "Old Title";
=======
const title = "New Title";
>>>>>>> REPLACE
</blocks>
</REPLACEINFILE>
\`\`\`
---
## **Correct Usage Examples**  
✅ New File:  
\`\`\`xml
<CODE>
<DIFFBLOCK>
new file mode 100644
--- /dev/null
+++ b/config.js
@@-0,0 +1,2 @@
+const config = {};
+module.exports = config;
</DIFFBLOCK>
</CODE>
\`\`\`

✅ File Deletion:  
\`\`\`xml
<CODE>
<DIFFBLOCK>
deleted file mode 100644
--- a/config.js
+++ /dev/null
</DIFFBLOCK>
</CODE>
\`\`\`

---

## **MCP Tool Usage**  
When you need to use a tool, wrap it in \`<MCP></MCP>\` and respond in **structured JSON** format like this:  
\`\`\`xml
<MCP>
{
  "server": "serverId",
  "tool": "toolName",
  "args": {
    "paramName": "value"
  }
}
</MCP>
\`\`\`
---
**BAD EXAMPLES NEVER USE**
    \`\`\`
   <REPLACEINFILE>
      <path>index.html</path>
      <blocks>
      <<<<<<< SEARCH
      =======
      =======
      </blocks>
   </REPLACEINFILE>
    \`\`\`
   -MISSING THE REPLACE TAG
---
- **Only one tool can be used at a time.**  
- **Ensure the \`args\` object follows the defined JSON schema for the tool.**  
`;

export const toolsPromptAsjson = `
## **Tools Documentation**

${JSON.stringify(
  {
    tools: {
      READFILE: {
        purpose: "Read the content of a file",
        input: {
          path: {
            type: "string",
            description: "Relative file path",
            required: true,
          },
        },
        output: "File content or 'File not found'",
        example: "<READFILE>/src/index.js</READFILE>",
      },
      COMMAND: {
        purpose: "Execute a shell command",
        input: {
          command: {
            type: "string",
            description: "Command to execute",
            required: true,
          },
        },
        output: "Command result or error",
        example: "<COMMAND>ls</COMMAND>",
      },
      ASKUSER: {
        purpose: "Get input from user",
        input: {
          question: {
            type: "string",
            description: "Question to ask the user",
            required: true,
          },
        },
        output: "User input",
        example: "<ASKUSER>What framework do you want to use?</ASKUSER>",
      },
      CODE: {
        purpose: "Generate new files or delete files only",
        input: {
          diffblocks: {
            type: "array",
            description: "One or more DIFFBLOCK elements",
            required: true,
          },
        },
        rules: [
          "Use EXCLUSIVELY for creating files for the first time or deleting files",
          "DO USE + and - symbols in blocks following git-style diff format",
          "Wrap each file's diff in a separate DIFFBLOCK",
        ],
        output: "Code processed successfully or error",
        examples: {
          create: {
            description: "Creating a new file",
            template: `<CODE>
<DIFFBLOCK>
new file mode 100644
--- /dev/null
+++ b/config.js
@@-0,0 +1,2 @@
+const config = {};
+module.exports = config;
</DIFFBLOCK>
</CODE>`,
          },
          delete: {
            description: "Deleting a file",
            template: `<CODE>
<DIFFBLOCK>
deleted file mode 100644
--- a/config.js
+++ /dev/null
</DIFFBLOCK>
</CODE>`,
          },
        },
      },
      REPLACEINFILE: {
        purpose: "Replace sections of content in existing files",
        input: {
          path: {
            type: "string",
            description:
              "Path of file to modify (relative to working directory)",
            required: true,
          },
          blocks: {
            type: "array",
            description: "SEARCH/REPLACE blocks",
            format: {
              search: "Exact content to find",
              separator: "=======",
              replace: "New content to replace with",
            },
            required: true,
          },
        },
        rules: {
          matching: [
            "Match character-for-character including whitespace and indentation",
            "Include all comments and docstrings",
            "Only first match occurrence will be replaced",
            "every SEARCH must have closing REPLACE tag between them `=======`",
          ],
          blocks: [
            "Keep blocks concise",
            "Include just changing lines plus minimal context",
            "List blocks in file order",
            "Never truncate lines",
          ],
          special: {
            moveCode: "Use two blocks (delete + insert)",
            deleteCode: "Use empty REPLACE section",
          },
        },
        example: `<REPLACEINFILE>
<path>/src/App.jsx</path>
<blocks>
<<<<<<< SEARCH
const title = "Old Title";
=======
const title = "New Title";
>>>>>>> REPLACE
</blocks>
</REPLACEINFILE>`,
      },
      LISTFILES: {
        purpose: "List all files in the project",
        input: {},
        output: "List of file names",
        example: "<LISTFILES></LISTFILES>",
      },
      WRITETOFILE: {
        purpose: "Write content to a file (create or overwrite)",
        input: {
          path: {
            type: "string",
            description: "File path",
            required: true,
          },
          content: {
            type: "string",
            description: "Content to write",
            required: true,
          },
        },
        output: "File written successfully or error",
        example: `<WRITETOFILE>
<path>/src/data.json</path>
<content>{"key": "value"}</content>
</WRITETOFILE>`,
      },
    },
  },
  null,
  2
)}

## **Global Rules**
1. Only one tool can be used at a time
2. Always ensure consistent formatting
3. Run linting after generation
4. Never assume unknown information
5. Every SEARCH must have a REPLACE
`;
