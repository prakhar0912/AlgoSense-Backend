import type { Problem } from '../../../entities/index.js';
import type { ModelResponse } from '../../../interfaces/index.js';
import "dotenv/config.js"
import keys from "../../../config/app.js"

const edgeCaseSystemPromptCreator = (problem: Problem, approachString: string) => {
  const approachArray = problem.approaches.filter((obj) => {
    if (typeof obj.primary_technique === 'string') {
      return obj.primary_technique === approachString
    }
    else {
      return obj.type === approachString
    }
  })

  const approach = approachArray[0]
  if (!approach) {
    return null
  }
  let systemPrompt = `
You are acting as a senior software engineer conducting a technical interview.

Your task is NOT to judge writing quality.

Instead evaluate to what degree does the user's explanation satisfy the mentioned edge cases.

Only use information present in the explanation.

Do not infer missing algorithm steps.

When uncertain, choose the lower rating.

Return JSON only.

Never invent approaches, edge cases, or concepts that are not provided in the enum or system prompt.

Problem: ${problem.title}

Expected Approach:
- Technique: ${typeof approach.primary_technique === 'string' ? approach.primary_technique : approach.type}
- Time Complexity: ${approach.time_complexity}
- Space Complexity: ${approach.space_complexity}
- Requirements or Constraints: ${approach.req_or_constraints}
- Steps
${approach.steps.map((step) => ` - ${step}`).join('\n')}
- Explanation of Why this works: ${approach.explanation}
- Edge cases to consider:
${approach.edge_cases?.map((edge_case) => ` - ${edge_case.case}`).join('\n')}`

  return { systemPrompt, edgeCases: approach.edge_cases }
}


const systemPromptCreator = (problem: Problem) => {
  type approach = Problem['approaches'][number]
  let expectedApproach: approach | undefined | null;
  let otherApproaches: approach[] = []

  let approachesStrings: string[] = []
  let edgeCases: { approach: string, description: string, importance: "critical" | "high" | "medium" | "low" }[] = []
  problem.approaches.forEach((approach) => {

    if (approach.edge_cases && approach.edge_cases.length >= 1) {
      for (const edgeCase of approach.edge_cases) {
        edgeCases.push({
          description: edgeCase.case,
          importance: edgeCase.importance,
          approach: approach.type
        })
      }
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


  if (edge_cases && edge_cases.length >= 1 && primary_technique) {
    for (const edgeCase of edge_cases) {
      edgeCases.push({
        description: edgeCase.case,
        importance: edgeCase.importance,
        approach: primary_technique
      })
    }
  }


  let systemPrompt = `
You are acting as a senior software engineer conducting a technical interview.

Your task is NOT to judge writing quality.

Instead evaluate whether the user's explanation would successfully solve the problem.

Only use information present in the explanation.

Do not infer missing algorithm steps.

When uncertain, choose the lower rating.

Return JSON only.

Never invent approaches, edge cases, or concepts that are not provided in the enum or system prompt.

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
  let models = ['nvidia/nemotron-3-super-120b-a12b:free', 'tencent/hy3:free', 'poolside/laguna-xs-2.1:free', 'inclusionai/ling-3.0-flash:free', 'poolside/laguna-xs-2.1:free']
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
                description: "Identify the single algorithmic approach that best matches the user's explanation. Select exactly one value from the enum. Prefer the expected optimal approach when the explanation clearly describes it. If the explanation is ambiguous, choose the closest matching approach from the enum. Never invent a new approach.",
                enum: approachesStrings,
              },
              user_explanation_rating: {
                type: 'string',
                description: "Evaluate the user's explanation against the expected solution. Choose 'optimal' if the explanation correctly describes the expected optimal algorithm. Choose 'correct' if the algorithm would solve the problem correctly but is less efficient than the optimal solution. Choose 'partially_correct' if the explanation contains the core idea but has omissions or logical flaws that would fail some valid test cases. Choose 'incorrect' if the proposed algorithm would not correctly solve the problem.",
                enum: ["optimal", "correct", "partially_correct", "incorrect"]
              },
              user_explanation_pass: {
                type: 'boolean',
                description:
                  "Return true if the user's explanation would reasonably pass a technical interview for this problem. An explanation passes if its algorithm is classified as 'optimal' or 'correct'. Return false otherwise.",
                enum: [true, false],
              },
              missing_points_in_user_explanation: {
                type: 'string',
                description:
                  "Summarize the important concepts, algorithm steps, assumptions, complexity analysis, or edge cases that are missing or insufficiently explained. Return an empty string if nothing important is missing.",
              },
            },
            required: ['user_explanation_identified_apporach', 'user_explanation_rating', 'user_explanation_pass', 'missing_points_in_user_explanation'],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const data = await response.json();
  const modelResp = JSON.parse(data.choices[0].message.content) as ModelResponse;

  const identifiedApproach = edgeCaseSystemPromptCreator(problem, modelResp.user_explanation_identified_apporach)

  if (!identifiedApproach) {
    return { ...modelResp, edge_cases: [] }
  }

  let identifiedEdgeCases = identifiedApproach.edgeCases
  let identifiedApproachSystemPrompt = identifiedApproach.systemPrompt

  if (!identifiedEdgeCases || !identifiedApproach) {
    return { ...modelResp, edge_cases: [] }
  }


  let schema = {
    type: 'object',
    properties: {} as never,
    required: [] as string[],
    additionalProperties: false,
  }

  let finalEdgeCaseData: {
    case: string, importance: "critical" | "high" | "medium" | "low", tag?: string, coverage: "correct" | "partial" | "incorrect" | "missing"
  }[] | [] = []

  for (let i = 0; i < identifiedEdgeCases.length; i++) {
    if (!identifiedEdgeCases[i]?.case) {
      continue
    }

    let tag = `edge_case_${i}_coverage`
    finalEdgeCaseData.push({ ...identifiedEdgeCases[i], tag } as never)
    schema.required.push(tag)
    schema.properties[tag] = {
      type: 'string',
      enum: [
        "correct",
        "partial",
        "incorrect",
        "missing"
      ],
      description:
        `Compare the user's explanation against this expected edge case: "${identifiedEdgeCases[i]?.case}" . Choose 'correct' if it is explicitly and correctly addressed. Choose 'partial' if it is mentioned but lacks important details. Choose 'incorrect' if the explanation would fail or mishandle this edge case. Choose 'missing' if the edge case is not mentioned.`,
    } as never
  }




  const edgeCaseReq = await fetch('https://openrouter.ai/api/v1/chat/completions', {
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
          content: identifiedApproachSystemPrompt
        }, {
          role: "user",
          content: "Users Explanation: " + userInput
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'DSA Edge Case Analyser',
          strict: true,
          schema: schema
        },
      },
    }),
  });

  const edgeCaseRawData = await edgeCaseReq.json();
  const edgeCaseData = JSON.parse(edgeCaseRawData.choices[0].message.content);

  for (const [key, value] of Object.entries(edgeCaseData)) {

    for (const edgeCase of finalEdgeCaseData) {
      if (edgeCase.tag === key) {
        edgeCase.coverage = value as "correct" | "partial" | "incorrect" | "missing"
      }
    }
  }

  const constructedModelResponse: ModelResponse = { ...modelResp, edge_cases: finalEdgeCaseData }
  return constructedModelResponse
}


