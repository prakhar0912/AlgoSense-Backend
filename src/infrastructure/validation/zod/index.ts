import registerValidator from "./user/register.js";
import updateProfileValidator from './user/updateProfile.js'
import updateUserValidator from "./user/updateUser.js";


import problemValidator from "./problem/validateProblem.js";
import updateProblemValidator from "./problem/updateProblem.js";
import problemSolutionValidator from "./problem/problemSolution.js";
import modelResponseValidator from "./problem/modelResponse.js";

export {
  registerValidator,
  updateUserValidator,
  problemValidator,
  problemSolutionValidator,
  updateProblemValidator,
  modelResponseValidator,
  updateProfileValidator
}
