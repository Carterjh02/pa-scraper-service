/* ---------------------------------------------------------
   PALM BEACH — NODE VERSION
--------------------------------------------------------- */
function normalizePalmBeachAddress(address) {
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
export async function extractPalmBeachAssets(page, address) {
    const normalized = normalizePalmBeachAddress(address);
    console.log("🟦 [PB] Normalized address:", normalized);
    const searchUrl = "https://pbcpao.gov/index.htm";
    console.log("🟦 [PB] Navigating to entry page…", searchUrl);
    await page.goto(searchUrl, { waitUntil: "networkidle" });
    const initialHtml = await page.content();
    console.log("🟦 [PB] After goto URL:", page.url());
    console.log("🟦 [PB] Initial HTML size:", initialHtml.length);
    console.log("🟦 [PB] Initial HTML preview:", initialHtml.slice(0, 300));
    console.log("🟦 [PB] Waiting for #realsrchVal (presence only)...");
    const foundSearchInput = await page
        .waitForFunction(`!!document.querySelector('#realsrchVal')`, {
        timeout: 30000,
    })
        .catch(async (err) => {
        const failHtml = await page.content();
        console.log("❌ [PB] URL at failure:", page.url());
        console.log("❌ [PB] HTML size at failure:", failHtml.length);
        console.log("❌ [PB] HTML preview at failure:", failHtml.slice(0, 300));
        console.log("❌ [PB] Failed waiting for #realsrchVal");
        throw err;
    });
    if (!foundSearchInput) {
        const failHtml = await page.content();
        console.log("❌ [PB] #realsrchVal not found, URL:", page.url());
        console.log("❌ [PB] HTML size:", failHtml.length);
        console.log("❌ [PB] HTML preview:", failHtml.slice(0, 300));
        throw new Error("Palm Beach: #realsrchVal not found");
    }
    console.log("🟩 [PB] #realsrchVal found, filling search value…");
    await page.fill("#realsrchVal", normalized);
    console.log("🟦 [PB] Submitting search via Enter…");
    await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle" }),
        page.keyboard.press("Enter"),
    ]);
    console.log("🟦 [PB] After search URL:", page.url());
    const postSearchHtml = await page.content();
    console.log("🟦 [PB] Post-search HTML size:", postSearchHtml.length);
    console.log("🟦 [PB] Post-search HTML preview:", postSearchHtml.slice(0, 300));
    const tableExists = await page.$("#searchGrid");
    let parcelId = null;
    if (!tableExists) {
        console.log("🟦 [PB] #searchGrid not found, checking details page…");
        const detailsExists = await page.$("#MainContent_lblLocation");
        if (detailsExists) {
            console.log("🟩 [PB] Already on details page.");
            const html = (await page.evaluate(`document.documentElement.outerHTML`));
            const screenshot = await page.screenshot({ fullPage: true });
            let sketchBuffer;
            try {
                const sketchElement = await page.$('img[src*="GetBuildingSketch"]');
                if (sketchElement) {
                    const buf = await sketchElement.screenshot();
                    sketchBuffer = new Uint8Array(buf);
                    console.log("🟩 [PB] Sketch image captured (direct details page).");
                }
                else {
                    console.log("⚠️ [PB] Sketch element not found (direct details page).");
                }
            }
            catch (err) {
                console.error("❌ [PB] Sketch capture failed (direct page):", err);
            }
            return {
                html,
                screenshot: new Uint8Array(screenshot),
                sketchBuffer,
                parcelPhotoBuffer: undefined,
            };
        }
        console.log("❌ [PB] Neither #searchGrid nor details page found.");
        throw new Error("Palm Beach: searchGrid table not found");
    }
    console.log("🟩 [PB] #searchGrid found, waiting for rows…");
    await page.waitForFunction(`(() => {
      const table = document.querySelector('#searchGrid');
      if (!table) return false;
      const rows = table.querySelectorAll('tbody tr');
      return rows && rows.length > 0;
    })()`, { timeout: 45000 });
    const rows = await page.$$("#searchGrid tbody tr");
    console.log("🟦 [PB] Row count:", rows.length);
    for (const row of rows) {
        const locationCell = await row.$("td:nth-child(3)");
        const locationText = ((await locationCell?.innerText())?.trim().toUpperCase() ??
            "");
        if (locationText.includes(normalized.split(" ")[0])) {
            const parcelCell = await row.$("td:nth-child(5)");
            parcelId = (await parcelCell?.innerText())?.trim() ?? null;
            break;
        }
    }
    if (!parcelId && rows.length > 0) {
        console.log("🟦 [PB] No exact match — selecting first row.");
        await rows[0].click();
        await page.waitForTimeout(3000);
        const parcelCell = await page.$("#MainContent_lblPCN");
        parcelId = (await parcelCell?.innerText())?.trim() ?? null;
    }
    if (!parcelId) {
        const html = (await page.evaluate(`document.documentElement.outerHTML`));
        console.log("❌ [PB] No matching row found.");
        console.log("❌ [PB] HTML size at no-match:", html.length);
        console.log("❌ [PB] HTML preview at no-match:", html.slice(0, 300));
        throw new Error("Palm Beach: No matching row found");
    }
    const detailsUrl = `https://pbcpao.gov/Property/Details?parcelId=${parcelId}`;
    console.log("🟦 [PB] Navigating to details page:", detailsUrl);
    await page.goto(detailsUrl, { waitUntil: "networkidle" });
    await page.waitForSelector("#MainContent_lblLocation", {
        timeout: 45000,
    });
    const html = (await page.evaluate(`document.documentElement.outerHTML`));
    const screenshot = await page.screenshot({ fullPage: true });
    console.log("🟦 [PB] Details page URL:", page.url());
    console.log("🟦 [PB] Details HTML size:", html.length);
    console.log("🟦 [PB] Details HTML preview:", html.slice(0, 300));
    let sketchBuffer;
    try {
        const sketchElement = await page.$('img[src*="/Property/GetBuildingSketch"]');
        if (sketchElement) {
            const buf = await sketchElement.screenshot();
            sketchBuffer = new Uint8Array(buf);
            console.log("🟩 [PB] Sketch image captured from results page.");
        }
        else {
            console.log("⚠️ [PB] Sketch element not found on results page.");
        }
    }
    catch (err) {
        console.error("❌ [PB] Sketch capture failed (results page):", err);
    }
    return {
        html,
        screenshot: new Uint8Array(screenshot),
        sketchBuffer,
        parcelPhotoBuffer: undefined,
    };
}
