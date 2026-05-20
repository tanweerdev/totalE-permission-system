# totalE Frontend — Setup Guide

## Prerequisites

- Node.js 18+
- totalE backend running (see `../SETUP.md`)

## Installation

```bash
cd totale-client
npm install
```

## Environment

Create a `.env` file in this directory:

```env
VITE_API_URL=http://localhost:3000
```

If omitted, defaults to `http://localhost:3000`.

## Running

```bash
# Development
npm run dev
# App runs at http://localhost:5173

# Production build
npm run build
npm run preview