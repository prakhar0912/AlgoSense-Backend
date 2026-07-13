import UserController from "../controllers/user.js";

import RegisterUser from "../use-cases/user/register.js";

import { registerValidator } from "./validation/zod/index.js";
import UserDAO from "./data-access/userDAO.js";

const userDAO = new UserDAO()
const controller = new UserController(
  new RegisterUser(userDAO, registerValidator),
)

try {
  const result = await controller.newUserRegistration({
    body: {
      id: "0197f96c-b278-7f64-a32f-dae3cabe1ff0",
      first_name: "okayy",
      email: "prakhar0912@gmail.com",
      email_verified: true,
      created_at: "124"
    }
  })
  console.log(result)
}
catch (e) {
  console.log(e)
}

