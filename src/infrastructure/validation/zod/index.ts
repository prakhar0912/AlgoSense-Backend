import registerValidator from "./user/register.js";
import filterUsers from "./user/filterUsers.js";
import updateUser from "./user/updateUser.js";

import problemValidator from "./problem/validateProblem.js";
import updateProblemValidatorForAdmin from "./problem/updateProblem.js";
import problemSolutionValidator from "./problem/problemSolution.js";
import modelResponseValidator from "./problem/modelResponseValidator.js";
import filterProblemsForUser from "./problem/filterProblemsForUser.js";

export const user = { updateUser, registerValidator, filterUsers }
export const problem = {
  filterProblemsForUser,
  problemValidator,
  problemSolutionValidator,
  updateProblemValidatorForAdmin,
  modelResponseValidator,
}

