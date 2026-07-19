
import MySQLArticleDAO from '../infrastructure/data-access/articleDAO.js'
import MySQLUserDAO from '../infrastructure/data-access/userDAO.js'
import encryptPassword from '../infrastructure/utils/auth/encryptPassword.js'
import issueToken from '../infrastructure/utils/auth/issueToken.js'
import verifyToken from '../infrastructure/utils/auth/verifyToken.js'
import passwordsMatch from '../infrastructure/utils/auth/passwordsMatch.js'
import * as validators from '../infrastructure/validation/zod/index.js'

export default {
  user: {
    validators: validators.user,
    DAO: MySQLUserDAO,
  },
  article: {
    validators: validators.article,
    DAO: MySQLArticleDAO,
  },
  utils: {
    encryptPassword,
    issueToken,
    verifyToken,
    passwordsMatch,
  },
}
