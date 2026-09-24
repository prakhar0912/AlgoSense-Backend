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


# Intentionally discarding background promises

The dependency health monitor calls an asynchronous method from `setInterval`. The timer does not await an async callback, so calling the method creates a promise that is not otherwise consumed:

```ts
this.refreshDependencyCheck();
```

This is commonly called a floating promise. It can be accidental, and a rejection can become an unhandled promise rejection. Prefixing the call with `void` documents that background execution is intentional:

```ts
void this.refreshDependencyCheck();

const timer = setInterval(() => {
  void this.refreshDependencyCheck();
}, 5_000);
```

The `void` operator does not cancel the operation or handle errors. The asynchronous function still runs normally, but its returned promise is deliberately ignored. Therefore, a function started this way must catch its own expected errors, or the caller must attach a `.catch(...)` handler.

For the shared `HealthProbe`, `refreshDependencyCheck` catches each injected dependency check's failures and resets `checkInProgress` in a `finally` block. The flag prevents a new interval from starting another check while the previous database or queue check is still running. Shutdown prevents in-flight results from restoring readiness:

```ts
async refreshDependencyCheck(): Promise<void> {
  if (this.checkInProgress || this.state.shuttingDown) {
    return;
  }

  this.checkInProgress = true;

  try {
    const results = await Promise.all(
      this.options.readinessChecks.map(async (check) => {
        try {
          return await check();
        } catch {
          return false;
        }
      }),
    );

    if (!this.state.shuttingDown) {
      this.state.dependenciesReady = results.every(result => result);
      this.state.lastCheckedAt = Date.now();
    }
  } finally {
    this.checkInProgress = false;
  }
}
```

Use `await` when later work depends on completion. Use `void` only when the operation is intentionally detached and owns its error handling.


# Permanent failure persistence is best-effort

When a BullMQ job exhausts its configured attempts or throws an `UnrecoverableError`, the worker's local `failed` event handler calls `submissionDAO.markFailed(...)`. This keeps PostgreSQL synchronized with BullMQ during normal operation, but the event handler is not a durable delivery mechanism.

The BullMQ job can reach its final `failed` state while PostgreSQL is unavailable. In that case, `markFailed` throws, the handler logs the error, and nothing retries the database update. The worker process can also exit after BullMQ records the failure but before the local event handler finishes. BullMQ then contains the terminal failure while the submission row can remain `pending` or `evaluating` indefinitely.

The durable solution is a reconciliation process that periodically reads retained failed jobs from BullMQ and repairs the corresponding submission state in PostgreSQL. For each failed job, it should:

1. Read the submission ID from the job data and the failure reason from BullMQ.
2. Call `markFailed` using a conditional database update that only changes submissions still in `pending` or `evaluating` state.
3. Treat an already `failed` or `completed` submission as reconciled so repeated runs remain safe.
4. Retry database errors with bounded backoff and report failures that continue beyond an operational threshold.

The reconciler can run on a timer in a dedicated process or as a Kubernetes CronJob. If several instances can run concurrently, use a distributed lock or rely on the conditional, idempotent database update while accepting the extra duplicate reads. Failed BullMQ jobs must be retained long enough for reconciliation; removing them immediately would remove the durable record needed to repair PostgreSQL.

The existing local `failed` handler should remain because it updates the submission quickly when PostgreSQL is healthy. Reconciliation provides the recovery path when that immediate update cannot complete. `QueueEvents` can centralize live failure notifications, but it does not replace reconciliation because a consumer can still be unavailable when an event occurs.


# Submission creation and queue insertion are not atomic

Submitting a solution currently writes the initial submission to PostgreSQL and then adds its evaluation job to BullMQ in Redis. These operations use independent systems and cannot participate in the same database transaction.

If PostgreSQL commits the submission and Redis becomes unavailable before `Queue.add` succeeds, the request leaves behind a `pending` submission with no evaluation job. Retrying the API request may create another submission instead of enqueueing the original one. Adding the BullMQ job first only reverses the problem: a job could exist for a submission whose database transaction never committed.

Use a transactional outbox to make the PostgreSQL portion atomic and make queue delivery retryable:

1. In one PostgreSQL transaction, insert the pending submission and an outbox row describing an `evaluate-submission` event with the submission ID.
2. Commit both rows together. Either both become visible or neither does.
3. Run an outbox dispatcher that claims undispatched rows in batches, commonly with `FOR UPDATE SKIP LOCKED`, and adds each job to BullMQ.
4. Use the submission ID as the BullMQ job ID so retrying delivery does not create concurrent duplicate jobs.
5. Mark the outbox row as dispatched only after `Queue.add` succeeds. Retry failures with backoff and retain enough error information for monitoring.

There is still a possible crash after `Queue.add` succeeds but before the dispatcher marks the outbox row as dispatched. On restart, the dispatcher sends the event again. The deterministic BullMQ job ID makes that retry idempotent while the job exists, and the worker's conditional submission-state updates provide an additional guard against reevaluating a completed submission.

The dispatcher can run as a small long-lived process, alongside the API with appropriate concurrency control, or as a separate Kubernetes workload. The API can return once the submission and outbox row commit; queue delivery then continues independently during temporary Redis outages.
