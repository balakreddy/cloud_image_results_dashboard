# Fedora Cloud Image Test Results Dashboard

Web dashboard displaying automated test results for Fedora Cloud images running on Azure.

## Features

- **Latest Results** — Donut charts showing pass rates for Rawhide, latest Fedora versions (44, 43), and ELN on both x86_64 and aarch64
- **Weekly/Monthly Trends** — Clickable charts with expandable details
- **Live Data** — Fetches directly from Azure blob storage (composes.json + junit.xml files)

## Quick Start

```sh
npm install
npm run dev      # localhost:4321/dashboard
npm run build    # Production build to ./dist/
```

## Data Source

Azure Blob Storage: `fedoratestresults.z5.web.core.windows.net`

- `composes.json` — Index of all available test results
- `{distro}/{version}/{date}/{arch}/junit.xml` — Individual test results

## License

[MIT](LICENSE)
