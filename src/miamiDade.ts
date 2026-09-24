import type { Page } from "playwright";

/* ---------------------------------------------------------
   MIAMI-DADE — SPA SCRAPER (NODE VERSION)
--------------------------------------------------------- */

export async function extractMiamiDadeAssets(
  page: Page,
  address: string
) {
  console.log("🟦 [MD] Navigating to Miami-Dade search page…");

  await page.goto("https://apps.miamidadepa.gov/PropertySearch/#/", {
    waitUntil: "domcontentloaded",
  });

  await page.waitForSelector("input.k-input-inner", { timeout: 20000 });

  console.log("🟦 [MD] Search input found, filling address:", address);
  await page.fill("input.k-input-inner", address);

  await page.click("span.k-button-icon.k-i-search");
  console.log("🟦 [MD] Search submitted… waiting for results");

  await page.waitForFunction(
    `Array.from(document.querySelectorAll('a')).some(a => /\\d{2}-\\d{4}-\\d{3}-\\d{4}/.test(a.innerText))`,
    { timeout: 45000 }
  );
  
  console.log("🟩 [MD] Folio link detected");
  
  const folioLink = await page.$("a:has-text('-')");
  if (!folioLink) throw new Error("Miami-Dade: No folio link found");
  
  await folioLink.click();
  console.log("🟦 [MD] Navigating to details page…");
  
  // Miami-Dade SPA hydration
  await page.waitForNavigation({ waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(3000);
  
  // Extract HTML
  const html = await page.evaluate(() => document.documentElement.outerHTML);
  const screenshot = await page.screenshot({ fullPage: true });
  
  // Validate details page
  if (!html || html.length < 50000) {
    console.log("❌ [MD] Details page HTML too small — page not fully loaded.");
    throw new Error("Miami-Dade: Details page incomplete");
  }
  
  console.log("🟦 [MD] Details page loaded, HTML size:", html.length);
  
  // Extract folio
  const folioMatch =
    html.match(/\b(\d{2}-\d{4}-\d{3}-\d{4})\b/) ??
    html.match(/Folio:\s*(\d{12})/i);
  
  const folio = folioMatch ? folioMatch[1] : null;
  
  if (!folio) {
    console.log("❌ [MD] Folio not found on details page.");
    throw new Error("Miami-Dade: Folio missing on details page");
  }  

  let sketchBuffer: Uint8Array | undefined;

  if (folio) {
    const numericFolio = folio.replace(/-/g, "");
    const sketchUrl = `https://apps.miamidadepa.gov/PAOnlineTools/PropertySketch/Sketch.aspx?Folio=${numericFolio}&year=2026`;

    console.log("🟦 [MD] Navigating to sketch URL:", sketchUrl);

    try {
      await page.goto(sketchUrl, { waitUntil: "networkidle" });

      // Find the traverse.dll image element
      const traverseImg = await page.$("#ctl00_ContentPlaceHolder1_imgTraverse");
      
      if (traverseImg) {
        const src = await traverseImg.getAttribute("src");
      
        if (src) {
          // Build full URL
          const fullUrl = `https://apps.miamidadepa.gov${src}`;
      
          try {
            console.log("🟦 [MD] Downloading sketch directly:", fullUrl);
      
            const response = await page.request.get(fullUrl);
      
            if (response.ok()) {
              const buf = await response.body();
              sketchBuffer = new Uint8Array(buf);
              console.log("🟩 [MD] Sketch image downloaded directly.");
            } else {
              console.log("⚠️ [MD] Sketch request failed:", response.status());
            }
          } catch (err) {
            console.error("❌ [MD] Sketch direct download failed:", err);
          }
        } else {
          console.log("⚠️ [MD] traverse image src not found.");
        }
      } else {
        console.log("⚠️ [MD] traverse image element not found.");
      }
    } catch (err) {
      console.error("❌ [MD] Sketch capture failed:", err);
    }
  }

  return {
    html,
    // screenshot: new Uint8Array(screenshot as Buffer),
    // sketchBuffer,
    // parcelPhotoBuffer: undefined,
  };
}
