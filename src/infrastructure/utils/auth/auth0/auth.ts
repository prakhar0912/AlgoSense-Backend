import { auth } from 'express-oauth2-jwt-bearer'

export default auth({
  audience: 'https://algosense.com',
  issuerBaseURL: 'https://dev-nk1w7ynwpkhbqmew.us.auth0.com/',
  tokenSigningAlg: 'RS256',
})
