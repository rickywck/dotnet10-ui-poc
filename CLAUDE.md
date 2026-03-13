# CLAUDE.md — Project Instructions (.NET)
## What this repo is
- .NET 10 backend API focused on scalability, p95/p99 latency, and production reliability.
- Prefer simple, copy/pasteable patterns over "clever architecture".

## Tech stack (depending on your setup)
- .NET 10 / C# (modern style)
- ASP.NET Core (Minimal APIs)
- Dapper (NOT EF Core)
- Redis (IDistributedCache / StackExchange.Redis depending on project)
- Azure hosting (App Service / Containers)
- Observability: Application Insights (logs + metrics)

## Repo map (edit to match your folders)
- src/Api/        → endpoints, DI, middleware, startup
- src/App/        → use-cases/services (business orchestration)
- src/Infra/      → DB, Redis, HTTP clients, external integrations
- tests/          → unit + integration tests

## Hard rules (do not violate)
- NEVER add new framework layers or "Clean Architecture cosplay".
- NEVER introduce patterns we don't use (AutoMapper, repositories, magic abstractions).
- Always pass CancellationToken through all async calls.
- No sync-over-async (no .Result/.Wait).
- No Task.Run inside request handlers.
- Outbound HTTP MUST have timeouts + cancellation.
- Caching MUST have: time budget, stampede protection strategy, and key versioning.

## Default workflow 
1) Ask for missing requirements before changing code.
2) Propose a plan + list files to touch.
3) Implement smallest change that works.
4) Add/update tests when relevant.
5) Provide commands to verify (build/test/run).

## Commands (edit to match your codebase)
- Build: `dotnet build`
- Test: `dotnet test`
- Run API: `dotnet run --project src/Api`
- Format: `dotnet format`

## Output format
- Prefer short sections, small code blocks, and explain trade-offs.
- When making changes: show diff-level guidance + why.