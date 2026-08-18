import type { Application } from 'express'

import admin from './admin.js'
import user from './user.js'
import problem from './problem.js'


export default {
  attach(app: Application): void {
    app.use('/admin', admin)
    app.use('/user', user)
    app.use('/problem', problem)
  }
}
