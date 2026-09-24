import type { Page } from "playwright";

/* ---------------------------------------------------------
   BROWARD — CLASSIC SITE VERSION (MATCHES OLD SCRAPER)
--------------------------------------------------------- */

export async function extractBrowardAssets(page: Page, address: string) {
  // Load Broward SPA search page
  await page.goto("https://web.bcpa.net/BcpaClient/#/Record-Search", {
    waitUntil: "domcontentloaded",
  });
  
  // Wait for search field
  await page.waitForSelector("#txtField", { timeout: 15000 });
  
  // Fill address
  await page.fill("#txtField", address);
  
  // Click search
  await page.click("#searchButton");
  
  // Wait for SPA to update
  await page.waitForTimeout(5000);
  
  // Capture HTML + screenshot
  const html = await page.content();
  // const screenshot = await page.screenshot({ type: "png" });

  /* ---------------------------------------------------------
     1. VALIDATE PAGE TYPE
  --------------------------------------------------------- */

  if (html.includes("No records found")) {
    console.log("❌ Broward: No records found.");
    return {
      html,
      // screenshot: new Uint8Array(screenshot),
      // sketchBuffer: undefined,
      // parcelPhotoBuffer: undefined,
    };
  }

  if (html.includes("Record-Search-Results")) {
    console.log("❌ Broward: Multiple results returned.");
    return {
      html,
      // screenshot: new Uint8Array(screenshot),
      // sketchBuffer: undefined,
      // parcelPhotoBuffer: undefined,
    };
  }

  /* ---------------------------------------------------------
     2. FOLIO EXTRACTION (classic site)
  --------------------------------------------------------- */

  const folioMatch =
    html.match(/<div id="folioNumberId">.*?>(\d{12})<\/a>/i) ||
    html.match(/Folio:\s*(\d{12})/i);

  if (!folioMatch) {
    console.log("❌ Broward: Folio not found.");
    return {
      html,
      // screenshot: new Uint8Array(screenshot),
      // sketchBuffer: undefined,
      // parcelPhotoBuffer: undefined,
    };
  }

  const folio = folioMatch[1].trim();

  /* ---------------------------------------------------------
     3. SKETCH EXTRACTION (classic site)
  --------------------------------------------------------- */

  const sketchUrl = `https://web.bcpa.net/RecPatriotSketch.asp?Folio=${folio}&cpt=`;

  let sketchBuffer: Uint8Array | undefined;

  try {
    await page.goto(sketchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("img, canvas", { timeout: 10000 });

    /* const sketchElement = await page.$("img, canvas");
    if (sketchElement) {
      const buf = await sketchElement.screenshot();
      sketchBuffer = new Uint8Array(buf);
    } */
  } catch (err) {
    console.error("❌ Broward sketch capture failed:", err);
  }

  /* ---------------------------------------------------------
     4. RETURN FINAL ASSET PACKAGE
  --------------------------------------------------------- */

  return {
    html,
    // screenshot: new Uint8Array(screenshot),
    // sketchBuffer,
    // parcelPhotoBuffer: undefined,
  };
}
