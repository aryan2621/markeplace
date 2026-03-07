# Market Place

A multi-service marketplace platform with APK extraction and client applications.

## Services

- **apk-extraction-service**: Node.js service for extracting APK metadata
- **app-market-place**: Next.js client application 
- **app-market-place-admin**: Admin dashboard
- **app-market-place-master**: Master client application

## Quick Start

### APK Extraction Service
```bash
cd apk-extraction-service
npm install
npm run dev
```

### Client Applications
```bash
cd app-market-place/client
npm install
npm run dev
```

Repeat for admin and master clients as needed.

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: Next.js, React, Tailwind CSS
- **Database**: Firebase
- **APK Processing**: adbkit-apkreader, adm-zip

## Development

Each service has its own package.json with detailed scripts. See individual service directories for specific setup instructions.
