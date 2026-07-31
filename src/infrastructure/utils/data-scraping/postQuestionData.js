import { convert } from "html-to-text"

import unirest from 'unirest';

let problem =
{
  "title": "Ways to Split Array Into Three Subarrays",
  "description": convert("<p>A split of an integer array is <strong>good</strong> if:</p>\n\n<ul>\n\t<li>The array is split into three <strong>non-empty</strong> contiguous subarrays - named <code>left</code>, <code>mid</code>, <code>right</code> respectively from left to right.</li>\n\t<li>The sum of the elements in <code>left</code> is less than or equal to the sum of the elements in <code>mid</code>, and the sum of the elements in <code>mid</code> is less than or equal to the sum of the elements in <code>right</code>.</li>\n</ul>\n\n<p>Given <code>nums</code>, an array of <strong>non-negative</strong> integers, return <em>the number of <strong>good</strong> ways to split</em> <code>nums</code>. As the number may be too large, return it <strong>modulo</strong> <code>10<sup>9 </sup>+ 7</code>.</p>\n\n<p>&nbsp;</p>\n<p><strong class=\"example\">Example 1:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [1,1,1]\n<strong>Output:</strong> 1\n<strong>Explanation:</strong> The only good way to split nums is [1] [1] [1].</pre>\n\n<p><strong class=\"example\">Example 2:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [1,2,2,2,5,0]\n<strong>Output:</strong> 3\n<strong>Explanation:</strong> There are three good ways of splitting nums:\n[1] [2] [2,2,5,0]\n[1] [2,2] [2,5,0]\n[1,2] [2,2] [5,0]\n</pre>\n\n<p><strong class=\"example\">Example 3:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [3,2,1]\n<strong>Output:</strong> 0\n<strong>Explanation:</strong> There is no good way to split nums.</pre>\n\n<p>&nbsp;</p>\n<p><strong>Constraints:</strong></p>\n\n<ul>\n\t<li><code>3 &lt;= nums.length &lt;= 10<sup>5</sup></code></li>\n\t<li><code>0 &lt;= nums[i] &lt;= 10<sup>4</sup></code></li>\n</ul>\n", { wordwrap: 130 }),
  "difficulty": "medium",
  "testCases": [],
  "approaches": [
    {
      "type": "Expected Approach",
      "primary_technique": "Binary search on the answer",
      "time_complexity": "O(n log R)",
      "space_complexity": "O(1)",
      "req_or_constraints": "Feasibility changes monotonically as the candidate value increases or decreases.",
      "steps": [
        "Identify the feasibility threshold for Ways to Split Array Into Three Subarrays and preserve only the information needed to continue.",
        "Initialize the smallest valid starting case before processing the full input.",
        "Update the predicate checks as each new item changes the state.",
        "Discard or compress states that no longer affect the answer.",
        "Return the final answer from the last valid state that remains."
      ],
      "explanation": "For Ways to Split Array Into Three Subarrays, the key is to keep only the feasibility threshold that actually matters. Once that compact state is tracked correctly, the transition becomes local and the final answer follows from the last feasible configuration.",
      "edge_cases": [
        {
          "case": "The predicate must be monotonic.",
          "importance": "critical"
        },
        {
          "case": "The lower and upper bounds should bracket the valid answer.",
          "importance": "high"
        },
        {
          "case": "A failed candidate should only rule out one side of the search space.",
          "importance": "critical"
        }
      ]
    },
    {
      "type": "Direct Feasibility Scan",
      "time_complexity": "O(n log R)",
      "space_complexity": "O(1)",
      "req_or_constraints": "Use a more explicit supporting structure for Ways to Split Array Into Three Subarrays.",
      "steps": [
        "Build the supporting structure that makes Ways to Split Array Into Three Subarrays easier to evaluate.",
        "Use that structure to test each candidate or transition once.",
        "Keep the best feasible result instead of recomputing it repeatedly.",
        "Return the best result after the scan finishes."
      ],
      "explanation": "This version keeps the auxiliary structure explicit so the logic for Ways to Split Array Into Three Subarrays is easy to trace. It is often simpler to debug, but it does more bookkeeping than the expected approach.",
      "pros": [
        "Makes the supporting state easy to inspect for Ways to Split Array Into Three Subarrays.",
        "Helpful when debugging individual transitions."
      ],
      "cons": [
        "Uses extra auxiliary structure.",
        "Does more bookkeeping than the expected approach."
      ],
      "edge_cases": [
        {
          "case": "The supporting structure must stay synchronized with the current input state.",
          "importance": "critical"
        },
        {
          "case": "Repeated values or ties should be handled consistently.",
          "importance": "high"
        },
        {
          "case": "The helper structure should not change the problem's validity rule.",
          "importance": "critical"
        }
      ]
    },
    {
      "type": "Brute Force Boundary Search",
      "time_complexity": "O(n^2)",
      "space_complexity": "O(1)",
      "req_or_constraints": "Check every feasible candidate for Ways to Split Array Into Three Subarrays directly.",
      "steps": [
        "Enumerate every candidate state or answer that Ways to Split Array Into Three Subarrays allows.",
        "Check the problem rule directly for each candidate.",
        "Track the best feasible result seen during the enumeration.",
        "Return the best result once all candidates have been checked."
      ],
      "explanation": "This baseline follows the statement literally for Ways to Split Array Into Three Subarrays. It is easy to trust on small inputs, but it repeats work that the optimized approach avoids.",
      "pros": [
        "Directly mirrors the problem definition.",
        "Useful as a correctness reference on small inputs."
      ],
      "cons": [
        "Repeats work across many candidates.",
        "Too slow for the full constraint range."
      ],
      "edge_cases": [
        {
          "case": "The brute-force version should still match the exact definition of Ways to Split Array Into Three Subarrays.",
          "importance": "critical"
        },
        {
          "case": "All candidates or states must be explored without skipping valid ones.",
          "importance": "high"
        },
        {
          "case": "The baseline is only practical because the input size is bounded.",
          "importance": "critical"
        }
      ]
    }
  ],
  "evaluation_criteria": [
    "Correctness: Check that Ways to Split Array Into Three Subarrays satisfies the exact rule described by the problem.",
    "Completeness: Check that all required states, counts, or candidates are considered.",
    "Clarity: Check that the explanation makes the transition or counting rule easy to follow.",
    "Alignment: Check that the answer matches the problem type instead of a nearby but different task.",
    "Edge Cases: Check boundaries, duplicates, empty or minimal states, and tie cases.",
    "Missed Points: Check whether the answer skips an important feasibility or counting condition.",
    "Overall Understanding: Judge whether the solution strategy is clearly connected to the core invariant."
  ]
}

