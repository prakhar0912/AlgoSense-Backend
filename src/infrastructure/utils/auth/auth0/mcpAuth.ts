import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { OAuthTokenVerifier } from '@modelcontextprotocol/server'
import {
  OAuthError,
  OAuthErrorCode,
} from '@modelcontextprotocol/server'
import type { AuthInfo } from '@modelcontextprotocol/server'
import keys from '../../../../config/app.js'

const issuer = new URL(keys.auth0.issuer_base_url)
const audience = "http://localhost:3000/mcp"

const jwks = createRemoteJWKSet(
  new URL('.well-known/jwks.json', issuer),
)

function claimStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.split(/\s+/).filter(Boolean)
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item
      === 'string')
  }

  return []
}

export const auth0McpTokenVerifier: OAuthTokenVerifier = {
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: issuer.href,
        audience,
        algorithms: ['RS256'],
      })

      if (typeof payload.sub !== 'string' || typeof
        payload.exp !== 'number') {
        throw new Error('Access token is missing sub or exp')
      }

      // Auth0 can emit OAuth scopes in `scope` and RBAC permissions in
      // `permissions`; normalize both for MCP tool authorization.
      const scopes = [...new Set([
        ...claimStrings(payload.scope),
        ...claimStrings(payload.permissions),
      ])]

      type AuthPayload = AuthInfo & {
        extra: {
          user_id: string,
          roles: string[] | [],
          is_new_user: number,
          email: string,
          email_verified: boolean,
          first_name: string,
          iss: string,
          aud: string,
          iat: number,
          exp: number,
          azp: string,
        }
      }

      const authPayload: AuthPayload =
      {
        token,
        clientId: payload.sub,
        scopes,
        expiresAt: payload.exp,
        extra: {
          user_id: payload.sub,
          roles: payload['https://algosense.com/roles'] as string[] | [],
          is_new_user: payload['https://algosense.com/is_new_user'] as number,
          email: payload['https://algosense.com/email'] as string,
          email_verified: payload['https://algosense.com/email_verified'] as boolean,
          first_name: payload['https://algosense.com/name'] as string,
          iss: payload.iss as string,
          sub: payload.sub as string,
          aud: payload.aud as string,
          iat: payload.iat as number,
          exp: payload.exp as number,
          azp: payload.azp as string,
        },
      }
      return authPayload
    } catch (e) {
      console.log(e)
      throw new OAuthError(
        OAuthErrorCode.InvalidToken,
        'Invalid or expired access token',
      )
    }
  },
}
