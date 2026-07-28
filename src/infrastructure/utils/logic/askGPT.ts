import type Problem from '../../../entities/problem.js';
import type ModelResponse from '../../../interfaces/problem/modelResponse.js';
import "dotenv/config.js"
import keys from "../../../config/app.js"

const systemPromptCreator = (problem: Problem) => {
  type approach = Problem['approaches'][number]
  let expectedApproach: approach | undefined | null;
  let otherApproaches: approach[] = []

  let approachesStrings: string[] = []
  let edgeCases: string[] = []
  problem.approaches.forEach((approach) => {

    if (approach.edge_cases && approach.edge_cases.length >= 1) {
      edgeCases = approach.edge_cases.map(edge => edge.case)
    }
    if (approach && typeof approach === "object" && 'primary_technique' in approach && typeof approach.primary_technique == "string") {
      expectedApproach = approach
      approachesStrings.push(approach.primary_technique)
    }
    else {
      otherApproaches.push(approach)
      approachesStrings.push(approach.type)
    }

  })

  if (!expectedApproach) {
    throw new Error("No expected approach in the problem")
  }

  const {
    primary_technique,
    time_complexity,
    space_complexity,
    req_or_constraints,
    steps,
    explanation,
    edge_cases,
  } = expectedApproach


  let systemPrompt = `You are a DSA evaluator.

Return ONLY valid JSON.
Do not include markdown.
Do not include explanations outside JSON.

Problem: ${problem.title}

Expected Approach:
- Primary Technique: ${primary_technique}
- Time Complexity: ${time_complexity}
- Space Complexity: ${space_complexity}
- Requirements or Constraints: ${req_or_constraints}
- Steps
${steps.map((step) => ` - ${step}`).join('\n')}
- Explanation of Why this works: ${explanation}
- Edge cases to consider:
${edge_cases?.map((edge_case) => ` - ${edge_case.case}`).join('\n')}

Other Approaches:
${otherApproaches.map((approach) => {
    return `- Type: ${approach.type}
- Time Complexity: ${approach.time_complexity}
- Space Complexity: ${approach.space_complexity}
- Requirements or Constraints: ${approach.req_or_constraints}
- Steps:
${approach.steps.map(step => `  - ${step}`).join('\n')}
${approach.edge_cases ? "Edge Cases to consider:\n" + approach.edge_cases.map((edge_case) => ` - ${edge_case.case}`).join('\n') : ""}
`}).join('\n\n')}
- When evaluating the user's explanation, consider the following factors:
${problem.evaluation_criteria.map(c => `  - ${c}`).join('\n')}`

  return {
    systemPrompt,
    approachesStrings,
    edgeCases
  }



}

