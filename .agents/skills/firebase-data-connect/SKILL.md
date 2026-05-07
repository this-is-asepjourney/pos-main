---
name: firebase-data-connect
<<<<<<< HEAD
description: Builds and deploys Firebase SQL Connect (aka Firebase Data Connect) backends with PostgreSQL securely. Use when designing schemas with tables and relations, writing authorized queries and mutations, configuring real-time data updates, or generating type-safe SDKs. Use when you need a relational database with Firebase, or when the user mentions SQL Connect or Data Connect.
---

# Firebase SQL Connect

Firebase SQL Connect is a relational database service using Cloud SQL for PostgreSQL with GraphQL schema, auto-generated queries/mutations, and type-safe SDKs.
=======
description: Build and deploy Firebase SQL Connect (aka Firebase Data Connect) backends with PostgreSQL. Use for schema design, GraphQL queries/mutations, authorization, and SDK generation for web, Android, iOS, and Flutter apps.
---

# Firebase Data Connect

Firebase Data Connect is a relational database service using Cloud SQL for PostgreSQL with GraphQL schema, auto-generated queries/mutations, and type-safe SDKs.
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be

> [!NOTE]
> **Product Rename**: Firebase Data Connect was renamed to **Firebase SQL Connect**. All instructions, references, and examples in this skill repository referring to "Data Connect" or "Firebase Data Connect" apply to "SQL Connect" and "Firebase SQL Connect" as well.

## Project Structure

<<<<<<< HEAD
```text
=======
```
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be
dataconnect/
├── dataconnect.yaml      # Service configuration
├── schema/
│   └── schema.gql        # Data model (types with @table)
└── connector/
    ├── connector.yaml    # Connector config + SDK generation
    ├── queries.gql       # Queries
    └── mutations.gql     # Mutations
```

<<<<<<< HEAD
## Key Tools for Validation

Rely on these two mechanisms to ensure project correctness:
1. **Review GraphQL Schema**: Both user-defined and generated extensions (in `.dataconnect/schema/main/`).
2. **Validate Operations**: Run `npx -y firebase-tools@latest dataconnect:compile` against the schema.

=======
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be
## Operation Strategies: GraphQL vs. Native SQL

Always default to **Native GraphQL**. **Native SQL lacks type safety** and bypasses schema-enforced structures. Only use **Native SQL** when the user explicitly requests it or when the task requires advanced database features.

| Strategy | When to use | Implementation |
|----------|-------------|----------------|
| **Native GraphQL** (Default) | Almost all use cases. Standard CRUD, basic filtering/sorting, simple relational joins. Requires full type safety. | Auto-generated fields (`movie_insert`, `movies`). Strong typing and schema enforcement. |
| **Native SQL** (Advanced) | PostgreSQL extensions (e.g., PostGIS), window functions (`RANK()`), complex aggregations, or highly tuned sub-queries. | Raw SQL string literals via `_select`, `_execute`, etc. Requires strict positional parameters (`$1`). No type safety. |

## Development Workflow

Follow this strict workflow to build your application. You **must** read the linked reference files for each step to understand the syntax and available features.

### 1. Define Data Model (`schema/schema.gql`)
<<<<<<< HEAD
Define your GraphQL types, tables, and relationships (which map to a Postgres schema).
=======
Define your GraphQL types, tables, and relationships.
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be
> **Read [reference/schema.md](reference/schema.md)** for:
> *   `@table`, `@col`, `@default`
> *   Relationships (`@ref`, one-to-many, many-to-many)
> *   Data types (UUID, Vector, JSON, etc.)

<<<<<<< HEAD
### 2. Define Authorized Operations (`connector/queries.gql`, `connector/mutations.gql`)
Write the queries and mutations your client will use, including authorization logic. SQL Connect is secure by default.
=======
### 2. Define Operations (`connector/queries.gql`, `connector/mutations.gql`)
Write the queries and mutations your client will use. Data Connect generates the underlying SQL.
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be
> **Read [reference/operations.md](reference/operations.md)** for:
> *   **Queries**: Filtering (`where`), Ordering (`orderBy`), Pagination (`limit`/`offset`).
> *   **Mutations**: Create (`_insert`), Update (`_update`), Delete (`_delete`).
> *   **Upserts**: Use `_upsert` to "insert or update" records (CRITICAL for user profiles).
<<<<<<< HEAD
> *   **Transactions**: Use `@transaction` for multi-step atomic operations. Use `_expr: "response.<prevStep>"` to pass data between steps.
>
> **Read [reference/security.md](reference/security.md)** for authorization:
> *   `@auth(level: ...)` for PUBLIC, USER, or NO_ACCESS.
> *   `@check` and `@redact` for row-level security and validation.
>
> **Read [reference/realtime.md](reference/realtime.md)** for real-time subscriptions:
> *   `@refresh` directive for time-based polling and event-driven updates.
> *   CEL conditions to scope refresh triggers precisely.
>
=======
> *   **Transactions**: use `@transaction` for multi-step atomic operations.
> 
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be
> **Read [reference/native_sql.md](reference/native_sql.md)** for Native SQL operations:
> *   Embedding raw SQL with `_select`, `_selectFirst`, `_execute`
> *   Strict rules for positional parameters (`$1`, `$2`), quoting, and CTEs
> *   Advanced PostgreSQL features (PostGIS, Window Functions)

<<<<<<< HEAD
### 3. Use type-safe SDK in your apps
Generate type-safe code for your client platform.

Configure SDK generation in `connector.yaml`:

```yaml
connectorId: my-connector
generate:
  javascriptSdk:
    outputDir: "../web-app/src/lib/dataconnect"
    package: "@movie-app/dataconnect"
  kotlinSdk:
    outputDir: "../android-app/app/src/main/kotlin/com/example/dataconnect"
    package: "com.example.dataconnect"
  swiftSdk:
    outputDir: "../ios-app/DataConnect"
