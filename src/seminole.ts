import type { Page } from "playwright";

/* ---------------------------------------------------------
   SEMINOLE COUNTY — FINAL STABLE SCRAPER (MATCHES TEST SCRIPT)
--------------------------------------------------------- */

export async function extractSeminoleAssets(page: Page, address: string) {
  /* ---------------------------------------------------------
     1. NAVIGATE TO PARCEL SEARCH PAGE
  --------------------------------------------------------- */
  await page.goto("https://scpafl.org/search/parcels", {
    waitUntil: "domcontentloaded",
  });

  // Hydration delay
  await page.waitForTimeout(1500);

  /* ---------------------------------------------------------
     2. CLICK ADDRESS TAB (REAL DOM CLICK REQUIRED)
  --------------------------------------------------------- */
  const addressTabSelector = 'a.nav-link[href$="_Address"]';

  await page.waitForSelector(addressTabSelector, { timeout: 20000 });

  await page.evaluate((selector) => {
    const el = document.querySelector(selector);
    if (el) (el as HTMLElement).click();
  }, addressTabSelector);

  // Allow Bootstrap animation
  await page.waitForTimeout(1500);

  // Wait for tab activation
  await page.waitForFunction(
    (selector) => {
      const el = document.querySelector(selector);
      return el && el.classList.contains("active");
    },
    addressTabSelector,
    { timeout: 20000 }
  );

  // Allow UserWay overlays to hydrate
  await page.waitForTimeout(2000);

  // Wait for tab content
  await page.waitForSelector("div.tab-pane.show.active", { timeout: 20000 });

  // Scroll into view (UserWay requires this)
  await page.evaluate(() => {
    const el = document.querySelector("div.tab-pane.show.active");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  // Allow inputs to become visible
  await page.waitForTimeout(2000);

  /* ---------------------------------------------------------
     3. PARSE ADDRESS INTO COMPONENTS
        Seminole requires:
        - Street Number
        - Street Name
        - Street Type
  --------------------------------------------------------- */
  const parts = address.split(" ");
  const streetNumber = parts[0];
  const streetType = parts[parts.length - 1];
  const streetName = parts.slice(1, -1).join(" ");

  /* ---------------------------------------------------------
     4. FILL ADDRESS FIELDS
  --------------------------------------------------------- */
  await page.waitForSelector("#StreetAddress", { timeout: 20000, state: "visible" });
  await page.waitForSelector("#StreetName", { timeout: 20000, state: "visible" });
  await page.waitForSelector("#StreetType", { timeout: 20000, state: "visible" });

  await page.fill("#StreetAddress", streetNumber);
  await page.waitForTimeout(500);

  await page.fill("#StreetName", streetName);
  await page.waitForTimeout(500);

  await page.fill("#StreetType", streetType);
  await page.waitForTimeout(500);

  /* ---------------------------------------------------------
     5. CLICK SEARCH
  --------------------------------------------------------- */
  await page.waitForSelector("button.btn.btn-success", { timeout: 20000 });
  await page.waitForTimeout(1000);
  await page.click("button.btn.btn-success");

  // Allow Kendo grid to initialize
  await page.waitForTimeout(2500);

  /* ---------------------------------------------------------
     6. WAIT FOR MATCHING ROW
  --------------------------------------------------------- */
  const targetRowText = `${streetNumber} ${streetName.toUpperCase()} ${streetType.toUpperCase()}`;

  await page.waitForFunction(
    (text) =>
      Array.from(document.querySelectorAll("td"))
        .some(td => td.innerText.includes(text)),
    targetRowText,
    { timeout: 30000 }
  );

  const row = await page.$(`td:has-text("${targetRowText}")`);
  if (!row) {
    console.log("❌ Seminole: Could not click matching row");
    const html = await page.evaluate(() => document.documentElement.outerHTML);
    const screenshot = await page.screenshot({ type: "png" });

    return {
      html,
      screenshot: new Uint8Array(screenshot),
      sketchBuffer: undefined,
      parcelPhotoBuffer: undefined,
    };
  }

  await page.waitForTimeout(1500);
  await row.click();

  /* ---------------------------------------------------------
     7. WAIT FOR DETAILS PAGE
  --------------------------------------------------------- */
  await page.waitForTimeout(5000);

  const html = await page.evaluate(() => document.documentElement.outerHTML);
  const screenshot = await page.screenshot({ type: "png" });

  /* ---------------------------------------------------------
     8. EXTRACT PARCEL ID
  --------------------------------------------------------- */
  let parcelMatch =
    html.match(/Parcel Number:\s*([\d\-]+)/i) ||
    html.match(/Parcel\s*#:\s*([\d\-]+)/i);

  if (!parcelMatch) {
    console.log("❌ Seminole: Could not extract parcel ID.");
    return {
      html,
      screenshot: new Uint8Array(screenshot),
      sketchBuffer: undefined,
      parcelPhotoBuffer: undefined,
    };
  }

  const parcelId = parcelMatch[1].trim();

  /* ---------------------------------------------------------
     9. BUILD SKETCH URL
  --------------------------------------------------------- */
  const numericParcel = parcelId.replace(/\D+/g, "");
  const sketchUrl = `https://files.scpafl.org/footprintimage/${numericParcel}01.jpg`;

  let sketchBuffer: Uint8Array | undefined;

  try {
    await page.goto(sketchUrl, { waitUntil: "domcontentloaded" });

    const sketchHtml = await page.content();
    if (sketchHtml.includes("<img")) {
      const sketchElement = await page.$("img");
      if (sketchElement) {
        const buf = await sketchElement.screenshot();
        sketchBuffer = new Uint8Array(buf);
      }
    } else {
      console.log("❌ Seminole: Sketch page did not load correctly.");
    }
  } catch (err) {
    console.error("❌ Seminole sketch capture failed:", err);
  }

  /* ---------------------------------------------------------
     10. RETURN FINAL ASSET PACKAGE
  --------------------------------------------------------- */
  return {
    html,
    screenshot: new Uint8Array(screenshot),
    sketchBuffer,
    parcelPhotoBuffer: undefined,
  };
}
