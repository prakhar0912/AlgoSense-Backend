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
