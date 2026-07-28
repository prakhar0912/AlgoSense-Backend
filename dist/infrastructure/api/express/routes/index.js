import admin from './admin.js';
import user from './user.js';
import problem from './problem.js';
export default {
    attach(app) {
        app.use('/admin', admin);
        app.use('/user', user);
        app.use('/problem', problem);
    }
};
//# sourceMappingURL=index.js.map