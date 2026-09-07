import http from 'k6/http'
import { sleep, check } from 'k6'

const accessKeys = {
  "test1": "",
}


let defaultParams = {
  headers: {
    'Authorization': `Bearer ${accessKeys[`test1`]}`
  }
}

export const options = {
  scenarios: {
    iterativeSubmissions: {
      executor: "per-vu-iterations",
      vus: 1,
      iterations: 100,
      exec: "submitSolutionIterative",
    },
    concurrentSubmissions: {
      executor: "per-vu-iterations",
      vus: 100,
      iterations: 1,
      exec: "submitSolutionConcurrent",
      startTime: "2m10s"
    },
  },
};


const submitSolutionBody = {
  "problem_id": "019fdb6b-fd03-703f-9dbc-f188468925a7",
  "userInput": "Create a frequency map of every letter that occurs in the string. Then iteratively go through every keys value and for a given key reduce it's value by exactly 1 and then check if all the values in the map are equal. If they are we have found the character that is extra. if not then move ahead to the next key and reduce the value of that and check again if all the values of the map are the same. Edge cases: Reducing a frequency to 0 removes that letter from consideration."
}



export function submitSolutionIterative() {
  http.post(
    'http://localhost:3001/user/submitSolution',
    submitSolutionBody,
    defaultParams
  )
  sleep(1)
}

export function submitSolutionConcurrent() {
  http.post(
    'http://localhost:3001/user/submitSolution',
    submitSolutionBody,
    defaultParams
  )
  sleep(1)
}
