import express from 'express'
import logger from 'morgan'
import cors from 'cors'
import methodOverride from 'method-override'
import routes from './routes/index.js'
import type IError from '../../../interfaces/error.js'
import { auth } from 'express-oauth2-jwt-bearer'

import services from '../../../config/services.js'
import UserController from '../../../controllers/user.js'
import { GetSubmissionsById, UpdateUserProfile, RegisterUser, DeleteUser, FindUserbyId, SubmitSolution, UpdateConsistencyScore, UpdateUserScore } from '../../../use-cases/user/index.js'
import UnauthorizedError from '../../../errors/unauthorizedError.js'

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

app.use(auth({
  audience: 'https://algosense.com',
  issuerBaseURL: 'https://dev-nk1w7ynwpkhbqmew.us.auth0.com/',
  tokenSigningAlg: 'RS256',
}))

app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    let userPayload = req.auth?.payload
    if (!userPayload) {
      throw new UnauthorizedError("User isn't verified")
    }

    if (userPayload['https://algosense.com/is_new_user'] &&
      Number(userPayload['https://algosense.com/is_new_user']) <= 1) {

      const result = await userController.newUserRegistration({
        body: {
          id: userPayload.sub,
          email: userPayload['https://algosense.com/email'],
          first_name: userPayload['https://algosense.com/name'],
          created_at: new Date().toISOString(),
          email_verified: (userPayload['https://algosense.com/email_verified'] === 'true'),
          role: Array.isArray(userPayload['https://algosense.com/roles']) && userPayload['https://algosense.com/roles'].includes("algosense-admin") ? "admin" : "user",
          email_notifications_enabled: true,
          scores: {
            initial_elo_rating: 1500,
            elo_rating: 1500,
            topic_ratings: {},
            approaches_score: 0,
            days_logged_in: [],
            consistency_score: 0,
            edge_case_score: 0,
            total_score: 0
          }
        }
      })
    }

    next()
  }
  catch (err) {
    next(err)
  }
})

app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    let userPayload = req.auth?.payload
    if (!userPayload || !userPayload.sub) {
      throw new UnauthorizedError("User isn't verified")
    }
    await userController.updateConsistencyScores({ userId: userPayload.sub })
    next()
  }
  catch (err) {
    next(err)
  }
})



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