```

Generate SDKs:
```bash
npx -y firebase-tools@latest dataconnect:sdk:generate
```

For platform-specific instructions on how to use the generated SDKs, read:
*   **Web (TypeScript)**: [reference/sdk_web.md](reference/sdk_web.md)
*   **Android (Kotlin)**: [reference/sdk_android.md](reference/sdk_android.md)
*   **iOS (Swift)**: [reference/sdk_ios.md](reference/sdk_ios.md)
*   **Admin (Node.js)**: [reference/sdk_admin_node.md](reference/sdk_admin_node.md)
*   **Flutter (Dart)**: [reference/sdk_flutter.md](reference/sdk_flutter.md)


=======
### 3. Secure Your App (`connector/` files)
Add authorization logic closely with your operations.
> **Read [reference/security.md](reference/security.md)** for:
> *   `@auth(level: ...)` for PUBLIC, USER, or NO_ACCESS.
> *   `@check` and `@redact` for row-level security and validation.

### 4. Generate & Use SDKs
Generate type-safe code for your client platform.
> **Read [reference/sdks.md](reference/sdks.md)** for:
> *   Android (Kotlin), iOS (Swift), Web (TypeScript), Flutter (Dart).
> *   How to initialize and call your queries/mutations.
> *   **Nested Data**: See how to access related fields (e.g., `movie.reviews`).
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be

---

## Feature Capability Map

If you need to implement a specific feature, consult the mapped reference file:

| Feature | Reference File | Key Concepts |
| :--- | :--- | :--- |
| **Data Modeling** | [reference/schema.md](reference/schema.md) | `@table`, `@unique`, `@index`, Relations |
| **Vector Search** | [reference/advanced.md](reference/advanced.md) | `Vector`, `@col(dataType: "vector")` |
| **Full-Text Search** | [reference/advanced.md](reference/advanced.md) | `@searchable` |
| **Upserting Data** | [reference/operations.md](reference/operations.md) | `_upsert` mutations |
| **Complex Filters** | [reference/operations.md](reference/operations.md) | `_or`, `_and`, `_not`, `eq`, `contains` |
| **Transactions** | [reference/operations.md](reference/operations.md) | `@transaction`, `response` binding |
| **Environment Config** | [reference/config.md](reference/config.md) | `dataconnect.yaml`, `connector.yaml` |
<<<<<<< HEAD
| **Realtime Subscriptions** | [reference/realtime.md](reference/realtime.md) | `@refresh`, `subscribe()`, auto-refresh |
| **Starter Templates** | [templates.md](templates.md) | CRUD, user-owned resources, many-to-many, SDK init |
=======
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be

---

## Deployment & CLI

> **Read [reference/config.md](reference/config.md)** for deep dive on configuration.

<<<<<<< HEAD
Follow these patterns based on your current task:

### How to initialize SQL Connect in a Firebase project

1.  Understand the app idea. Ask clarification questions if unclear.
2.  Run `npx -y firebase-tools@latest init dataconnect`.
3.  Validate that the app template and generated SDK are setup.

### How to build apps using SQL Connect locally

1.  Start the emulator: `npx -y firebase-tools@latest emulators:start --only dataconnect`.
2.  Write schema and operations.
3.  Run `npx -y firebase-tools@latest dataconnect:compile` or `npx -y firebase-tools@latest dataconnect:sdk:generate` to
    validate them.
4.  Use the operations in your app and build it.

### How to deploy SQL Connect to Cloud SQL

1.  Run `npx -y firebase-tools@latest deploy --only dataconnect`.

## Examples

For complete, working code examples of schemas and operations, see
**[examples.md](examples.md)**.

For ready-to-use starter templates (CRUD, user-owned resources, many-to-many, YAML configs, SDK init), see **[templates.md](templates.md)**.
=======
Common commands (run from project root):
```bash
# Initialize Data Connect
npx -y firebase-tools@latest init dataconnect

# Start local emulator
npx -y firebase-tools@latest emulators:start --only dataconnect

# Generate SDK code
npx -y firebase-tools@latest dataconnect:sdk:generate

# Deploy to production
npx -y firebase-tools@latest deploy --only dataconnect
```

## Examples

For complete, working code examples of schemas and operations, see **[examples.md](examples.md)**.
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be
