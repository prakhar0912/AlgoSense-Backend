import express from 'express'
import logger from 'morgan'
import cors from 'cors'
import methodOverride from 'method-override'
import routes from './routes/index.js'
import type IError from '../../../interfaces/error.js'
import { auth } from 'express-oauth2-jwt-bearer'


const app: express.Application = express()

app.use(logger('dev'))


app.use(auth({
  issuerBaseURL: 'https://dev-nk1w7ynwpkhbqmew.us.auth0.com/',
  audience: 'https://dev-nk1w7ynwpkhbqmew.us.auth0.com/api/v2/',
  tokenSigningAlg: 'RS256'
}))

app.use(express.json())
app.use(
  cors({
    origin: '*', // Please don't do this in real-world apps
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  }),
)
app.use(express.urlencoded({ extended: false }))

app.get('/', async (_req: express.Request, res: express.Response) => {
  res.send({ name: 'AlgoSense API' })
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
