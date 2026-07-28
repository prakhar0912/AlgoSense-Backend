import registerValidator from "./user/register.js";
import updateUserValidator from "./user/updateUser.js";
import filterUsers from "./user/filterUsers.js";
import updateUser from "./user/updateUser.js";
import problemValidator from "./problem/validateProblem.js";
import updateProblemValidator from "./problem/updateProblem.js";
import problemSolutionValidator from "./problem/problemSolution.js";
import modelResponseValidator from "./problem/modelResponseValidator.js";
export const user = { updateUser, registerValidator, updateUserValidator, filterUsers };
export const problem = {
    problemValidator,
    problemSolutionValidator,
    updateProblemValidator,
    modelResponseValidator,
};
//# sourceMappingURL=index.js.map