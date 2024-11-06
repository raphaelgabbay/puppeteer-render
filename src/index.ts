import express from "express";
import * as puppeteer from "puppeteer";
import { config } from "./config";
import dotenv from "dotenv";
import { humanLikeClick, retryWithSelector } from "./utils";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

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
  return await puppeteer.launch({
    headless: false,
  });
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

// Main automation handler
app.get("/automate", (async (req: express.Request, res: express.Response) => {
  console.log("Automation requested via GET");
  const url = process.env.FLOOD_LINK;

  if (!url || !isValidUrl(url)) {
    console.error("Invalid URL:", url);
    return res.status(400).json({ error: "Invalid URL configuration" });
  }

  const browser = await setupBrowser();

  try {
    const page = await browser.newPage();
    await performLogin(page, url);

    while (true) {
      await clickSpeedLimits(page);
      await clickUnlimitedOption(page);
      await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 seconds timeout
    }

    res.json({
      success: true,
      message: "Automation completed successfully",
    });
  } catch (error) {
    console.error("Automation error:", error);
    res.status(500).json({ error: "Automation failed" });
  } finally {
    //await browser.close();
  }
}) as express.RequestHandler);

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
