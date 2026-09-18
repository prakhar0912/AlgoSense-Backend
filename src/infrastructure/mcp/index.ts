import { createMcpHandler, type OAuthMetadata } from '@modelcontextprotocol/server';
import {
  createMcpExpressApp,
  getOAuthProtectedResourceMetadataUrl,
  mcpAuthMetadataRouter,
  requireBearerAuth,
} from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import type { AuthInfo } from '@modelcontextprotocol/server';
import config from '../../config/app.js';
import { auth0McpTokenVerifier } from '../utils/auth/auth0/mcpAuth.js';
import { getServer } from './server.js';
import type { Express } from 'express';



const resourceServerUrl = new
  URL(config.mcp.publicUrl);

const issuer = new URL(config.auth0.issuer_base_url);

const oauthMetadata: OAuthMetadata = {
  issuer: issuer.href,
  authorization_endpoint: new URL('authorize', issuer).href,
  token_endpoint: new URL('oauth/token', issuer).href,
  jwks_uri: new URL('.well-known/jwks.json', issuer).href,
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
  scopes_supported: ['openid', 'profile', 'email', 'mcp:connect'],
};

const app: Express = createMcpExpressApp({
  allowedHosts: [config.mcp.resourceHost, '127.0.0.1'],
});

app.use(mcpAuthMetadataRouter({ oauthMetadata, resourceServerUrl }));

const requireMcpAuth = requireBearerAuth({
  verifier: auth0McpTokenVerifier,
  requiredScopes: ['mcp:connect'],
  resourceMetadataUrl:
    getOAuthProtectedResourceMetadataUrl(resourceServerUrl),
});

// `authInfo` is populated only after signature, issuer,audience,
// expiration, and scope verification have succeeded.


const mcpHandler = toNodeHandler(
  createMcpHandler(({ authInfo }) => getServer(authInfo as AuthInfo)),
);

app.all('/mcp', requireMcpAuth, (req, res) => {
  void mcpHandler(req, res, req.body);
});

export default app;
