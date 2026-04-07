# Fedora Cloud Image Test Results Dashboard

Web dashboard displaying automated test results for Fedora Cloud images running on Azure.

## Features

- **Latest Results** — Donut charts showing pass percentages for Rawhide, latest Fedora versions (44, 43), and ELN on both x86_64 and aarch64
- **Weekly/Monthly Trends** — Clickable charts with expandable details
- **Server-Side Proxy** — Fetches data through our server (avoids browser security restrictions)

## Quick Start

```sh
npm install
npm run dev      # localhost:4321/dashboard
npm run build    # Production build to ./dist/
```

## Data Source

Azure Blob Storage: `fedoratestresults.z5.web.core.windows.net`

## API Endpoints

| Route                       | Description                    |
| :-------------------------- | :----------------------------- |
| `/dashboard/`               | Main dashboard                 |
| `/dashboard/api/results.json` | All test results (pre-parsed) |
| `/dashboard/api/composes.json` | Available composes list      |

## License

[MIT](LICENSE)
