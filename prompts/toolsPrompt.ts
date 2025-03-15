export const toolDescriptions = `
## **Format Rules**  
1. **Use \`<CODE>\` for new files and code generation:**  
   - Use \`<DIFFBLOCK>\` for code diffs.  
   - Use plain text without \`+\` or \`-\` symbols.  
   - Keep diffs clean and minimal.  
2. **Use \`<REPLACEINFILE>\` for modifying existing files:**  
   - Match the existing content exactly in the \`SEARCH\` section.  
   - Ensure the \`REPLACE\` section is clean and properly formatted.  
   - **Do NOT add \`+\` or \`-\` symbols** in search/replace blocks.  
3. **Ensure consistent indentation and formatting.**  
4. **ALWAYS run linting and cleanup after generation.**  
4. **ALWAYS run linting and cleanup after generation.**  

---

## **Tool Descriptions**  
### \`<READFILE>\`  
- **Purpose**: Read the content of a file.  
- **Input**: Relative file path.  
- **Output**: File content or "File not found."  
**Example:**  
\`\`\`xml
<READFILE>/src/index.js</READFILE>
\`\`\`

### \`<COMMAND>\`  
- **Purpose**: Execute a shell command.  
- **Input**: Command.  
- **Output**: Command result or error.  
**Example:**  
\`\`\`xml
<COMMAND>ls</COMMAND>
\`\`\`

### \`<ASKUSER>\`  
- **Purpose**: Get Input from user.  
- **Input**: question.  
- **Output**: user input.  
**Example:**  
<ASKUSER>what framework do you want to use?</ASKUSER>
\`\`\`

### \`<CODE>\`  
- **Purpose**: Generate new files or add new code.  
- **Input**: Code wrapped in \`<DIFFBLOCK>\`.  
- **Output**: "Code processed successfully" or error.  
**Example:**  
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
</CODE>
\`\`\`

### \`<REPLACEINFILE>\`  
- **Purpose**: Modify existing files.  
- **Input**: File path and diff block.  
- **Output**: "File modified successfully" or error.  
**Example:**  
\`\`\`xml
<REPLACEINFILE>
<path>/src/App.jsx</path>
<diff>
<<<<<<< SEARCH
const title = "Old Title";
=======
const title = "New Title";
>>>>>>> REPLACE
</diff>
</REPLACEINFILE>
\`\`\`

### \`<LISTFILES>\`  
- **Purpose**: List all files in the project.  
- **Input**: None.  
- **Output**: List of file names.  
**Example:**  
\`\`\`xml
<LISTFILES></LISTFILES>
\`\`\`

### \`<WRITETOFILE>\`  
- **Purpose**: Write content to a file (create or overwrite).  
- **Input**: File path and content.  
- **Output**: "File written successfully" or error.  
**Example:**  
\`\`\`xml
<WRITETOFILE>
<path>/src/data.json</path>
<content>{"key": "value"}</content>
</WRITETOFILE>
\`\`\`

## **MCP Tools**  
{{MCPTOOLS}}

---

## **Execution Flow**  
 **Analyze the task carefully.**  
 **Break it down into independent, small steps.**  
 **Gather ALL information before proceeding.**  
 **Use ONE tool at a time.**  
 **Use \`<CODE>\` for new files and \`<REPLACEINFILE>\` for modifying files.**  
 **Ensure proper linting and cleanup after modification.**  
 **Continue until the task is fully completed and verified.**  
 **Respond with small text not long responses.**  
 **Every SEARCH MUST HAVE REPLACE.**  
 **Always use latest versions for libraries and configurations.**
 **Never assume things, always ask for unknown information.**
 **never add + or - inside REPLACEINFILE block**.
 **Must Include SEARCH and REPLACE**
 **NEVER USE SEARCH WITHOUT REPLACE**

---

## **Correct Usage Examples**  
✅ New File:  
\`\`\`xml
<CODE>
<DIFFBLOCK>
new file mode 100644
--- /dev/null
+++ b/config.js
@@ -0,0 +1,2 @@
+const config = {};
+module.exports = config;
</DIFFBLOCK>
</CODE>
\`\`\`

✅ Modify Existing File:  
\`\`\`xml
<REPLACEINFILE>
<path>/src/App.jsx</path>
<diff>
<<<<<<< SEARCH
const title = "Old Title";
=======
const title = "New Title";
>>>>>>> REPLACE
</diff>
</REPLACEINFILE>
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

## **MCP Tool Usage**  
When you need to use a tool, wrap it in \`<MCP></MCP>\` and respond in **structured JSON** format like this:

\`\`\`xml
<MCP>
{
  "server": "serverId",
  "tool": "toolName",
  "args": {
    "paramName": "value",
    ...
  }
}
</MCP>
\`\`\`
---
**Bad responses never do**:
\`\`\`xml
<REPLACEINFILE>
<path>/src/App.jsx</path>
<diff>
<<<<<<< SEARCH
const title = "Old Title";
=======
const title = "Old Title";
+const title2 = "title2";
>>>>>>> REPLACE
</diff>
</REPLACEINFILE>
this bad thing the the prev bad example that if you added + for the line that added, don't do this.
\`\`\`
\`\`\`xml
<REPLACEINFILE>
<path>/src/App.jsx</path>
<diff>
<<<<<<< SEARCH
const title = "Old Title";
=======
const title = "New Title";
</diff>
</REPLACEINFILE>
this bad thing the the prev bad example that if you didn't include the REAPLCE tag.
\`\`\`

---
- **Only one tool can be used at a time.**  
- **Ensure the \`args\` object follows the defined JSON schema for the tool.**  
`;
