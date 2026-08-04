import { convert } from "html-to-text"

import contentData from './data/100sData.json' with { type: 'json' };
import unirest from 'unirest';

let problem =
{
  "problem_slug": "remove-letter-to-equalize-frequency",
  "primary_topics": [
    "hash-table"
  ],
  "secondary_topics": [
    "string",
    "counting"
  ],
  "approaches": [
    {
      "type": "Expected Approach",
      "primary_technique": "Frequency counting with case analysis",
      "time_complexity": "O(n)",
      "space_complexity": "O(1)",
      "req_or_constraints": "Assume lowercase English letters so a fixed-size frequency table is enough.",
      "steps": [
        "Count how many times each of the 26 letters appears in the word.",
        "Build the multiset of non-zero frequencies because only letters still present after deletion must match.",
        "Check whether removing one occurrence from a letter with frequency 1 would leave all remaining non-zero frequencies equal.",
        "Check whether reducing exactly one higher frequency by 1 would make it match the common frequency of the other letters.",
        "Return true when one of those cases works; otherwise return false."
      ],
      "explanation": "Only one deletion is allowed, so the final valid configuration must come from either deleting an entire singleton letter or decreasing one oversized frequency by exactly one. Counting frequencies first exposes both possibilities without trying every index explicitly.",
      "edge_cases": [
        {
          "case": "The word already has all equal frequencies but still requires deleting one character, which may break equality unless one letter disappears cleanly.",
          "importance": "critical"
        },
        {
          "case": "Only one distinct character is present, so deleting one occurrence still leaves all present letters with equal frequency.",
          "importance": "high"
        },
        {
          "case": "One letter has frequency exactly one while all other present letters share a larger equal frequency.",
          "importance": "high"
        }
      ]
    },
    {
      "type": "Removal Simulation by Character",
      "time_complexity": "O(n + A^2)",
      "space_complexity": "O(1)",
      "req_or_constraints": "Efficient when the alphabet size A is fixed and small.",
      "steps": [
        "Count frequencies for each character.",
        "For every letter with non-zero frequency, temporarily decrease its count by one.",
        "Check whether all remaining non-zero counts are identical, then restore the count.",
        "Return true as soon as one simulated deletion succeeds."
      ],
      "explanation": "Every valid answer corresponds to deleting one occurrence from some character class. Simulating one removal per distinct character covers all meaningful outcomes without iterating over every index in the string.",
      "pros": [
        "Simple to reason about and implement.",
        "Avoids complicated frequency-pattern branching."
      ],
      "cons": [
        "Still performs repeated equality checks after each simulation.",
        "Less elegant than direct case analysis."
      ],
      "edge_cases": [
        {
          "case": "Deleting from a character that appears once removes that character from the remaining set entirely.",
          "importance": "high"
        },
        {
          "case": "Multiple characters share the same count, so only one of them may be a valid deletion source.",
          "importance": "medium"
        },
        {
          "case": "No simulated deletion produces uniform non-zero frequencies.",
          "importance": "high"
        }
      ]
    },
    {
      "type": "Brute Force by Index Removal",
      "time_complexity": "O(n^2)",
      "space_complexity": "O(n)",
      "req_or_constraints": "Acceptable only because the input length is at most 100.",
      "steps": [
        "Try deleting each index in the word one at a time.",
        "Build the resulting string after that deletion.",
        "Recount the frequencies of the remaining characters.",
        "Check whether every present character now has the same frequency."
      ],
      "explanation": "Deleting each possible index directly mirrors the problem statement. If any resulting string has uniform frequencies among its present letters, the answer is true.",
      "pros": [
        "Matches the problem statement exactly.",
        "Very easy to verify for correctness."
      ],
      "cons": [
        "Repeats counting work for every index.",
        "Scales poorly compared with frequency-based methods."
      ],
      "edge_cases": [
        {
          "case": "Different indices of the same letter can lead to the same frequency outcome.",
          "importance": "medium"
        },
        {
          "case": "A short word may become a single-character string after deletion.",
          "importance": "medium"
        },
        {
          "case": "The only valid deletion may be near the end of the string, so early exit is not guaranteed.",
          "importance": "low"
        }
      ]
    }
  ],
  "evaluation_criteria": [
    "Correctness: Check that the solution enforces exactly one deletion and compares only non-zero remaining frequencies.",
    "Completeness: Check that it handles both deleting a singleton letter and reducing one oversized frequency by one.",
    "Clarity: Check that the frequency logic and acceptance conditions are explained in plain language.",
    "Alignment: Check that the approach stays tied to lowercase-letter counting rather than unrelated string transformations.",
    "Edge Cases: Check words with one distinct letter, already-uniform counts, and one outlier frequency.",
    "Missed Points: Check whether the answer forgets that removing a letter can eliminate that character entirely from the remaining set.",
    "Overall Understanding: Judge whether the reasoning identifies the limited ways one deletion can make all present frequencies equal."
  ]
}

