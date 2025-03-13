import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import * as fs from "fs/promises";
import * as path from "path";

type TransportType = "stdio" | "sse";

type StdioConfig = {
  command: string;
  args?: string[];
};

type SSEConfig = {
  endpoint: string;
  messageEndpoint: string;
};

type ServerConfig = {
  id: string;
  name: string;
  version: string;
  transportType: TransportType;
  transportConfig: StdioConfig | SSEConfig;
  capabilities?: {
    prompts?: Record<string, any>;
    resources?: Record<string, any>;
    tools?: Record<string, any>;
  };
  autoConnect?: boolean;
};

type ServerMetadata = {
  id: string;
  name: string;
  version: string;
  transportType: TransportType;
  isConnected: boolean;
  capabilities: string[];
  lastConnected?: Date;
};

type ToolInfo = {
  serverId: string;
  serverName: string;
  name: string;
  description: string;
  parameters: Record<string, any>;
};

/**
 * Manages MCP client connections to multiple servers.
 */
export class MCPClientManager {
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, StdioClientTransport | SSEClientTransport> =
    new Map();
  private serverConfigs: Map<string, ServerConfig> = new Map();
  private configFilePath: string;

  /**
   * Create a new MCP Client Manager
   * @param configFilePath - Path to the JSON configuration file
   */
  constructor(configFilePath: string = "mcp-servers.json") {
    this.configFilePath = configFilePath;
  }

