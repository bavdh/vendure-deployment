# vendure-assignment

This project is a Vendure-based e-commerce backend with a server, worker, dashboard, PostgreSQL database, and Redis. It includes local development, Docker, Kubernetes, and GitHub Actions workflows for building, testing, and deploying the application.

Useful links:

- [Vendure docs](https://www.vendure.io/docs)
- [Vendure Discord community](https://www.vendure.io/community)
- [Vendure on GitHub](https://github.com/vendurehq/vendure)
- [Vendure plugin template](https://github.com/vendurehq/plugin-template)

## Architecture

The Vendure server and worker are deployed as separate workloads, allowing them to be scaled and managed independently based on their respective responsibilities. The server handles API requests and customer traffic, while the worker processes background jobs and can be scaled independently without affecting the server workload.

The Dashboard is built as a static frontend application and served by the Vendure server through DashboardPlugin. Since it does not require a separate backend runtime, it is deployed alongside the server, keeping the Dashboard and API versioned and released together.

## Directory structure

- `/src` contains the source code of the Vendure server, including the main configuration, custom code, GraphQL definitions, and database migrations.
- `/helm` contains the Helm chart used to deploy the application to Kubernetes, including chart configuration, values, and Kubernetes resource templates.
- `/docker-compose.yml` defines the local Docker Compose environment used for development.
- `/docker-compose-production.yml` defines the Docker Compose configuration for running the application in a production-like environment.
- `/Dockerfile` contains the multi-stage Docker build configuration used to build the production application image.
- `/.github/workflows` contains the GitHub Actions workflows used for pull request validation and building and publishing Docker images.
- `/.husky` contains the Git hooks used by Husky. The pre-commit hook runs the project's linting, TypeScript type checking, and Helm validation before a commit is created.
- `/package.json` defines the project's dependencies, development dependencies, npm scripts, and project configuration.

## Prerequisits

- Node.js 22+
- npm
- Docker
- Docker Compose
- kubectl
- Helm

## Local Development

### Running with npm

Install dependencies:

```bash
npm ci
```

Start the complete Vendure development environment:

```bash
npm run dev
```

Individual processes can also be started separately:

```bash
npm run dev:server
npm run dev:worker
npm run dev:dashboard
```

## Code Quality & Pre-commit

Husky is used to run project checks automatically before a Git commit is created.

The current pre-commit checks are:

```text
Git commit
    │
    ├── ESLint
    ├── TypeScript typecheck
    └── Helm lint
```

### ESLint

Run ESLint manually with:

```bash
npm run lint
```

### TypeScript typecheck

Run the TypeScript compiler without producing output:

```bash
npm run typecheck
```

### Helm lint

Validate the Helm chart with:

```bash
helm lint ./helm/vendure
```

### Husky

Husky is initialized through npm's `prepare` lifecycle script so that Git hooks are configured automatically after installing project dependencies.

The production Docker image does not install Husky because Git hooks are not required inside the runtime container.

## Running with Docker Compose

The development environment is defined in docker-compose.yml.
Build and start the Docker Compose environment with:

```bash
docker compose -f docker-compose.yaml up --build
```

To run in the background:

```bash
docker compose -f docker-compose.yaml up --build -d
```

Stop the environment with:

```bash
docker compose -f docker-compose.yaml down
```

## Running the Production Environment with Docker Compose

The production-like environment is defined in docker-compose-production.yml.
The Compose file expects a Docker image tagged as `vendure-assignment:production`.

Build the production image:

```bash
docker build -t vendure-assignment:production .
```

Start the production environment

```bash
docker compose -f docker-compose-production.yml up
```

To run it in the background:

```bash
docker compose -f docker-compose-production.yml up -d
```

Stop the environment with:

```bash
docker compose -f docker-compose-production.yml down
```

## Plugins

In Vendure, your custom functionality will live in [plugins](https://www.vendure.io/docs/plugins/).
These should be located in the `./src/plugins` directory.

To create a new plugin run:

```
npx vendure add
```

and select `[Plugin] Create a new Vendure plugin`.

## Migrations

[Migrations](https://www.vendure.io/docs/developer-guide/migrations/) allow safe updates to the database schema. Migrations
will be required whenever you make changes to the `customFields` config or define new entities in a plugin.

To generate a new migration, run:

```
npx vendure migrate
```

The generated migration file will be found in the `./src/migrations/` directory, and should be committed to source control.

Pending migrations can also be run manually using the migration script defined in the project:

```
npm run migrate
```

During initial development, `dbConnectionOptions.synchronize` in `vendure-config.ts` can be set to `true` to automatically synchronize the database schema when the server starts. This can be convenient while developing, but it is **not recommended for production environments**, where migration files should be used to manage schema changes safely.

## Kubernetes Migration

Database migrations are handled separately from the Vendure server and worker workloads. The project's `src/migrate.ts` entrypoint is compiled as part of the application build and produces `dist/migrate.js`.

The Kubernetes migration job executes this built entrypoint to apply any pending migrations before the application is started or updated.

This keeps schema changes as an explicit deployment step and prevents multiple application replicas from attempting to run migrations simultaneously.

## CI/CD

### Pull Request Workflow

The pull-request workflow runs when a pull request is created or updated.

The workflow performs validation before the Docker image is built:

```text
Pull Request
     │
     ▼
Lint & Validate
 ├── TypeScript typecheck
 ├── ESLint
 └── Helm lint
     │
     │ success
     ▼
Docker Build
```

The Docker image is built during pull-request validation, but it is not pushed to the container registry.

This ensures the same Dockerfile used for the final image is validated before changes can be merged.

### Main Branch Workflow

Changes pushed to `main` trigger the image publishing workflow.

```text
Merge / push to main
        │
        ▼
   Docker build
        │
        ▼
     GHCR login
        │
        ▼
 Push image to GHCR
```

The image is pushed to GitHub Container Registry (`ghcr.io`) using the commit SHA as the image tag.

```text
ghcr.io/bavdh/vendure-assignment:<commit-sha>
```

Using the commit SHA creates an immutable image reference. Different commits therefore produce different image tags, which allows a specific build to be selected later for deployment or rollback.

### Security Considerations

Application workloads do not require access to the Kubernetes API. The Vendure server, worker, and migration Job therefore use dedicated Kubernetes ServiceAccounts with automatic ServiceAccount token mounting disabled.

```bash
automountServiceAccountToken: false
```

This prevents Kubernetes API credentials from being automatically mounted into the application containers.

## Troubleshooting

### Error: Could not load the "sharp" module using the \[OS\]-x\[Architecture\] runtime when running Vendure server.

- Make sure your Node version is ^18.17.0 || ^20.3.0 || >=21.0.0 to support the Sharp library.
- Make sure your package manager is up to date.
- **Not recommended**: if none of the above helps to resolve the issue, install sharp specifying your machines OS and Architecture. For example: `pnpm install sharp --config.platform=linux --config.architecture=x64` or `npm install sharp --os linux --cpu x64`
