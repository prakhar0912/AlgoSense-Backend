import http from 'k6/http'
import { sleep, check, group } from 'k6'
let accessKeys


export const options = {
  scenarios: {
    normal_users: {
      executor: "ramping-vus",
      // executor: "constant-vus",
      // executor: "per-vu-iterations",

      startVUs: 0,
      // vus: 50,
      // iterations: 1,
      stages: [
        { duration: "30s", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "1m", target: 250 },
        { duration: "30s", target: 0 },
      ],
      exec: "normalUser",
    },

    submissions: {
      executor: "constant-vus",
      vus: 50,
      duration: "2m",
      exec: "submitSolution",
    },
  },
};



export function normalUser() {
  let defaultParams = {
    headers: {
      'Authorization': `Bearer ${accessKeys[`test1`]}`
    }
  }
  group("Get Profile", () => {
    const response = http.get('http://localhost:3001/user/profile', defaultParams)
    check(response, {
      'Status is 200': (r) => r.status === 200
    })
  })

  sleep(1)

  group("View Submissions", () => {
    const response = http.get('http://localhost:3001/user/submissions', defaultParams)
    check(response, {
      'View Submissions 200': (r) => r.status === 200
    })
  })

  sleep(1)


  group("View All Problems", () => {
    const response = http.get('http://localhost:3001/problem/all', defaultParams)
    check(response, {
      'View Problem 200': (r) => r.status === 200
    })
  })

  sleep(1)

  group("View Specific Problem by ID", () => {
    const response = http.get('http://localhost:3001/problem/byId/019fdb6b-fd03-703f-9dbc-f188468925a7', defaultParams)
    check(response, {
      'View Specific Problem by ID 200': (r) => r.status === 200
    })
  })

  sleep(1)

  group("View Specific Problem by Slug", () => {
    const response = http.get('http://localhost:3001/problem/bySlug/remove-letter-to-equalize-frequency', defaultParams)
    check(response, {
      'View Specific Problem by Slug 200': (r) => r.status === 200
    })
  })

  sleep(1)

}


const submitSolutionBody = {
  "problem_id": "019fdb6b-fd03-703f-9dbc-f188468925a7",
  "userInput": "Create a frequency map of every letter that occurs in the string. Then iteratively go through every keys value and for a given key reduce it's value by exactly 1 and then check if all the values in the map are equal. If they are we have found the character that is extra. if not then move ahead to the next key and reduce the value of that and check again if all the values of the map are the same. Edge cases: Reducing a frequency to 0 removes that letter from consideration."
}

export function submitSolution() {

  let defaultParams = {
    headers: {
      'Authorization': `Bearer ${accessKeys[`test${(__VU % 50) + 1}`]}`
    }
  }

  const response = http.post(
    'http://localhost:3001/user/submitSolution',
    submitSolutionBody,
    defaultParams
  )
  check(response, {
    'Status is 200(2)': (r) => r.status === 200
  })
}


