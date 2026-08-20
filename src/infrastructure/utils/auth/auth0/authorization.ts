import { claimCheck } from "express-oauth2-jwt-bearer";
import UnauthorizedError from "../../../../errors/unauthorizedError.js";

export default function checkPermission(requiredPermissions: string[]) {
  return claimCheck((claims) => {
    const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const userPermissions = claims.permissions as string[] || [];

    const hasAccess = required.every(perm => userPermissions.includes(perm));

    if (!hasAccess) {
      throw new UnauthorizedError("You are not authorized to access this route.")
    }
    return true
  });
}
