import type { Page } from "playwright";

/* ---------------------------------------------------------
   PALM BEACH — CLASSIC LOGIC (MATCHES OLD NEXT.JS SCRAPER)
--------------------------------------------------------- */

function normalizePalmBeachAddress(address: string) {
  return address
    .toUpperCase()
    .replace(/\bDRIVE\b/g, "DR")
    .replace(/\bSTREET\b/g, "ST")
    .replace(/\bROAD\b/g, "RD")
    .replace(/\bAVENUE\b/g, "AVE")
    .replace(/\bBOULEVARD\b/g, "BLVD")
    .replace(/\bCOURT\b/g, "CT")
    .replace(/\bLANE\b/g, "LN")
    .replace(/\bTERRACE\b/g, "TER")
    .replace(/\bPLACE\b/g, "PL")
    .replace(/\bCIRCLE\b/g, "CIR")
    .trim();
}

export async function extractPalmBeachAssets(page: Page, address: string) {
  const normalized = normalizePalmBeachAddress(address);

  /* ---------------------------------------------------------
     1. LOAD SEARCH PAGE
  --------------------------------------------------------- */
  await page.goto("https://pbcpao.gov/index.htm", {
    waitUntil: "networkidle",
  });

  await page.waitForSelector("#realsrchVal", { timeout: 15000 });
  await page.fill("#realsrchVal", normalized);

  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle" }),
    page.keyboard.press("Enter"),
  ]);

  /* ---------------------------------------------------------
     2. TABLE OR DIRECT DETAILS?
  --------------------------------------------------------- */
  const tableExists = await page.$("#searchGrid");

  let parcelId: string | null = null;

  if (!tableExists) {
    // Direct details page
    const detailsExists = await page.$("#MainContent_lblLocation");

    if (detailsExists) {
      const html = await page.content();
      const screenshot = await page.screenshot({ fullPage: true });

      // Sketch extraction from inline <img>
      let sketchBuffer: Uint8Array | undefined;
      const sketchElement = await page.$('img[src*="GetBuildingSketch"]');
      if (sketchElement) {
        const buf = await sketchElement.screenshot();
        sketchBuffer = new Uint8Array(buf);
      }

      return {
        html,
        screenshot: new Uint8Array(screenshot),
        sketchBuffer,
        parcelPhotoBuffer: undefined,
      };
    }

    throw new Error("Palm Beach: searchGrid table not found");
  }

  /* ---------------------------------------------------------
  3. TABLE EXISTS → EXACT ADDRESS MATCH WITH PAGINATION
--------------------------------------------------------- */
await page.waitForFunction(
  () => {
    const table = document.querySelector("#searchGrid");
    return table && table.querySelectorAll("tbody tr").length > 0;
  },
  { timeout: 30000 }
);

async function findParcelAcrossPages(): Promise<string | null> {
  let pageIndex = 1;

  while (true) {
    console.log(`🟦 [PB] Checking page ${pageIndex}…`);

    const rows = await page.$$("#searchGrid tbody tr");
    console.log(`🟦 [PB] Row count: ${rows.length}`);

    for (const row of rows) {
      const locationCell = await row.$("td:nth-child(3)");
      const locationText =
        (await locationCell?.innerText())?.trim().toUpperCase() ?? "";

      console.log("🟦 [PB] Row address:", locationText);

      const normalizedPrefix = normalized.split(" ").slice(0, 2).join(" ");

      if (locationText.includes(normalizedPrefix)) {
        console.log("🟩 [PB] MATCH FOUND:", locationText);
      
        const parcelCell = await row.$("td:nth-child(5)");
        const parcelText = (await parcelCell?.innerText())?.trim() ?? null;
      
        console.log("🟩 [PB] Extracted parcelId:", parcelText);
        return parcelText;
      }
    }

    // next‑page handling
    const nextButton = await page.$("a.paginate_button.next:not(.disabled)");
    if (!nextButton) {
      console.log("❌ [PB] No more pages.");
      return null;
    }

    console.log("🟦 [PB] Next page clicked…");
    await nextButton.click();
    await page.waitForTimeout(1500);

    pageIndex++;
  }
}

parcelId = await findParcelAcrossPages();

if (!parcelId) {
  console.log("❌ [PB] No matching address found after pagination.");
  throw new Error("Palm Beach: No matching address found after pagination");
}

/* ---------------------------------------------------------
   4. LOAD DETAILS PAGE
--------------------------------------------------------- */
const detailsUrl = `https://pbcpao.gov/Property/Details?parcelId=${parcelId}`;
console.log("🟦 [PB] Navigating to details page:", detailsUrl);

await page.goto(detailsUrl, { waitUntil: "networkidle" });

console.log("🟦 [PB] After navigation URL:", page.url());

const html = await page.content();
const screenshot = await page.screenshot({ fullPage: true });

console.log("🟦 [PB] Details HTML preview:", html.slice(0, 500));

await page.waitForSelector("#MainContent_lblLocation", { timeout: 30000 });

console.log("🟩 [PB] Details page loaded successfully.");

  /* ---------------------------------------------------------
     5. SKETCH EXTRACTION (inline <img>)
  --------------------------------------------------------- */
  let sketchBuffer: Uint8Array | undefined;

  const sketchElement = await page.$('img[src*="GetBuildingSketch"]');
  if (sketchElement) {
    const buf = await sketchElement.screenshot();
    sketchBuffer = new Uint8Array(buf);
  }

  return {
    html,
    screenshot: new Uint8Array(screenshot),
    sketchBuffer,
    parcelPhotoBuffer: undefined,
  };
}
