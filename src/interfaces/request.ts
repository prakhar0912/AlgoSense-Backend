import type { ServerContext } from "@modelcontextprotocol/server";

export interface IRequest {
  userId?: string
  body?: unknown
  params?: Record<string, string | number | boolean>
  mcpServerContext?: ServerContext
}