for (const obj of contentData) {
  if (obj.slug == problem.problem_slug) {
    problem.title = obj.title
    problem.rating = obj.rating
    problem.description = convert(obj.content).replace(/\s+/g, ' ').trim()
    problem.hints = obj.hints
    problem.difficulty = obj.difficulty.toLowerCase()
    problem.slug = problem.problem_slug
    delete problem.problem_slug
  }
}

console.log(problem)

var req = unirest('POST', 'https://localhost:3000/admin/problem/create')
  .headers({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Imx2MHpmU1g5S1V0ZHBaVzI3VzlUYiJ9.eyJpc3MiOiJodHRwczovL2Rldi1uazF3N3lud3BraGJxbWV3LnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJzZVBKc3VFVVJySENhRE9aM3JURE9EUmM5emdON09IYkBjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9kZXYtbmsxdzd5bndwa2hicW1ldy51cy5hdXRoMC5jb20vYXBpL3YyLyIsImlhdCI6MTc4NTQ4NjY4NywiZXhwIjoxNzg1NTczMDg3LCJzY29wZSI6InJlYWQ6Y2xpZW50X2dyYW50cyBjcmVhdGU6Y2xpZW50X2dyYW50cyBkZWxldGU6Y2xpZW50X2dyYW50cyB1cGRhdGU6Y2xpZW50X2dyYW50cyByZWFkOnVzZXJzIHVwZGF0ZTp1c2VycyBkZWxldGU6dXNlcnMgY3JlYXRlOnVzZXJzIHJlYWQ6dXNlcnNfYXBwX21ldGFkYXRhIHVwZGF0ZTp1c2Vyc19hcHBfbWV0YWRhdGEgZGVsZXRlOnVzZXJzX2FwcF9tZXRhZGF0YSBjcmVhdGU6dXNlcnNfYXBwX21ldGFkYXRhIHJlYWQ6dXNlcl9jdXN0b21fYmxvY2tzIGNyZWF0ZTp1c2VyX2N1c3RvbV9ibG9ja3MgZGVsZXRlOnVzZXJfY3VzdG9tX2Jsb2NrcyBjcmVhdGU6dXNlcl90aWNrZXRzIHJlYWQ6Y2xpZW50cyB1cGRhdGU6Y2xpZW50cyBkZWxldGU6Y2xpZW50cyBjcmVhdGU6Y2xpZW50cyByZWFkOmNsaWVudF9rZXlzIHVwZGF0ZTpjbGllbnRfa2V5cyBkZWxldGU6Y2xpZW50X2tleXMgY3JlYXRlOmNsaWVudF9rZXlzIHJlYWQ6Y2xpZW50X2NyZWRlbnRpYWxzIHVwZGF0ZTpjbGllbnRfY3JlZGVudGlhbHMgZGVsZXRlOmNsaWVudF9jcmVkZW50aWFscyBjcmVhdGU6Y2xpZW50X2NyZWRlbnRpYWxzIHJlYWQ6Y29ubmVjdGlvbnMgdXBkYXRlOmNvbm5lY3Rpb25zIGRlbGV0ZTpjb25uZWN0aW9ucyBjcmVhdGU6Y29ubmVjdGlvbnMgcmVhZDpyZXNvdXJjZV9zZXJ2ZXJzIHVwZGF0ZTpyZXNvdXJjZV9zZXJ2ZXJzIGRlbGV0ZTpyZXNvdXJjZV9zZXJ2ZXJzIGNyZWF0ZTpyZXNvdXJjZV9zZXJ2ZXJzIHJlYWQ6ZGV2aWNlX2NyZWRlbnRpYWxzIHVwZGF0ZTpkZXZpY2VfY3JlZGVudGlhbHMgZGVsZXRlOmRldmljZV9jcmVkZW50aWFscyBjcmVhdGU6ZGV2aWNlX2NyZWRlbnRpYWxzIHJlYWQ6cnVsZXMgdXBkYXRlOnJ1bGVzIGRlbGV0ZTpydWxlcyBjcmVhdGU6cnVsZXMgcmVhZDpydWxlc19jb25maWdzIHVwZGF0ZTpydWxlc19jb25maWdzIGRlbGV0ZTpydWxlc19jb25maWdzIHJlYWQ6aG9va3MgdXBkYXRlOmhvb2tzIGRlbGV0ZTpob29rcyBjcmVhdGU6aG9va3MgcmVhZDphY3Rpb25zIHVwZGF0ZTphY3Rpb25zIGRlbGV0ZTphY3Rpb25zIGNyZWF0ZTphY3Rpb25zIHJlYWQ6ZW1haWxfcHJvdmlkZXIgdXBkYXRlOmVtYWlsX3Byb3ZpZGVyIGRlbGV0ZTplbWFpbF9wcm92aWRlciBjcmVhdGU6ZW1haWxfcHJvdmlkZXIgYmxhY2tsaXN0OnRva2VucyByZWFkOnN0YXRzIHJlYWQ6aW5zaWdodHMgcmVhZDp0ZW5hbnRfc2V0dGluZ3MgdXBkYXRlOnRlbmFudF9zZXR0aW5ncyByZWFkOmxvZ3MgcmVhZDpsb2dzX3VzZXJzIHJlYWQ6c2hpZWxkcyBjcmVhdGU6c2hpZWxkcyB1cGRhdGU6c2hpZWxkcyBkZWxldGU6c2hpZWxkcyByZWFkOmFub21hbHlfYmxvY2tzIGRlbGV0ZTphbm9tYWx5X2Jsb2NrcyB1cGRhdGU6dHJpZ2dlcnMgcmVhZDp0cmlnZ2VycyByZWFkOmdyYW50cyBkZWxldGU6Z3JhbnRzIHJlYWQ6Z3VhcmRpYW5fZmFjdG9ycyB1cGRhdGU6Z3VhcmRpYW5fZmFjdG9ycyByZWFkOmd1YXJkaWFuX2Vucm9sbG1lbnRzIGRlbGV0ZTpndWFyZGlhbl9lbnJvbGxtZW50cyBjcmVhdGU6Z3VhcmRpYW5fZW5yb2xsbWVudF90aWNrZXRzIHJlYWQ6dXNlcl9pZHBfdG9rZW5zIGNyZWF0ZTpwYXNzd29yZHNfY2hlY2tpbmdfam9iIGRlbGV0ZTpwYXNzd29yZHNfY2hlY2tpbmdfam9iIHJlYWQ6Y3VzdG9tX2RvbWFpbnMgZGVsZXRlOmN1c3RvbV9kb21haW5zIGNyZWF0ZTpjdXN0b21fZG9tYWlucyB1cGRhdGU6Y3VzdG9tX2RvbWFpbnMgcmVhZDplbWFpbF90ZW1wbGF0ZXMgY3JlYXRlOmVtYWlsX3RlbXBsYXRlcyB1cGRhdGU6ZW1haWxfdGVtcGxhdGVzIHJlYWQ6bWZhX3BvbGljaWVzIHVwZGF0ZTptZmFfcG9saWNpZXMgcmVhZDpyb2xlcyBjcmVhdGU6cm9sZXMgZGVsZXRlOnJvbGVzIHVwZGF0ZTpyb2xlcyByZWFkOnByb21wdHMgdXBkYXRlOnByb21wdHMgcmVhZDpicmFuZGluZyB1cGRhdGU6YnJhbmRpbmcgZGVsZXRlOmJyYW5kaW5nIHJlYWQ6bG9nX3N0cmVhbXMgY3JlYXRlOmxvZ19zdHJlYW1zIGRlbGV0ZTpsb2dfc3RyZWFtcyB1cGRhdGU6bG9nX3N0cmVhbXMgY3JlYXRlOnNpZ25pbmdfa2V5cyByZWFkOnNpZ25pbmdfa2V5cyB1cGRhdGU6c2lnbmluZ19rZXlzIHJlYWQ6bGltaXRzIHVwZGF0ZTpsaW1pdHMgY3JlYXRlOnJvbGVfbWVtYmVycyByZWFkOnJvbGVfbWVtYmVycyBkZWxldGU6cm9sZV9tZW1iZXJzIHJlYWQ6ZW50aXRsZW1lbnRzIHJlYWQ6YXR0YWNrX3Byb3RlY3Rpb24gdXBkYXRlOmF0dGFja19wcm90ZWN0aW9uIHJlYWQ6b3JnYW5pemF0aW9uc19zdW1tYXJ5IGNyZWF0ZTphdXRoZW50aWNhdGlvbl9tZXRob2RzIHJlYWQ6YXV0aGVudGljYXRpb25fbWV0aG9kcyB1cGRhdGU6YXV0aGVudGljYXRpb25fbWV0aG9kcyBkZWxldGU6YXV0aGVudGljYXRpb25fbWV0aG9kcyByZWFkOm9yZ2FuaXphdGlvbnMgdXBkYXRlOm9yZ2FuaXphdGlvbnMgY3JlYXRlOm9yZ2FuaXphdGlvbnMgZGVsZXRlOm9yZ2FuaXphdGlvbnMgcmVhZDpvcmdhbml6YXRpb25fZGlzY292ZXJ5X2RvbWFpbnMgdXBkYXRlOm9yZ2FuaXphdGlvbl9kaXNjb3ZlcnlfZG9tYWlucyBjcmVhdGU6b3JnYW5pemF0aW9uX2Rpc2NvdmVyeV9kb21haW5zIGRlbGV0ZTpvcmdhbml6YXRpb25fZGlzY292ZXJ5X2RvbWFpbnMgY3JlYXRlOm9yZ2FuaXphdGlvbl9tZW1iZXJzIHJlYWQ6b3JnYW5pemF0aW9uX21lbWJlcnMgZGVsZXRlOm9yZ2FuaXphdGlvbl9tZW1iZXJzIGNyZWF0ZTpvcmdhbml6YXRpb25fY29ubmVjdGlvbnMgcmVhZDpvcmdhbml6YXRpb25fY29ubmVjdGlvbnMgdXBkYXRlOm9yZ2FuaXphdGlvbl9jb25uZWN0aW9ucyBkZWxldGU6b3JnYW5pemF0aW9uX2Nvbm5lY3Rpb25zIGNyZWF0ZTpvcmdhbml6YXRpb25fbWVtYmVyX3JvbGVzIHJlYWQ6b3JnYW5pemF0aW9uX21lbWJlcl9yb2xlcyBkZWxldGU6b3JnYW5pemF0aW9uX21lbWJlcl9yb2xlcyBjcmVhdGU6b3JnYW5pemF0aW9uX2ludml0YXRpb25zIHJlYWQ6b3JnYW5pemF0aW9uX2ludml0YXRpb25zIGRlbGV0ZTpvcmdhbml6YXRpb25faW52aXRhdGlvbnMgcmVhZDpzY2ltX2NvbmZpZyBjcmVhdGU6c2NpbV9jb25maWcgdXBkYXRlOnNjaW1fY29uZmlnIGRlbGV0ZTpzY2ltX2NvbmZpZyBjcmVhdGU6c2NpbV90b2tlbiByZWFkOnNjaW1fdG9rZW4gZGVsZXRlOnNjaW1fdG9rZW4gcmVhZDpkaXJlY3RvcnlfcHJvdmlzaW9uaW5ncyBjcmVhdGU6ZGlyZWN0b3J5X3Byb3Zpc2lvbmluZ3MgdXBkYXRlOmRpcmVjdG9yeV9wcm92aXNpb25pbmdzIGRlbGV0ZTpkaXJlY3RvcnlfcHJvdmlzaW9uaW5ncyBkZWxldGU6cGhvbmVfcHJvdmlkZXJzIGNyZWF0ZTpwaG9uZV9wcm92aWRlcnMgcmVhZDpwaG9uZV9wcm92aWRlcnMgdXBkYXRlOnBob25lX3Byb3ZpZGVycyBkZWxldGU6cGhvbmVfdGVtcGxhdGVzIGNyZWF0ZTpwaG9uZV90ZW1wbGF0ZXMgcmVhZDpwaG9uZV90ZW1wbGF0ZXMgdXBkYXRlOnBob25lX3RlbXBsYXRlcyBjcmVhdGU6ZW5jcnlwdGlvbl9rZXlzIHJlYWQ6ZW5jcnlwdGlvbl9rZXlzIHVwZGF0ZTplbmNyeXB0aW9uX2tleXMgZGVsZXRlOmVuY3J5cHRpb25fa2V5cyByZWFkOnNlc3Npb25zIHVwZGF0ZTpzZXNzaW9ucyBkZWxldGU6c2Vzc2lvbnMgcmVhZDpyZWZyZXNoX3Rva2VucyB1cGRhdGU6cmVmcmVzaF90b2tlbnMgZGVsZXRlOnJlZnJlc2hfdG9rZW5zIGNyZWF0ZTpzZWxmX3NlcnZpY2VfcHJvZmlsZXMgcmVhZDpzZWxmX3NlcnZpY2VfcHJvZmlsZXMgdXBkYXRlOnNlbGZfc2VydmljZV9wcm9maWxlcyBkZWxldGU6c2VsZl9zZXJ2aWNlX3Byb2ZpbGVzIGNyZWF0ZTpzc29fYWNjZXNzX3RpY2tldHMgZGVsZXRlOnNzb19hY2Nlc3NfdGlja2V0cyByZWFkOmZvcm1zIHVwZGF0ZTpmb3JtcyBkZWxldGU6Zm9ybXMgY3JlYXRlOmZvcm1zIHJlYWQ6Zmxvd3MgdXBkYXRlOmZsb3dzIGRlbGV0ZTpmbG93cyBjcmVhdGU6Zmxvd3MgcmVhZDpmbG93c192YXVsdCByZWFkOmZsb3dzX3ZhdWx0X2Nvbm5lY3Rpb25zIHVwZGF0ZTpmbG93c192YXVsdF9jb25uZWN0aW9ucyBkZWxldGU6Zmxvd3NfdmF1bHRfY29ubmVjdGlvbnMgY3JlYXRlOmZsb3dzX3ZhdWx0X2Nvbm5lY3Rpb25zIHJlYWQ6Zmxvd3NfZXhlY3V0aW9ucyBkZWxldGU6Zmxvd3NfZXhlY3V0aW9ucyByZWFkOmNvbm5lY3Rpb25zX29wdGlvbnMgdXBkYXRlOmNvbm5lY3Rpb25zX29wdGlvbnMgcmVhZDpzZWxmX3NlcnZpY2VfcHJvZmlsZV9jdXN0b21fdGV4dHMgdXBkYXRlOnNlbGZfc2VydmljZV9wcm9maWxlX2N1c3RvbV90ZXh0cyBjcmVhdGU6bmV0d29ya19hY2xzIHVwZGF0ZTpuZXR3b3JrX2FjbHMgcmVhZDpuZXR3b3JrX2FjbHMgZGVsZXRlOm5ldHdvcmtfYWNscyBkZWxldGU6dmRjc190ZW1wbGF0ZXMgcmVhZDp2ZGNzX3RlbXBsYXRlcyBjcmVhdGU6dmRjc190ZW1wbGF0ZXMgdXBkYXRlOnZkY3NfdGVtcGxhdGVzIGNyZWF0ZTpjdXN0b21fc2lnbmluZ19rZXlzIHJlYWQ6Y3VzdG9tX3NpZ25pbmdfa2V5cyB1cGRhdGU6Y3VzdG9tX3NpZ25pbmdfa2V5cyBkZWxldGU6Y3VzdG9tX3NpZ25pbmdfa2V5cyByZWFkOmZlZGVyYXRlZF9jb25uZWN0aW9uc190b2tlbnMgZGVsZXRlOmZlZGVyYXRlZF9jb25uZWN0aW9uc190b2tlbnMgY3JlYXRlOnVzZXJfYXR0cmlidXRlX3Byb2ZpbGVzIHJlYWQ6dXNlcl9hdHRyaWJ1dGVfcHJvZmlsZXMgdXBkYXRlOnVzZXJfYXR0cmlidXRlX3Byb2ZpbGVzIGRlbGV0ZTp1c2VyX2F0dHJpYnV0ZV9wcm9maWxlcyByZWFkOmV2ZW50X3N0cmVhbXMgY3JlYXRlOmV2ZW50X3N0cmVhbXMgZGVsZXRlOmV2ZW50X3N0cmVhbXMgdXBkYXRlOmV2ZW50X3N0cmVhbXMgcmVhZDpldmVudF9kZWxpdmVyaWVzIHVwZGF0ZTpldmVudF9kZWxpdmVyaWVzIGNyZWF0ZTpjb25uZWN0aW9uX3Byb2ZpbGVzIHJlYWQ6Y29ubmVjdGlvbl9wcm9maWxlcyB1cGRhdGU6Y29ubmVjdGlvbl9wcm9maWxlcyBkZWxldGU6Y29ubmVjdGlvbl9wcm9maWxlcyBjcmVhdGU6Z3JvdXBfcm9sZXMgZGVsZXRlOmdyb3VwX3JvbGVzIHJlYWQ6dXNlcl9lZmZlY3RpdmVfcGVybWlzc2lvbnMgcmVhZDp1c2VyX2VmZmVjdGl2ZV9yb2xlcyByZWFkOm9yZ2FuaXphdGlvbl9tZW1iZXJfZWZmZWN0aXZlX3JvbGVzIHJlYWQ6dXNlcl9yb2xlX3NvdXJjZV9ncm91cHMgcmVhZDpvcmdhbml6YXRpb25fbWVtYmVyX3JvbGVfc291cmNlX2dyb3VwcyByZWFkOnVzZXJfcGVybWlzc2lvbl9zb3VyY2Vfcm9sZXMgcmVhZDpncm91cF9yb2xlcyByZWFkOm9yZ2FuaXphdGlvbl9ncm91cHMgY3JlYXRlOm9yZ2FuaXphdGlvbl9ncm91cHMgZGVsZXRlOm9yZ2FuaXphdGlvbl9ncm91cHMgcmVhZDpvcmdhbml6YXRpb25fZ3JvdXBfcm9sZXMgY3JlYXRlOm9yZ2FuaXphdGlvbl9ncm91cF9yb2xlcyBkZWxldGU6b3JnYW5pemF0aW9uX2dyb3VwX3JvbGVzIGNyZWF0ZTp0b2tlbl9leGNoYW5nZV9wcm9maWxlcyByZWFkOnRva2VuX2V4Y2hhbmdlX3Byb2ZpbGVzIHVwZGF0ZTp0b2tlbl9leGNoYW5nZV9wcm9maWxlcyBkZWxldGU6dG9rZW5fZXhjaGFuZ2VfcHJvZmlsZXMgcmVhZDpvcmdhbml6YXRpb25fY2xpZW50X2dyYW50cyBjcmVhdGU6b3JnYW5pemF0aW9uX2NsaWVudF9ncmFudHMgZGVsZXRlOm9yZ2FuaXphdGlvbl9jbGllbnRfZ3JhbnRzIHJlYWQ6b3JnYW5pemF0aW9uX2NsaWVudHMgY3JlYXRlOm9yZ2FuaXphdGlvbl9jbGllbnRzIHVwZGF0ZTpvcmdhbml6YXRpb25fY2xpZW50cyBkZWxldGU6b3JnYW5pemF0aW9uX2NsaWVudHMgcmVhZDpldmVudHMgY3JlYXRlOnJhdGVfbGltaXRfcG9saWNpZXMgcmVhZDpyYXRlX2xpbWl0X3BvbGljaWVzIHVwZGF0ZTpyYXRlX2xpbWl0X3BvbGljaWVzIGRlbGV0ZTpyYXRlX2xpbWl0X3BvbGljaWVzIGNyZWF0ZTpwb3J0YWxzIHJlYWQ6cG9ydGFscyB1cGRhdGU6cG9ydGFscyBkZWxldGU6cG9ydGFscyByZWFkOnNlY3VyaXR5X21ldHJpY3MgcmVhZDpjb25uZWN0aW9uc19rZXlzIHVwZGF0ZTpjb25uZWN0aW9uc19rZXlzIGNyZWF0ZTpjb25uZWN0aW9uc19rZXlzIGNyZWF0ZTpncm91cHMgcmVhZDpncm91cHMgdXBkYXRlOmdyb3VwcyBkZWxldGU6Z3JvdXBzIHJlYWQ6Z3JvdXBfbWVtYmVycyIsImd0eSI6ImNsaWVudC1jcmVkZW50aWFscyIsImF6cCI6InNlUEpzdUVVUnJIQ2FET1ozclRET0RSYzl6Z043T0hiIn0.Za1ovfVbKPq4viVd0EyPwxYzWi1kqoVzJpGPZ58EJKbQYxStKEHQE3tR0eBc9gzEq1c4waKy5Phm5MWiKuWStpwj1E527lMUZSENyv-DgJVoTEcH-N_J5a8EqLvFMtm-5tqzTIlJiO63thDPfp8eBcVcZHkadDTXFX5s9j2G5zpeHrnobUOIm54Jb2t2-YvsBwwaqOe__ra2WITDdXZaceBnpLBhjahZTc3k6od9cwDGGZGc3RaWH_mC9OsR6jz8o1SqWBZ_YHuwGl1poj5BIZfzcHBATvsEY_cy05LRZFeTSwZU4HcWcJ4YZvQ0C1_JF6rm3_zHsavLQYU_CSxKYw'
  })
  .send(JSON.stringify(problem))
  .end(function(res) {
    if (res.error) throw new Error(res.error);
    console.log(res.raw_body);
  });





