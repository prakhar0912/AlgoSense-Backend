import express from 'express'
import logger from 'morgan'
import cors from 'cors'
import methodOverride from 'method-override'
import routes from './routes/index.js'
import type IError from '../../../interfaces/error.js'
import { getOAuthProtectedResourceMetadataUrl, requireBearerAuth, createMcpExpressApp, mcpAuthMetadataRouter } from '@modelcontextprotocol/express'
import type { OAuthMetadata } from '@modelcontextprotocol/server'
import { toNodeHandler } from '@modelcontextprotocol/node'
import { algoSenseMcpHandler } from '../../mcp/index.js'

import keys from '../../../config/app.js'

import { auth0McpTokenVerifier } from '../../utils/auth/auth0/auth.js'


// const app: express.Application = express()

const app = createMcpExpressApp({
  host: process.env.HOST ?? '0.0.0.0',
  allowedHosts: [
    "http://localhost",
    'localhost',
    '127.0.0.1',
  ],
})


app.use(logger('dev'))
app.use(express.json())
app.use(
  cors({
    origin: '*', // Please don't do this in real-world apps
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  }),
)
app.use(express.urlencoded({ extended: false }))

// app.get('/', async (_req: express.Request, res: express.Response) => {
//   res.send({ name: 'AlgoSense API' })
// })

const auth0Issuer = keys.auth0.issuer_base_url
const oauthMetadata: OAuthMetadata = {
  issuer: auth0Issuer,
  authorization_endpoint: `${auth0Issuer}/
    authorize`,
  token_endpoint: `${auth0Issuer}/oauth/token`,
  jwks_uri: `${auth0Issuer}/.well-known/jwks.json`,
  response_types_supported: ['code'],
  grant_types_supported: ['authorization_code',
    'refresh_token'],
  code_challenge_methods_supported: ['RS256'],
  registration_endpoint: `${auth0Issuer}/oidc/
    register`,
}

app.use(
  mcpAuthMetadataRouter({
    oauthMetadata,
    resourceServerUrl: keys.mcp.mcpURL
  })
)


const requireMcpAuth = requireBearerAuth({
  verifier: auth0McpTokenVerifier,
  requiredScopes: ['mcp:connect'],
  resourceMetadataUrl:
    getOAuthProtectedResourceMetadataUrl(keys.mcp.mcpURL),
})

app.use(requireMcpAuth)

const mcpNodeHandler = toNodeHandler(algoSenseMcpHandler)
app.all('/mcp', (req: express.Request, res: express.Response) => {
  mcpNodeHandler(req, res, req.body)
})

routes.attach(app)

app.use(/(.*)/, (req: express.Request, res: express.Response) => {
  res.status(404).send({
    error: 'NotFound',
    message: `Cannot ${req.method} ${req.baseUrl}`,
  })
})

app.use(methodOverride())
app.use((err: IError, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err)
  res.status(err.httpStatusCode || 500).json({
    error: err.name,
    message: err.message,
    details: err?.details,
    originalError: err?.originalError
  })
})

export default app
