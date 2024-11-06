import * as puppeteer from "puppeteer";

export async function humanLikeClick(page: puppeteer.Page, selector: string) {
  const element = await page.$(selector);
  if (!element) throw new Error(`Element ${selector} not found`);

  const box = await element.boundingBox();
  if (!box) throw new Error(`Cannot get boundingBox for ${selector}`);

  // Move to element with slight randomization
  await page.mouse.move(
    box.x + box.width / 2 + Math.random() * 10 - 5,
    box.y + box.height / 2 + Math.random() * 10 - 5
  );
  await page.mouse.down();
  await page.evaluate(() => new Promise((r) => setTimeout(r, 20))); // Hold for 20ms
  await page.mouse.up();
}

export async function retryWithSelector(
  page: puppeteer.Page,
  selector: string,
  options: {
    maxAttempts?: number;
    delayMs?: number;
    clickAfterFound?: boolean;
    waitForSelector?: string;
    shouldDisappear?: boolean;
  } = {}
): Promise<boolean> {
  const {
    maxAttempts = 3,
    delayMs = 500,
    clickAfterFound = true,
    waitForSelector,
    shouldDisappear = false,
  } = options;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      await page.waitForSelector(selector, { timeout: 1000 });
      if (clickAfterFound) {
        await humanLikeClick(page, selector);
        console.log(`Found and clicked ${selector}`);

        if (shouldDisappear) {
          try {
            // Wait for the element to disappear
            await page.waitForSelector(selector, {
              timeout: 1000,
              hidden: true, // This makes it wait for the element to disappear
            });
            return true;
          } catch {
            attempts++;
            console.log(`Element ${selector} did not disappear, retrying...`);
            continue;
          }
        }

        if (waitForSelector) {
          try {
            await page.waitForSelector(waitForSelector, { timeout: 1000 });
            return true;
          } catch {
            attempts++;
            console.log(
              `Target selector ${waitForSelector} not found, retrying...`
            );
            continue;
          }
        }
      } else {
        console.log(`Found ${selector} but did not click`);
      }
      return true;
    } catch {
      attempts++;
      if (attempts < maxAttempts) {
        await page.evaluate(
          (ms) => new Promise((r) => setTimeout(r, ms)),
          delayMs
        );
      }
    }
  }

  throw new Error(
    `Could not find ${selector} or complete the requested operation`
  );
}
