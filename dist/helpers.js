import { extractBrowardAssets } from "./broward.js";
import { extractPalmBeachAssets } from "./palmBeach.js";
import { extractSaintLucieAssets } from "./saintLucie.js";
import { extractMiamiDadeAssets } from "./miamiDade.js";
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
        default:
            throw new Error(`County not supported: ${county}`);
    }
    return {
        ...result,
        finalUrl: page.url(),
        selectorFound: /folioNumberId|MainContent_lblLocation/i.test(result.html ?? ""),
    };
}
