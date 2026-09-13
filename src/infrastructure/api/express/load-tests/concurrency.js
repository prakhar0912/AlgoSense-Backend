import http from 'k6/http'
import { sleep, check } from 'k6'

const accessKeys = {
  "test1": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imx2MHpmU1g5S1V0ZHBaVzI3VzlUYiJ9.eyJodHRwczovL2FsZ29zZW5zZS5jb20vcm9sZXMiOlsiYWxnb3NlbnNlLXVzZXIiXSwiaHR0cHM6Ly9hbGdvc2Vuc2UuY29tL2lzX25ld191c2VyIjo0LCJodHRwczovL2FsZ29zZW5zZS5jb20vZW1haWwiOiJ0ZXN0MUBhLmNvbSIsImh0dHBzOi8vYWxnb3NlbnNlLmNvbS9lbWFpbF92ZXJpZmllZCI6ZmFsc2UsImh0dHBzOi8vYWxnb3NlbnNlLmNvbS9waWN0dXJlIjoiaHR0cHM6Ly9zLmdyYXZhdGFyLmNvbS9hdmF0YXIvNzcxMDU1NWQzYTgzNzVlZGZiYzYxNDlhMjM2ZGZmNGI_cz00ODAmcj1wZyZkPWh0dHBzJTNBJTJGJTJGY2RuLmF1dGgwLmNvbSUyRmF2YXRhcnMlMkZ0ZS5wbmciLCJodHRwczovL2FsZ29zZW5zZS5jb20vbmFtZSI6InRlc3QxIiwiaXNzIjoiaHR0cHM6Ly9kZXYtbmsxdzd5bndwa2hicW1ldy51cy5hdXRoMC5jb20vIiwic3ViIjoiYXV0aDB8NmE5YmY5ZjFlNmIxYWY2ZjZmOWMyYzdiIiwiYXVkIjpbImh0dHBzOi8vYWxnb3NlbnNlLmNvbSIsImh0dHBzOi8vZGV2LW5rMXc3eW53cGtoYnFtZXcudXMuYXV0aDAuY29tL3VzZXJpbmZvIl0sImlhdCI6MTc4OTEwODEyMiwiZXhwIjoxNzg5MTk0NTIyLCJzY29wZSI6Im9wZW5pZCBwcm9maWxlIGVtYWlsIiwiZ3R5IjoicGFzc3dvcmQiLCJhenAiOiJzc2NGZEpZWHBzVURRd2pGM2ZWZVRZZzdsOWFhdE5PayIsInBlcm1pc3Npb25zIjpbImNyZWF0ZTpzdWJtaXNzaW9uIiwiZGVsZXRlOnNlbGYiLCJtY3A6Y29ubmVjdCIsInVwZGF0ZTpzZWxmIiwidmlldzpwYXJ0aWFsLXByb2JsZW0iLCJ2aWV3OnNlbGYiLCJ2aWV3OnNlbGYtc3VibWlzc2lvbiJdfQ.bGq0o2ZQBQmU9wZ9hu7RMtU9wOK0PJ5Y9mHtnVHMkiR1OSE-sTK7hkFdqkVOat7E7yXhbpZVrZnEH4XpPfvL-zAIFQ1UIK1vn4ciRl-NpxdB8vH7q8IzqoJW9vjxFUVINt30pnAZuCKyVrxE3HluwTMNmF-TLSaVz_6MsbesCFtvAW2rozsLQ8EezNdNRGbWfODr1zovIh87DWkF_boaaRK9EiGjKQgxUpYFrRNZmG3YPeNnKISzjHE6bKoBX5dg3K6g3vKbHToFAWz8FGevnYcMJV2WjFMz4d9fnHQ4YZncl0oyQ_lH5JBD-K4rpsR_KiCfOVcrZKf4FOTF_Ia3qA",
}


let defaultParams = {
  headers: {
    'Authorization': `Bearer ${accessKeys[`test1`]}`
  }
}

export const options = {
  scenarios: {
    // iterativeSubmissions: {
    //   executor: "per-vu-iterations",
    //   vus: 1,
    //   iterations: 100,
    //   exec: "submitSolutionIterative",
    // },
    concurrentSubmissions: {
      executor: "per-vu-iterations",
      vus: 100,
      iterations: 1,
      exec: "submitSolutionConcurrent",
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
}
