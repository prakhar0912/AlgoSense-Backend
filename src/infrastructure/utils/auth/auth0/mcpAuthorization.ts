import type { AuthInfo } from "@modelcontextprotocol/server"
import UnauthorizedError from "../../../../errors/unauthorizedError.js"

export default function requireScope(authInfo: AuthInfo | undefined, scope: string) {
  if (!authInfo?.scopes.includes(scope)) {
    throw new UnauthorizedError(`Missing required scope/permission: ${scope}`)
  }
}

