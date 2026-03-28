# Supabase GitHub Actions Setup

## Why this setup exists

The GitHub Actions workflows in this repository use Gemini for review generation and pgvector for project context retrieval. Supabase works well here because it provides managed PostgreSQL with the `vector` extension.

## Recommended setup

Use the Supabase connection string as the primary configuration. This is the simplest setup and keeps the password in a GitHub Secret.

1. Create a Supabase project.
2. Open `Database > Extensions` and enable `vector`.
3. Open `Connect` and copy the connection string.
4. Add the connection string to GitHub Secrets as `PGVECTOR_CONNECTION_STRING`.
5. Add the Gemini key to GitHub Secrets as `GEMINI_API_KEY`.

## GitHub Secrets

Add these in `Settings > Secrets and variables > Actions > Secrets`.

```text
GEMINI_API_KEY
PGVECTOR_CONNECTION_STRING
```

If you prefer the older split configuration, add these secrets instead of the connection string:

```text
PGVECTOR_USER
PGVECTOR_PASSWORD
```

## GitHub Variables

Optional variables for Supabase:

```text
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
PGVECTOR_SSL_ENABLED=true
PGVECTOR_SSL_REJECT_UNAUTHORIZED=true
PGVECTOR_PORT=5432
PGVECTOR_TABLE_NAME=code_embeddings
PGVECTOR_COLLECTION_TABLE_NAME=code_embedding_collections
PGVECTOR_ENABLE_HNSW=false
PGVECTOR_MAX_INDEXED_CHUNKS=600
```

Notes:

- `PGVECTOR_SSL_ENABLED` defaults to `true` when the host or connection string contains `supabase.com`.
- `PGVECTOR_ENABLE_HNSW=false` is a safer starting point on managed databases. Turn it on only after confirming your Supabase plan and database permissions fit your workload.

## Supabase connection string example

```text
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres
```

You can paste that full value into `PGVECTOR_CONNECTION_STRING`.

## If you use split configuration instead

Add these values:

```text
PGVECTOR_HOST=aws-0-ap-northeast-2.pooler.supabase.com
PGVECTOR_PORT=5432
PGVECTOR_DATABASE=postgres
```

And these secrets:

```text
PGVECTOR_USER=postgres.xxxxx
PGVECTOR_PASSWORD=[YOUR-PASSWORD]
```

## First test

1. Run the `AI Index` workflow manually from the Actions tab.
2. Confirm the workflow can connect to Supabase and finish indexing.
3. Open a pull request in the same repository.
4. Confirm the `AI Assistant` workflow leaves a review comment.
