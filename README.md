# Windy Plugin VG 2024

Windy Plugin for Vendee Globe 2024 Tracking

## Getting Started

Install dependencies:

```bash
npm install
```

If you need to sync data from FTP, create `.env` file and set credentials:

```bash
cp .env.example .env
```

## Sync Data

Get last reports from FTP server:

```bash
npm run sync:ftp
```

Sync main data file:

```bash
npm run sync:data
```

## Test Plugin

Run plugin locally:

```bash
npm run start
```

Visit: https://www.windy.com/developer-mode

Now you can click on `Install & open Plugin`

![screenshot](./src/screenshot.jpg 'Screenshot')

## To do

-   Add exclusion zones
-   Add waves data
-   Mobile UI
