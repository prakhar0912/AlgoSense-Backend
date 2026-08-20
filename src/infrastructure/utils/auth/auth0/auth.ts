import keys from "../../../../config/app.js";
import { auth } from "express-oauth2-jwt-bearer";

export default auth({
  audience: keys.auth0.audience,
  issuerBaseURL: keys.auth0.issuer_base_url,
  tokenSigningAlg: 'RS256',
})
