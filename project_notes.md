Controllers will be responsible for checking if we are sending the data in the correct
format i.e. we will check if a use case requires a string, we only send a string and reject
if the data is not in the correct format.

Use cases will be responsible for checking if the input data is in the valid ranges, etc
i.e. if a use case requires a string of length 10, we will reject if the string is not of length 10.




















Prompt to generate tests:
You are a senior software engineer specializing in JavaScript/TypeScript testing.

Task:
Create a comprehensive Jest test file for the given use case.

Requirements:
- Write tests that cover the happy path, edge cases, error cases, boundary conditions, and all important branches.
- Mock all external dependencies cleanly.
- Follow Arrange-Act-Assert structure.
- Use Jest best practices.
- Keep the test file focused on the use case logic only.
- If the use case has async behavior, test it properly with async/await.
- If there are thrown errors or rejected promises, assert them correctly.
- If there are side effects, verify the correct calls, arguments, and call counts.
- If the use case has conditional branches, ensure each branch is tested.
- Include clear test descriptions.
- Do not write implementation code unless absolutely necessary to make the tests understandable.
- If something is ambiguous, make a reasonable assumption and state it briefly before the code.

Output format:
1. Brief explanation of the testing strategy.
2. The complete Jest test file only.
3. Use TypeScript if the source appears to be TypeScript; otherwise use JavaScript.

Here is the use case:
C:\Users\prakh\OneDrive\Desktop\Projects\AlgoSense-Backend\src\use-cases\user\authorize.ts

Make sure to test all possible inputs of the given data type (i.e. the input via the function parameters is going to be of the type declared in that function's declaration/definition and no other type like undefined or null, if it's string it is going to be passed a string) declared in this use cases function.


[Add any specific inputs you would like to test]