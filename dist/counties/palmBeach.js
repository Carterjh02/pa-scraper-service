/* ---------------------------------------------------------
   PALM BEACH — CLASSIC LOGIC (MATCHES OLD NEXT.JS SCRAPER)
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
    if (!tableExists) {
        const detailsExists = await page.$("#MainContent_lblLocation");
        if (detailsExists) {
            const html = await page.content();
            return { html };
        }
        throw new Error("Palm Beach: searchGrid table not found");
    }
    /* ---------------------------------------------------------
       3. TABLE EXISTS → EXACT ADDRESS MATCH WITH PAGINATION
    --------------------------------------------------------- */
    await page.waitForFunction(() => {
        const table = document.querySelector("#searchGrid");
        return table && table.querySelectorAll("tbody tr").length > 0;
    }, { timeout: 30000 });
    async function findParcelAcrossPages() {
        let pageIndex = 1;
        while (true) {
            const rows = await page.$$("#searchGrid tbody tr");
            for (const row of rows) {
                const locationCell = await row.$("td:nth-child(3)");
                const locationText = (await locationCell?.innerText())?.trim().toUpperCase() ?? "";
                const normalizedPrefix = normalized.split(" ").slice(0, 2).join(" ");
                if (locationText.includes(normalizedPrefix)) {
                    const parcelCell = await row.$("td:nth-child(5)");
                    const parcelText = (await parcelCell?.innerText())?.trim() ?? null;
                    return parcelText;
                }
            }
            const nextButton = await page.$("a.paginate_button.next:not(.disabled)");
            if (!nextButton)
                return null;
            await nextButton.click();
            await page.waitForTimeout(1500);
            pageIndex++;
        }
    }
    const parcelId = await findParcelAcrossPages();
    if (!parcelId) {
        throw new Error("Palm Beach: No matching address found after pagination");
    }
    /* ---------------------------------------------------------
       4. LOAD DETAILS PAGE
    --------------------------------------------------------- */
    const detailsUrl = `https://pbcpao.gov/Property/Details?parcelId=${parcelId}`;
    await page.goto(detailsUrl, { waitUntil: "networkidle" });
    const html = await page.content();
    await page.waitForSelector("#MainContent_lblLocation", { timeout: 30000 });
    return { html };
}
