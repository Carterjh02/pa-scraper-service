import type { Page } from "playwright";

/* ---------------------------------------------------------
   BROWARD — CLASSIC SITE VERSION (MATCHES OLD SCRAPER)
--------------------------------------------------------- */

export async function extractBrowardAssets(page: Page, address: string) {
  await page.goto("https://web.bcpa.net/BcpaClient/#/Record-Search", {
    waitUntil: "domcontentloaded",
  });

  await page.waitForSelector("#txtField", { timeout: 15000 });
  await page.fill("#txtField", address);
  await page.click("#searchButton");

  await page.waitForTimeout(5000);

  const html = await page.content();

  /* ---------------------------------------------------------
     1. VALIDATE PAGE TYPE
  --------------------------------------------------------- */
  if (html.includes("No records found")) {
    console.log("❌ Broward: No records found.");
    return { html };
  }

  if (html.includes("Record-Search-Results")) {
    console.log("❌ Broward: Multiple results returned.");
    return { html };
  }

  /* ---------------------------------------------------------
     2. FOLIO EXTRACTION
  --------------------------------------------------------- */
  const folioMatch =
    html.match(/<div id="folioNumberId">.*?>(\d{12})<\/a>/i) ||
    html.match(/Folio:\s*(\d{12})/i);

  if (!folioMatch) {
    console.log("❌ Broward: Folio not found.");
    return { html };
  }

  const folio = folioMatch[1].trim();

  /* ---------------------------------------------------------
     3. SKETCH PAGE LOAD (NO IMAGE CAPTURE)
  --------------------------------------------------------- */
  const sketchUrl = `https://web.bcpa.net/RecPatriotSketch.asp?Folio=${folio}&cpt=`;

  try {
    await page.goto(sketchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("img, canvas", { timeout: 10000 });
  } catch (err) {
    console.error("❌ Broward sketch load failed:", err);
  }

  /* ---------------------------------------------------------
     4. RETURN ONLY HTML
  --------------------------------------------------------- */
  return { html };
}
