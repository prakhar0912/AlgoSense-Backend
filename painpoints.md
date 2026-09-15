# Zod optional fields and partial-update payloads

Zod's `.optional()` allows both omission and an explicit `undefined` value. For example:

```ts
const updateUserSchema = z.object({
  displayName: z.string().optional(),
});

type UpdateUser = z.infer<typeof updateUserSchema>;
// { displayName?: string | undefined }
```

Both of these inputs are valid:

```ts
{};
{ displayName: undefined };
```

This differs from TypeScript's `Partial<T>` when `exactOptionalPropertyTypes` is enabled:

```ts
type User = { displayName: string };
type UserUpdate = Partial<User>;
// { displayName?: string }
```

With that compiler option, `displayName` may be absent, but an object that explicitly provides `displayName: undefined` is not assignable. This distinction matters for partial row updates: an omitted property means "leave the column unchanged," while `undefined` may accidentally be treated as a value to write, clear, or serialize.

Zod currently has no built-in object-field modifier whose inferred type is optional-but-not-`undefined`, matching `Partial<T>` under `exactOptionalPropertyTypes`. `.partial()` has the same inference behavior because it applies `.optional()` to each selected property.

For update DTOs, use a separate TypeScript type such as `Partial<User>` at the persistence boundary, or normalize the parsed Zod result by removing keys whose values are `undefined` before building the database update. This preserves Zod's runtime validation while ensuring only intentionally supplied fields are written.


Concurency tests showed flaws in the implementation of submitSolution use case.
We were loading the users scores just for display before locking the row, then locking the user's row, rereading the user's scores freshly, calculating the updates, and then comitting them, then making another call to get the fresh updated scores and displaying them as the new scores.
We were fetching the user's data 3 times, reduced that to 1 time, that is the only time and the lock on the user's row is placed in that call and making the use case return back the original scores and the fresh updated scores.


Pivoting to a job queue for handling the long running AI evaluation.


Using the submission ID as the BullMQ job ID.
BullMQ generates a unique job ID for every call to `Queue.add` unless one is supplied. If the same submission is enqueued more than once, those entries would otherwise be treated as separate jobs and could be processed concurrently by different workers, causing the submission and user scores to be updated more than once.
The submission ID already uniquely identifies the unit of evaluation, so using it as the job ID makes enqueueing that submission idempotent while the BullMQ job exists. Repeated enqueue attempts resolve to the same job instead of creating competing jobs for the same submission.