  /**
   * Initialize the client manager by loading configuration from file
   */
  async initialize(): Promise<void> {
    try {
      await this.loadConfiguration();

      // Auto-connect to servers if configured
      const autoConnectServers = Array.from(this.serverConfigs.values()).filter(
        (config) => config.autoConnect
      );

      for (const config of autoConnectServers) {
        try {
          await this.connectServer(config.id);
        } catch (error) {
          console.error(
            `Failed to auto-connect to server ${config.id}:`,
            error
          );
        }
      }
    } catch (error) {
      // If the config file doesn't exist yet, create an empty one
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        await this.saveConfiguration();
      } else {
        throw error;
      }
    }
  }

  /**
   * Add a new server configuration
   * @param config - Server configuration
   */
  async addServer(config: ServerConfig): Promise<void> {
    if (this.serverConfigs.has(config.id)) {
      throw new Error(`Server with ID '${config.id}' already exists`);
    }

    this.serverConfigs.set(config.id, config);
    await this.saveConfiguration();
  }

  /**
   * Update an existing server configuration
   * @param serverId - ID of the server to update
   * @param config - New server configuration
   */
  async updateServer(
    serverId: string,
    config: Partial<ServerConfig>
  ): Promise<void> {
    const existingConfig = this.serverConfigs.get(serverId);
    if (!existingConfig) {
      throw new Error(`Server with ID '${serverId}' not found`);
    }

    const updatedConfig = { ...existingConfig, ...config, id: serverId };
    this.serverConfigs.set(serverId, updatedConfig);
    await this.saveConfiguration();

    // If server is currently connected, disconnect it so changes take effect on next connect
    if (this.clients.has(serverId)) {
      await this.disconnectServer(serverId);
    }
  }

  /**
   * Remove a server configuration
   * @param serverId - ID of the server to remove
   */
  async removeServer(serverId: string): Promise<void> {
    if (!this.serverConfigs.has(serverId)) {
      throw new Error(`Server with ID '${serverId}' not found`);
    }

    // Disconnect if connected
    if (this.clients.has(serverId)) {
      await this.disconnectServer(serverId);
    }

    this.serverConfigs.delete(serverId);
    await this.saveConfiguration();
  }

  /**
   * Get all server configurations
   * @returns Array of server configurations
   */
  getServerConfigs(): ServerConfig[] {
    return Array.from(this.serverConfigs.values());
  }

  /**
   * Get metadata about all servers
   * @returns Array of server metadata
   */
  getServersMetadata(): ServerMetadata[] {
    return Array.from(this.serverConfigs.entries()).map(([id, config]) => {
      return {
        id,
        name: config.name,
        version: config.version,
        transportType: config.transportType,
        isConnected: this.clients.has(id),
        capabilities: config.capabilities
          ? Object.keys(config.capabilities)
          : [],
        lastConnected: this.clients.has(id) ? new Date() : undefined,
      };
    });
  }

  /**
   * Connect to a server
   * @param serverId - ID of the server to connect to
   * @returns The connected client
   */
  async connectServer(serverId: string): Promise<Client> {
    if (this.clients.has(serverId)) {
      return this.clients.get(serverId)!;
    }

    const config = this.serverConfigs.get(serverId);
    if (!config) {
      throw new Error(`Server with ID '${serverId}' not found`);
    }

    // Create client with given configuration
    const client = new Client(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: config.capabilities || {
          prompts: {},
          resources: {},
          tools: {},
        },
      }
    );

    // Create appropriate transport based on config
    const transport = this.createTransport(
      config.transportType,
      config.transportConfig
    );
    this.transports.set(serverId, transport);

    // Connect client to transport
    await client.connect(transport);

    // Store client for later use
    this.clients.set(serverId, client);

    return client;
  }

  /**
   * Get a connected client by server ID
   * @param serverId - ID of the server
   * @returns The connected client
   */
  getClient(serverId: string): Client {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Not connected to server '${serverId}'`);
    }
    return client;
  }

  /**
   * Check if connected to a server
   * @param serverId - ID of the server
   * @returns True if connected
   */
  isConnected(serverId: string): boolean {
    return this.clients.has(serverId);
  }

  /**
   * Disconnect from a server
   * @param serverId - ID of the server to disconnect from
   */
  async disconnectServer(serverId: string): Promise<void> {
    const client = this.clients.get(serverId);
    if (!client) {
      return;
    }

    try {
      await client.close();
    } catch (error) {
      console.error(`Error disconnecting from server '${serverId}':`, error);
    } finally {
      this.clients.delete(serverId);
      this.transports.delete(serverId);
    }
  }

  /**
   * List all connected servers
   * @returns Array of connected server IDs
   */
  getConnectedServers(): string[] {
    return Array.from(this.clients.keys());
  }

  /**
   * Get all tools from all connected servers
   * @returns Promise that resolves to array of tool information
   */
  async getAllTools(): Promise<ToolInfo[]> {
    const connectedServers = this.getConnectedServers();
    const allTools: ToolInfo[] = [];

    for (const serverId of connectedServers) {
      try {
        const serverConfig = this.serverConfigs.get(serverId);
        const client = this.getClient(serverId);
        const tools = await client.listTools();
        tools.tools.forEach((tool) => {
          allTools.push({
            serverId,
            serverName: serverConfig?.name || serverId,
            name: tool.name,
            description: tool.description || "",
            parameters: tool.inputSchema || {},
          });
        });
      } catch (error) {
        console.error(`Error listing tools from server '${serverId}':`, error);
      }
    }

    return allTools;
  }

  /**
   * Call a tool on a specific server
   * @param serverId - ID of the server
   * @param toolName - Name of the tool
   * @param args - Arguments to pass to the tool
   * @returns Result of the tool call
   */
  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, any>
  ) {
    const client = this.getClient(serverId);
    const res = await client.callTool({
      name: toolName,
      arguments: args,
    });
    return JSON.stringify(res);
  }

  //   /**
  //    * Get all resources from all connected servers
  //    * @returns Array of resources grouped by server
  //    */
  //   async getAllResources() {
  //     const connectedServers = this.getConnectedServers();
  //     const allResources: Record<string, any[]> = {};

  //     for (const serverId of connectedServers) {
  //       try {
  //         const client = this.getClient(serverId);
  //         const resources = await client.listResources();
  //         allResources[serverId] = resources;
  //       } catch (error) {
  //         console.error(
  //           `Error listing resources from server '${serverId}':`,
  //           error
  //         );
  //       }
  //     }

  //     return allResources;
  //   }

  //   /**
  //    * Get all prompts from all connected servers
  //    * @returns Array of prompts grouped by server
  //    */
  //   async getAllPrompts() {
  //     const connectedServers = this.getConnectedServers();
  //     const allPrompts: Record<string, any[]> = {};

  //     for (const serverId of connectedServers) {
  //       try {
  //         const client = this.getClient(serverId);
  //         const prompts = await client.listPrompts();
  //         allPrompts[serverId] = prompts;
  //       } catch (error) {
  //         console.error(
  //           `Error listing prompts from server '${serverId}':`,
  //           error
  //         );
  //       }
  //     }

  //     return allPrompts;
  //   }

  //   /**
  //    * Read a resource from a specific server
  //    * @param serverId - ID of the server
  //    * @param resourceUri - URI of the resource to read
  //    * @returns The resource content
  //    */
  //   async readResource(serverId: string, resourceUri: string) {
  //     const client = this.getClient(serverId);
  //     return client.readResource(resourceUri);
  //   }

  //   /**
  //    * Get a prompt from a specific server
  //    * @param serverId - ID of the server
  //    * @param promptName - Name of the prompt
  //    * @param args - Arguments for the prompt
  //    * @returns The prompt
  //    */
  //   async getPrompt(
  //     serverId: string,
  //     promptName: string,
  //     args: Record<string, any>
  //   ) {
  //     const client = this.getClient(serverId);
  //     return client.getPrompt(promptName, args);
  //   }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const serverIds = Array.from(this.clients.keys());
    await Promise.all(serverIds.map((id) => this.disconnectServer(id)));
  }

  /**
   * Load server configurations from file
   */
  private async loadConfiguration(): Promise<void> {
    try {
      const resolvedPath = path.resolve(this.configFilePath);

      await fs.access(resolvedPath);

      const data = await fs.readFile(resolvedPath, "utf-8");

      if (!data.trim()) {
        console.log("File exists but is empty, initializing with empty array");
        this.serverConfigs.clear();
        return;
      }

      let configs: ServerConfig[];
      try {
        configs = JSON.parse(data) as ServerConfig[];
        if (!Array.isArray(configs)) {
          console.log("Data is not an array, converting to array format");
          configs = Object.values(configs);
        }
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        console.log("Initializing with empty array due to parse error");
        this.serverConfigs.clear();
        return;
      }

      this.serverConfigs.clear();
      configs.forEach((config) => {
        this.serverConfigs.set(config.id, config);
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        console.log("Config file doesn't exist, will create one");
        this.serverConfigs.clear();
        await this.saveConfiguration();
      } else {
        console.error("Error loading configuration:", error);
        throw error;
      }
    }
  }

  /**
   * Save server configurations to file
   */
  private async saveConfiguration(): Promise<void> {
    const configs = Array.from(this.serverConfigs.values());
    const dirPath = path.dirname(this.configFilePath);

    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory already exists, ignore
    }

    await fs.writeFile(
      this.configFilePath,
      JSON.stringify(configs, null, 2),
      "utf-8"
    );
  }

  /**
   * Creates the appropriate transport based on the type and configuration.
   * @param type - Type of transport to create
   * @param config - Configuration for the transport
   * @returns The created transport
   */
  private createTransport(
    type: TransportType,
    config: StdioConfig | SSEConfig
  ): StdioClientTransport | SSEClientTransport {
    switch (type) {
      case "stdio":
        const stdioConfig = config as StdioConfig;
        return new StdioClientTransport({
          command: stdioConfig.command,
          args: stdioConfig.args || [],
        });

      case "sse":
        const sseConfig = config as SSEConfig;
        return new SSEClientTransport(new URL(sseConfig.endpoint));

      default:
        throw new Error(`Unsupported transport type: ${type}`);
    }
  }
}
