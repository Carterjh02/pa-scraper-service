/* ---------------------------------------------------------
   SAINT LUCIE — SIMPLE SCREENSHOT SCRAPER (NODE VERSION)
--------------------------------------------------------- */
export async function extractSaintLucieAssets(page, address) {
    await page.goto(`https://www.paslc.gov/property-search?address=${encodeURIComponent(address)}`, { waitUntil: "networkidle" });
    const screenshot = await page.screenshot({ type: "png" });
    return {
        html: undefined,
        screenshot: new Uint8Array(screenshot),
        sketchBuffer: undefined,
        parcelPhotoBuffer: undefined,
    };
}
