# Fedora Cloud Image Test Results Dashboard

A web dashboard that displays automated test results for Fedora Cloud images running on Azure infrastructure. It fetches JUnit XML results directly from Azure Blob Storage and presents them with interactive visualizations.

## Features

- **Latest Results** — Shows the most recent test results per distro (Rawhide, ELN, Fedora 43, Fedora 42) and architecture (x86_64, aarch64) with donut charts
- **Weekly & Monthly Trends** — Inline bar charts showing daily pass rates over 7-day and 30-day windows
- **Drill-down Detail Pages** — Click any result card to view individual test suites and test cases with pass/fail/skip status and error messages
- **Auto-discovery** — Automatically finds new composes from Azure Blob Storage by probing date-based patterns
- **Static Build** — Generates static HTML at build time; deployable anywhere

## Data Source

Test results are fetched from Azure Blob Storage at `fedoratestresults.z5.web.core.windows.net`. The blob structure follows:

```
{ComposeId}/{architecture}/junit.xml
```

For example: `Fedora-Cloud-43-20260206.0/x86_64/junit.xml`

Supported compose patterns:
- `Fedora-Cloud-{version}-{YYYYMMDD}.{build}` (e.g., Fedora 42, 43)
- `Fedora-Rawhide-{YYYYMMDD}.n.{build}`
- `Fedora-eln-{YYYYMMDD}.n.{build}`

## Project Structure

```text
/
├── public/
│   ├── favicon.svg
│   ├── fedora-logo.png
│   └── redirect-root.html
├── scripts/
│   └── test-connection.ts
├── src/
│   ├── layouts/
│   │   └── Layout.astro
│   ├── lib/
│   │   ├── azure/
│   │   │   ├── client.ts          # HTTP client for Azure Blob Storage
│   │   │   ├── config.ts          # Azure endpoint configuration
│   │   │   └── discovery.ts       # Auto-discover available composes
│   │   ├── parsers/
│   │   │   └── junit.ts           # JUnit XML parser
│   │   ├── services/
│   │   │   └── results.ts         # High-level results service
│   │   └── utils/
│   │       └── formatters.ts      # Date, duration, version utilities
│   ├── pages/
│   │   ├── index.astro            # Main dashboard page
│   │   ├── results/
│   │   │   └── [compose]/
│   │   │       └── [arch].astro   # Detail page per compose/arch
│   │   └── api/
│   │       ├── composes.json.ts   # API: list composes
│   │       └── results/
│   │           └── [compose]/
│   │               ├── index.json.ts    # API: results for a compose
│   │               └── [arch].json.ts   # API: results for compose/arch
│   └── types/
│       └── index.ts               # TypeScript type definitions
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
└── package.json
```

## Commands

All commands are run from the root of the project:

| Command                    | Action                                                     |
| :------------------------- | :--------------------------------------------------------- |
| `npm install`              | Install dependencies                                       |
| `npm run dev`              | Start local dev server at `localhost:4321/dashboard`       |
| `npm run build`            | Type-check and build production site to `./dist/`          |
| `npm run preview`          | Preview the production build locally                       |
| `npm run test:connection`  | Test connectivity to Azure Blob Storage                    |

## Deployment

The dashboard builds to static HTML under `./dist/` with a base path of `/dashboard`. To deploy:

```sh
npm run build
# Serve the dist/ directory from your web server at /dashboard
```

## Pages & API Endpoints

| Route                                         | Description                                 |
| :-------------------------------------------- | :------------------------------------------ |
| `/dashboard/`                                 | Main dashboard with latest results          |
| `/dashboard/results/{compose}/{arch}/`        | Detailed results for a compose + arch       |
| `/dashboard/api/composes.json`                | JSON list of available compose IDs          |
| `/dashboard/api/results/{compose}/index.json` | JSON results for all arches of a compose    |
| `/dashboard/api/results/{compose}/{arch}.json`| JSON results for a specific compose + arch  |

## License

This project is licensed under the [MIT License](LICENSE).
