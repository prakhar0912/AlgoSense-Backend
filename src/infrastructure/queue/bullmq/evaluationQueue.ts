import { Queue } from "bullmq"
import { BullMqQueue } from "./queue.js"


const submissionEvaluationQueue: Queue = new Queue('submission-evaluation-queue', {
  connection: {
    host: 'localhost',
    port: 6379
  }
})

export const evaluationQueue = new BullMqQueue<string>(submissionEvaluationQueue)

