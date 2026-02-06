/* eslint-disable */
/* biome-ignore-all lint: generated file */
export interface paths {
  "/api/v1/cli/messages/stream/{conversationId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** CLI/Raycast SSE message stream */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          conversationId: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description SSE stream */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/event-stream": string;
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/cli/rpc": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    get?: never;
    put?: never;
    /** CLI/Raycast RPC endpoint */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["CliRpcRequest"];
        };
      };
      responses: {
        /** @description RPC result */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
        /** @description Invalid API key */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
        /** @description Not found */
        404: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** List conversations */
    get: {
      parameters: {
        query?: {
          archived?: boolean;
          limit?: number;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Conversation list */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
        /** @description Unauthorized */
        401: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
      };
    };
    put?: never;
    /** Create conversation */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["CreateConversationRequest"];
        };
      };
      responses: {
        /** @description Created */
        201: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get conversation by id */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Conversation */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    /** Update conversation */
    patch: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          "application/json": {
            model?: string;
            title?: string;
          };
        };
      };
      responses: {
        /** @description Updated conversation */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
      };
    };
    trace?: never;
  };
  "/api/v1/conversations/{id}/messages": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** List messages */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Messages list */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"][];
          };
        };
      };
    };
    put?: never;
    /** Send message */
    post: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
        };
        cookie?: never;
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["SendMessageRequest"];
        };
      };
      responses: {
        /** @description Accepted */
        202: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
      };
    };
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/conversations/stream": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Stream conversations */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description SSE stream */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/event-stream": string;
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/doc": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** API documentation */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Swagger HTML or OpenAPI JSON */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content?: never;
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/health": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Health status */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Health envelope */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/messages/{id}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get message */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          id: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Message */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/messages/stream/{conversationId}": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Stream conversation messages */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path: {
          conversationId: string;
        };
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description SSE stream */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/event-stream": string;
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/openapi.json": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** OpenAPI JSON */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description OpenAPI spec */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": {
              [key: string]: unknown;
            };
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
  "/api/v1/preferences": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Get preferences */
    get: {
      parameters: {
        query?: {
          key?: string;
        };
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description Preferences */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    /** Update preference */
    patch: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody: {
        content: {
          "application/json": components["schemas"]["UpdatePreferenceRequest"];
        };
      };
      responses: {
        /** @description Updated preference */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "application/json": components["schemas"]["ApiEnvelope"];
          };
        };
      };
    };
    trace?: never;
  };
  "/api/v1/preferences/stream": {
    parameters: {
      query?: never;
      header?: never;
      path?: never;
      cookie?: never;
    };
    /** Stream preferences */
    get: {
      parameters: {
        query?: never;
        header?: never;
        path?: never;
        cookie?: never;
      };
      requestBody?: never;
      responses: {
        /** @description SSE stream */
        200: {
          headers: {
            [name: string]: unknown;
          };
          content: {
            "text/event-stream": string;
          };
        };
      };
    };
    put?: never;
    post?: never;
    delete?: never;
    options?: never;
    head?: never;
    patch?: never;
    trace?: never;
  };
}
export type webhooks = Record<string, never>;
export interface components {
  schemas: {
    ApiEnvelope: {
      data?: unknown;
      error?: components["schemas"]["ApiError"];
      /** @enum {string} */
      status: "success" | "error";
      sys: components["schemas"]["ApiSys"];
    };
    ApiError:
      | string
      | ({
          code?: string;
          details?: unknown;
          message: string;
        } & {
          [key: string]: unknown;
        });
    ApiSys: {
      async?: boolean;
      entity: string;
      id?: string;
      timestamps?: {
        [key: string]: string;
      };
    } & {
      [key: string]: unknown;
    };
    /** @enum {string} */
    CliRpcMethod:
      | "validateApiKey"
      | "listConversations"
      | "getConversation"
      | "listMessages"
      | "listModels"
      | "getUserDefaultModel"
      | "searchConversations"
      | "sendMessage"
      | "createConversation"
      | "archiveConversation"
      | "deleteConversation"
      | "updateConversationModel"
      | "renameConversation"
      | "createBookmark"
      | "listMemories"
      | "listProjects"
      | "listBookmarks"
      | "listTemplates"
      | "listTasks"
      | "createTask"
      | "updateTask"
      | "completeTask"
      | "deleteTask"
      | "listNotes"
      | "createNote"
      | "updateNote"
      | "deleteNote";
    CliRpcRequest: {
      method: components["schemas"]["CliRpcMethod"];
      params?: {
        [key: string]: unknown;
      };
    };
    CreateConversationRequest: {
      model: string;
      systemPrompt?: string;
      title?: string;
    };
    SendMessageRequest: {
      attachments?: {
        mimeType: string;
        name: string;
        size: number;
        storageId: string;
        /** @enum {string} */
        type: "file" | "image" | "audio";
      }[];
      content: string;
      modelId?: string;
      models?: string[];
      /** @enum {string} */
      thinkingEffort?: "none" | "low" | "medium" | "high";
    };
    SseEvent: {
      data: {
        [key: string]: unknown;
      };
      /** @enum {string} */
      event: "snapshot" | "update" | "error" | "heartbeat";
    };
    UpdatePreferenceRequest: {
      key: string;
      value: unknown;
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
