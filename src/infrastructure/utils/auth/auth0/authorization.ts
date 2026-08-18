import UnauthorizedError from '../../../../errors/unauthorizedError.js'
import type { RequestHandler } from
  'express'

export default function checkPermission(
  requiredPermissions: string[],
): RequestHandler {
  return (req, res, next) => {
    const granted = req.auth?.scopes ?? []

    const hasAccess =
      requiredPermissions.every((permission) =>
        granted.includes(permission),
      )

    if (!hasAccess) {
      throw new UnauthorizedError("You are not authorized to access this route.")
    }

    next()
  }
}


// export default function checkPermission(requiredPermissions: string[]) {
//   return claimCheck((claims) => {
//     // console.log(claims)
//     console.log('hehehe')
//     const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
//     const userPermissions = claims.permissions as string[] || [];
//
//     const hasAccess = required.every(perm => userPermissions.includes(perm));
//
//     if (!hasAccess) {
//       throw new UnauthorizedError("You are not authorized to access this route.")
//     }
//     return true
//   });
// }
