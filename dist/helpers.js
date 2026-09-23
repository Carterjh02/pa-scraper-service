import { extractBrowardAssets } from "./broward.js";
import { extractPalmBeachAssets } from "./palmBeach.js";
import { extractSaintLucieAssets } from "./saintLucie.js";
import { extractMiamiDadeAssets } from "./miamiDade.js";
import { extractSeminoleAssets } from "./seminole.js";
export async function extractCountyAssets(page, county, address) {
    let result;
    switch (county.toLowerCase()) {
        case "broward":
            result = await extractBrowardAssets(page, address);
            break;
        case "palmbeach":
            result = await extractPalmBeachAssets(page, address);
            break;
        case "saintlucie":
            result = await extractSaintLucieAssets(page, address);
            break;
        case "miamidade":
            result = await extractMiamiDadeAssets(page, address);
            break;
        case "seminole":
            result = await extractSeminoleAssets(page, address);
            break;
        default:
            throw new Error(`County not supported: ${county}`);
    }
    return {
        ...result,
        finalUrl: page.url(),
        // Stronger, county-aware selector detection
        selectorFound: (() => {
            const html = typeof result.html === "string" ? result.html : "";
            // Broward property page
            if (county.toLowerCase() === "broward") {
                return html.includes("folioNumberId");
            }
            // Palm Beach details page
            if (county.toLowerCase() === "palmbeach") {
                return html.includes("MainContent_lblLocation") &&
                    html.includes("MainContent_lblPCN");
            }
            // Saint Lucie (OCR only)
            if (county.toLowerCase() === "saintlucie") {
                return !!result.screenshot;
            }
            // Miami-Dade property page
            if (county.toLowerCase() === "miamidade") {
                return html.includes("lblFolio") || html.includes("lblLocation");
            }
            // Seminole property page
            if (county.toLowerCase() === "seminole") {
                return (html.includes("Parcel Number") &&
                    html.includes("Property Details"));
            }
            return false;
        })(),
    };
}
