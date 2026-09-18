import { HealthProbe } from './probe.js'
import { checkDatabase } from './dependency/checkDatabase.js'
import services from '../../config/services.js'

const restApiProbe = new HealthProbe({
  readinessChecks: [checkDatabase, () => services.queue.evaluationQueue.isReady()],
})

export default restApiProbe
