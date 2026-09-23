import type { Page } from "playwright";

/* ---------------------------------------------------------
   SAINT LUCIE — SIMPLE SCREENSHOT SCRAPER (NODE VERSION)
--------------------------------------------------------- */

export async function extractSaintLucieAssets(
  page: Page,
  address: string
) {
  await page.goto(
    `https://www.paslc.gov/property-search?address=${encodeURIComponent(address)}`,
    { waitUntil: "networkidle" }
  );

  const screenshot = await page.screenshot({ type: "png" });

  return {
    html: undefined,
    screenshot: new Uint8Array(screenshot as Buffer),
    sketchBuffer: undefined,
    parcelPhotoBuffer: undefined,
  };
}
