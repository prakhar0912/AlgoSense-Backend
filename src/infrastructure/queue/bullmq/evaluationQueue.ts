import { Queue } from "bullmq"
import { BullMqQueue } from "./queue.js"
import keys from '../../../config/app.js'


const submissionEvaluationQueue: Queue = new Queue('submission-evaluation-queue', {
  connection: {
    host: keys.redis.host,
    port: keys.redis.port
  },
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5_000,
    },
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 10_000
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60,
      count: 10_000,
    }
  }
})

export const evaluationQueue = new BullMqQueue<string>(submissionEvaluationQueue)