console.log(convert("<p>A split of an integer array is <strong>good</strong> if:</p>\n\n<ul>\n\t<li>The array is split into three <strong>non-empty</strong> contiguous subarrays - named <code>left</code>, <code>mid</code>, <code>right</code> respectively from left to right.</li>\n\t<li>The sum of the elements in <code>left</code> is less than or equal to the sum of the elements in <code>mid</code>, and the sum of the elements in <code>mid</code> is less than or equal to the sum of the elements in <code>right</code>.</li>\n</ul>\n\n<p>Given <code>nums</code>, an array of <strong>non-negative</strong> integers, return <em>the number of <strong>good</strong> ways to split</em> <code>nums</code>. As the number may be too large, return it <strong>modulo</strong> <code>10<sup>9 </sup>+ 7</code>.</p>\n\n<p>&nbsp;</p>\n<p><strong class=\"example\">Example 1:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [1,1,1]\n<strong>Output:</strong> 1\n<strong>Explanation:</strong> The only good way to split nums is [1] [1] [1].</pre>\n\n<p><strong class=\"example\">Example 2:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [1,2,2,2,5,0]\n<strong>Output:</strong> 3\n<strong>Explanation:</strong> There are three good ways of splitting nums:\n[1] [2] [2,2,5,0]\n[1] [2,2] [2,5,0]\n[1,2] [2,2] [5,0]\n</pre>\n\n<p><strong class=\"example\">Example 3:</strong></p>\n\n<pre>\n<strong>Input:</strong> nums = [3,2,1]\n<strong>Output:</strong> 0\n<strong>Explanation:</strong> There is no good way to split nums.</pre>\n\n<p>&nbsp;</p>\n<p><strong>Constraints:</strong></p>\n\n<ul>\n\t<li><code>3 &lt;= nums.length &lt;= 10<sup>5</sup></code></li>\n\t<li><code>0 &lt;= nums[i] &lt;= 10<sup>4</sup></code></li>\n</ul>\n").replace(/\s+/g, ' ').trim())
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