export default async (problem: Problem, userInput: string): Promise<ModelResponse> => {

  let { systemPrompt, approachesStrings, edgeCases } = systemPromptCreator(problem)
  let models = ['nvidia/nemotron-3-ultra-550b-a55b:free', 'tencent/hy3:free', 'poolside/laguna-m.1:free', 'inclusionai/ling-3.0-flash:free', 'poolside/laguna-xs-2.1:free']
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + keys.open_router_key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: models[0],
      messages: [
        {
          role: "system",
          content: systemPrompt
        }, {
          role: "user",
          content: "Users Explanation: " + userInput
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'DSA Evaluation Result',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              user_explanation_identified_apporach: {
                type: 'string',
                description: 'Identify the users approach for solving the problem based on their explanation and map it to the expected approach. If the user\'s explanation does not clearly align with the expected approach, identify the approach that is closest to the user\'s explanation and provide it here.',
                enum: approachesStrings,
              },
              user_explanation_rating: {
                type: 'string',
                description: "Classify the overall correctness of the user's proposed algorithmic approach. 'optimal' means the user identified the expected optimal approach for the problem. 'correct' means the approach would solve the problem correctly but is not the optimal solution. 'partially_correct' means the user demonstrates some understanding but the approach contains significant omissions or flaws that would prevent it from working in all cases. 'incorrect' means the proposed approach would not correctly solve the problem.",
                enum: ["optimal", "correct", "partially_correct", "incorrect"]
              },
              user_explanation_pass: {
                type: 'boolean',
                description: 'Indicates whether the user\'s explanation is similar to the expected approach',
                enum: [true, false],
              },
              missing_points_in_user_explanation: {
                type: 'string',
                description: 'Missing points in the user\'s explanation',
              },
              //TODO: Make this prompt better, for better results
              edge_cases_missed_in_user_explanation: {
                type: 'array',
                // description: "Array of objects, providing edge_case_coverage and edge_case_description for every edge case mentioned in the system prompt",
                items: {
                  type: 'object',
                  properties: {
                    edge_case_coverage: {
                      type: 'string',
                      enum: [
                        "correct",
                        "partial",
                        "incorrect",
                        "missing"
                      ],
                      description: "Classify how well the user's explanation handles this edge case. 'correct' means it is explicitly mentioned and correctly explained. 'partial' means it is mentioned but lacks important details or justification. 'incorrect' means it is mentioned but the explanation is wrong or would fail for this edge case. 'missing' means the edge case is not mentioned at all."
                    },
                    missed_edge_case_description: {
                      type: 'string',
                      description: "The expected edge case associated to the missed_edge_case_coverage",
                      enum: edgeCases
                    },
                  }
                },

              },
            },
            required: ['user_explanation_identified_apporach', 'user_explanation_rating', 'user_explanation_pass', 'missing_points_in_user_explanation', 'edge_cases_missed_in_user_explanation'],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const data = await response.json();
  console.log(data)
  console.log(typeof data.choices[0].message.content)
  const modelResp = JSON.parse(data.choices[0].message.content) as ModelResponse;
  return modelResp
}

let problem: Problem = {
  id: "1",
  title: "Two Sum II",
  description: "You are given a sorted array of integers in non-decreasing order and a target value. The task is to find exactly two distinct numbers whose sum equals the target and return their 1-based indices. The important twist is that the input is already sorted, so the ideal solution should exploit that structure instead of treating the problem like a generic pair-sum search.",
  difficulty: "easy",
  testCases: [
    "Input: numbers = [2,7,11,15], target = 9 -> Output: [1,2]. Explanation: 2 + 7 = 9, so the first two positions solve the problem.",
    "Input: numbers = [2,3,4], target = 6 -> Output: [1,3]. Explanation: 2 + 4 = 6, and the answer must use 1-based indexing.",
    "Input: numbers = [-1,0], target = -1 -> Output: [1,2]. Explanation: Negative values are valid and still follow the same pointer logic."
  ],
  approaches: [
    {
      type: "Expected Approach",
      primary_technique: "Two pointers on a sorted array",
      time_complexity: "O(n)",
      space_complexity: "O(1)",
      req_or_constraints: "The array must be sorted in non-decreasing order.",
      steps: [
        "Place one pointer at the start and one pointer at the end of the array.",
        "Compute the sum of the values currently pointed to.",
        "If the sum is smaller than the target, move the left pointer right to increase it.",
        "If the sum is larger than the target, move the right pointer left to decrease it.",
        "Return the two 1-based indices as soon as the sum matches the target."
      ],
      explanation: "The sorted order creates a monotonic relationship between pointer movement and the pair sum. That means each move strictly discards impossible regions of the search space without missing the valid pair.",
      edge_cases: [
        {
          case: "A pair formed by the first and last elements, because the solution can sit at the boundaries and the pointers still need to capture it.",
          importance: "critical"
        },
        {
          case: "Negative numbers mixed with positive numbers, because the pointer direction logic must still work across zero.",
          importance: "high"
        }
      ]
    },
    {
      type: "Brute Force",
      time_complexity: "O(n^2)",
      space_complexity: "O(1)",
      req_or_constraints: "No additional constraints beyond checking all index pairs.",
      steps: [
        "Try every pair of indices.",
        "Check whether the pair sums to the target.",
        "Return the first valid pair found."
      ],
      explanation: "Every possible pair is explicitly tested, so correctness is straightforward.",
    },
    {
      type: "Hash map complement search",
      time_complexity: "O(n)",
      space_complexity: "O(n)",
      req_or_constraints: "Extra memory is allowed.",
      steps: [
        "Store each seen value in a map.",
        "For the current value, compute the complement needed to reach the target.",
        "If the complement already exists, return the stored index and the current index.",
        "Otherwise, record the current value and continue."
      ],
      explanation: "The complement of a value is the only value that can complete the target sum with it, so a hash map turns pair lookup into a constant-time operation.",
    }
  ],
  evaluation_criteria: [
    "Correctness: The returned pair must sum exactly to the target and use 1-based indices.",
    "Completeness: The explanation should clearly mention why sorted order helps.",
    "Clarity: The pointer movement should be easy to trace.",
    "Alignment: The expected solution should use the sorted-array property, not brute force.",
    "Edge Cases: Boundary pairs and negative numbers should be addressed where relevant.",
    "Missed Points: The same element cannot be used twice.",
    "Overall Understanding: The solver should show why the search can be narrowed safely."
  ]
}

let userInput = `For Two Sum II, I would use the two-pointer approach because the array is already sorted.
I would initialize one pointer at the beginning of the array and another at the end.
Then, while the left pointer is less than the right pointer,
I would calculate the sum of the two elements at those pointers.
If the sum equals the target, I would return the indices.
If the sum is smaller than the target, I would move the left pointer forward to increase the sum, and if the sum is larger than the target, I would move the right pointer backward to decrease the sum.
Since the array is sorted, this allows us to eliminate unnecessary checks efficiently and solve the problem in O(n) time with O(1) extra space.
This approach also handles several important edge cases like,
pairs located at the extreme ends of the array. Additionally, in languages with fixed integer sizes, integer overflow should be considered when adding very large values. The two-pointer solution is optimal here because the sorted nature of the array enables efficient pointer movement without requiring additional data structures like a hash map.`

// console.log(await ok(problem, userInput))
