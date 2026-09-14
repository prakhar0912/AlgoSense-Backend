import keys from "../../../../config/app.js";
import type { RequestHandler, Request, Response, NextFunction } from "express";
import { auth, InsufficientScopeError, InvalidRequestError, InvalidTokenError, UnauthorizedError as JwtUnauthorizedError } from "express-oauth2-jwt-bearer";
import UnauthorizedError from "../../../../errors/unauthorizedError.js";
import InternalServerError from "../../../../errors/internalServerError.js";

const auth0Middleware = auth({
  audience: keys.auth0.audience,
  issuerBaseURL: keys.auth0.issuer_base_url,
  tokenSigningAlg: "RS256",
});

const authenticate: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  auth0Middleware(req, res, (err: unknown) => {
    if (!err) return next();

    if (
      err instanceof JwtUnauthorizedError ||
      err instanceof InvalidTokenError ||
      err instanceof InvalidRequestError
    ) {
      return next(
        new UnauthorizedError(
          "Your token is invalid or expired. Please fetch a new token.",
          err,
        ),
      );
    }

    if (err instanceof InsufficientScopeError) {
      return next(new UnauthorizedError("Insufficient permission.", err));
    }

    return next(
      new InternalServerError("Unexpected error during token authentication.", err),
    );
  });
};

export default authenticate
