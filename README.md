# Flood Automation Tool

A Node.js application that automates browser interactions with a flood interface using Puppeteer. The tool automatically logs in and sets download speed limits to unlimited.

## Features

- Automated login to flood interface
- Automatic speed limit adjustment to unlimited
- Human-like clicking behavior to avoid detection
- Retry mechanisms for reliable automation
- Express server with health check endpoint
- Graceful shutdown handling

## Prerequisites

- Node.js (v14 or higher recommended)
- npm
- A modern web browser (Chrome/Chromium)

## Installation

1. Clone the repository:

```bash
git clone [your-repo-url]
cd [your-project-directory]
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with your credentials:

```env
FLOOD_LINK=https://your-flood-interface-url
FLOOD_USER=your-username
FLOOD_PWD=your-password
PORT=3000  # Optional, defaults to 3000
```

## Usage

1. Start the server:

```bash
npm start
```

2. The automation can be triggered by visiting:

```
http://localhost:3000/automate
```

3. Check server health:

```
http://localhost:3000/health
```

## Configuration

The application can be configured through environment variables:

- `FLOOD_LINK`: URL of your flood interface
- `FLOOD_USER`: Your username
- `FLOOD_PWD`: Your password
- `PORT`: Server port (default: 3000)

## Development

To run in development mode with auto-reload:

```bash
npm run dev
```

## Built With

- Express.js - Web server framework
- Puppeteer - Headless browser automation
- TypeScript - Type safety and modern JavaScript features
- dotenv - Environment variable management

## License

[Your chosen license]

## Contributing

[Your contribution guidelines]
