import loginValidator from "./user/login.js";
import registedValidator from "./user/register.js";
import updatePasswordValidator from "./user/updatePassword.js"
import updateProfileValidator from './user/updateProfile.js'
import updateUserValidator from "./user/updateUser.js";


import problemValidator from "./problem/validateProblem.js";
import updateProblemValidator from "./problem/updateProblem.js";
import problemSolutionValidator from "./problem/problemSolution.js";
import modelResponseValidator from "./problem/modelResponse.js";

console.log(loginValidator.validate({email: "okay@gmail.com", password: "Abc0912"}))