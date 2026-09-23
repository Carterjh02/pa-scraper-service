/* ---------------------------------------------------------
   BROWARD — NODE VERSION
--------------------------------------------------------- */
export async function extractBrowardAssets(page, address) {
    await page.goto("https://web.bcpa.net/BcpaClient/#/Record-Search", {
        waitUntil: "domcontentloaded",
    });
    await page.waitForSelector("#txtField", { timeout: 15000 });
    await page.fill("#txtField", address);
    await page.click("#searchButton");
    await page.waitForTimeout(8000);
    const html = (await page.evaluate(`document.documentElement.outerHTML`));
    const screenshot = await page.screenshot({ type: "png" });
    let folioMatch = html.match(/<div id="folioNumberId">.*?>(\d{12})<\/a>/i);
    if (!folioMatch) {
        const multiResultMatch = html.match(/Record-Search-Results/i);
        if (multiResultMatch) {
            console.log("❌ Broward: Multiple results returned — no single match.");
            return {
                html,
                screenshot: new Uint8Array(screenshot),
                sketchBuffer: undefined,
                parcelPhotoBuffer: undefined,
            };
        }
    }
    let sketchBuffer;
    if (folioMatch) {
        const folio = folioMatch[1].trim();
        const sketchUrl = `https://web.bcpa.net/RecPatriotSketch.asp?Folio=${folio}&cpt=`;
        try {
            await page.goto(sketchUrl, { waitUntil: "domcontentloaded" });
            await page.waitForSelector("img, canvas", { timeout: 10000 });
            const sketchElement = await page.$("img, canvas");
            if (sketchElement) {
                const buf = await sketchElement.screenshot();
                sketchBuffer = new Uint8Array(buf);
            }
        }
        catch (err) {
            console.error("❌ Broward sketch capture failed:", err);
        }
    }
    return {
        html,
        screenshot: new Uint8Array(screenshot),
        sketchBuffer,
        parcelPhotoBuffer: undefined,
    };
}
