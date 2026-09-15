import { Queue } from "bullmq"
import { BullMqQueue } from "./queue.js"
import keys from '../../../config/app.js'


const submissionEvaluationQueue: Queue = new Queue('submission-evaluation-queue', {
  connection: {
    host: keys.redis.host,
    port: keys.redis.port
  }
})

export const evaluationQueue = new BullMqQueue<string>(submissionEvaluationQueue)

