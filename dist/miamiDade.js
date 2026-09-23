/* ---------------------------------------------------------
   MIAMI-DADE — SPA SCRAPER (NODE VERSION)
--------------------------------------------------------- */
export async function extractMiamiDadeAssets(page, address) {
    console.log("🟦 [MD] Navigating to Miami-Dade search page…");
    await page.goto("https://apps.miamidadepa.gov/PropertySearch/#/", {
        waitUntil: "domcontentloaded",
    });
    await page.waitForSelector("input.k-input-inner", { timeout: 20000 });
    console.log("🟦 [MD] Search input found, filling address:", address);
    await page.fill("input.k-input-inner", address);
    await page.click("span.k-button-icon.k-i-search");
    console.log("🟦 [MD] Search submitted… waiting for results");
    await page.waitForFunction(`Array.from(document.querySelectorAll('a')).some(a => /\\d{2}-\\d{4}-\\d{3}-\\d{4}/.test(a.innerText))`, { timeout: 45000 });
    console.log("🟩 [MD] Folio link detected");
    const folioLink = await page.$("a:has-text('-')");
    if (!folioLink)
        throw new Error("Miami-Dade: No folio link found");
    await folioLink.click();
    console.log("🟦 [MD] Navigating to details page…");
    await page.waitForTimeout(8000);
    const html = (await page.evaluate(() => document.documentElement.outerHTML));
    const screenshot = await page.screenshot({ fullPage: true });
    console.log("🟦 [MD] Details page loaded, HTML size:", html.length);
    const folioMatch = html.match(/\b(\d{2}-\d{4}-\d{3}-\d{4})\b/);
    const folio = folioMatch ? folioMatch[1] : null;
    let sketchBuffer;
    if (folio) {
        const numericFolio = folio.replace(/-/g, "");
        const sketchUrl = `https://apps.miamidadepa.gov/PAOnlineTools/PropertySketch/Sketch.aspx?Folio=${numericFolio}&year=2026`;
        console.log("🟦 [MD] Navigating to sketch URL:", sketchUrl);
        try {
            await page.goto(sketchUrl, { waitUntil: "networkidle" });
            await page.waitForSelector("img, canvas", { timeout: 15000 });
            const sketchEl = await page.$("img, canvas");
            if (sketchEl) {
                const buf = await sketchEl.screenshot();
                sketchBuffer = new Uint8Array(buf);
                console.log("🟩 [MD] Sketch captured");
            }
        }
        catch (err) {
            console.error("❌ [MD] Sketch capture failed:", err);
        }
    }
    return {
        html,
        screenshot: new Uint8Array(screenshot),
        sketchBuffer,
        parcelPhotoBuffer: undefined,
    };
}
