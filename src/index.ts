import express from "express";
import * as puppeteer from "puppeteer";
import { config } from "./config";
import dotenv from "dotenv";
import { retryWithSelector } from "./utils";
// Add this near the top with other imports
let isAutomationRunning = false;
let automationStartTime: Date | null = null;

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static("public"));
// Add error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Error occurred:", err);
    res.status(500).json({ error: err.message });
  }
);

// Validate URL
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Basic health check endpoint
app.get("/health", (req, res) => {
  console.log("Health check requested");
  res.json({ status: "ok" });
});

// Helper Functions
async function setupBrowser() {
  console.log("Chrome executable path:", process.env.PUPPETEER_EXECUTABLE_PATH);
  try {
    return await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-dev-tools",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ],
      executablePath:
        process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/google-chrome",
    });
  } catch (error) {
    console.error("Failed to launch browser:", error);
    throw error;
  }
}

async function performLogin(page: puppeteer.Page, url: string) {
  await page.goto(url);
  await page.waitForSelector('input[type="text"]');
  await page.waitForSelector('input[type="password"]');

  console.log("Filling login form...");
  await page.type('input[type="text"]', process.env.FLOOD_USER || "");
  await page.type('input[type="password"]', process.env.FLOOD_PWD || "");

  console.log("Submitting login form...");
  await Promise.all([
    await page.focus("button"),
    await page.keyboard.press("Enter"),
  ]);
}

async function clickSpeedLimits(page: puppeteer.Page) {
  console.log("Looking for speed limits button...");
  await retryWithSelector(page, "svg.icon--limits", {
    maxAttempts: 10,
    delayMs: 1000,
    waitForSelector: ".dropdown__list",
  });
}

async function clickUnlimitedOption(page: puppeteer.Page) {
  console.log("Clicking Unlimited option...");

  await page.evaluate(() => {
    const elements = document.querySelectorAll(
      "li.dropdown__item.menu__item.is-selectable"
    );
    for (const element of elements) {
      if (element.textContent?.trim() === "Unlimited") {
        (element as HTMLElement).click();
        return;
      }
    }
    throw new Error("Could not find Unlimited option");
  });

  console.log("Clicked Unlimited option");
}

// Add a new status endpoint
app.get("/status", (req, res) => {
  if (isAutomationRunning) {
    const uptime = automationStartTime
      ? Math.floor(
          (new Date().getTime() - automationStartTime.getTime()) / 1000
        )
      : 0;
    res.json({
      status: "running",
      uptime: `${uptime} seconds`,
      startedAt: automationStartTime?.toISOString(),
    });
  } else {
    res.json({ status: "stopped" });
  }
});

// Main automation handler
app.get("/automate", (async (req: express.Request, res: express.Response) => {
  console.log("Automation requested via GET");

  if (isAutomationRunning) {
    return res.json({
      message: "Automation is already running",
      status: "running",
    });
  }

  const url = process.env.FLOOD_LINK;
  if (!url || !isValidUrl(url)) {
    console.error("Invalid URL:", url);
    return res.status(400).json({ error: "Invalid URL configuration" });
  }

  // Start automation in background
  runAutomation(url).catch((error) => {
    console.error("Automation error:", error);
    isAutomationRunning = false;
    automationStartTime = null;
  });

  // Immediately return response
  res.json({
    success: true,
    message: "Automation started successfully",
    status: "running",
  });
}) as express.RequestHandler);

// Add the background automation function
async function runAutomation(url: string) {
  if (isAutomationRunning) return;

  isAutomationRunning = true;
  automationStartTime = new Date();
  const browser = await setupBrowser();

  try {
    const page = await browser.newPage();
    await performLogin(page, url);

    while (isAutomationRunning) {
      await clickSpeedLimits(page);
      await clickUnlimitedOption(page);
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  } catch (error) {
    console.error("Automation error:", error);
    throw error;
  } finally {
    isAutomationRunning = false;
    automationStartTime = null;
    await browser.close();
  }
}
// Add a stop endpoint
app.get("/stop", (async (req: express.Request, res: express.Response) => {
  if (!isAutomationRunning) {
    return res.json({ message: "Automation is not running" });
  }

  isAutomationRunning = false;
  res.json({ message: "Stopping automation..." });
}) as express.RequestHandler);

// Add this near the top with other middleware
app.use(express.static("public"));

// Start the server
const server = app.listen(config.port, () => {
  console.log(`Server started successfully on port ${config.port}`);
  console.log(
    `Visit http://localhost:${config.port}/automate to run the automation`
  );
});

// Handle process termination
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close();
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close();
});
