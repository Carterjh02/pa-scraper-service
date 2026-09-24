import { parsePalmBeachPA } from "./palmBeach.js";
import { parseBrowardPA } from "./broward.js";
import { parseMiamiDadePA } from "./miamiDade.js";
import { parseSeminolePA } from "./seminole.js";
export function parsePAData(county, html) {
    switch (county.toLowerCase()) {
        case "palmbeach":
            return parsePalmBeachPA(html);
        case "broward":
            return parseBrowardPA(html);
        case "miamidade":
            return parseMiamiDadePA(html);
        // case "saintlucie":
        //   return parseSaintLuciePA(html);
        case "seminole":
            return parseSeminolePA(html);
        default:
            console.log("❌ No parser found for county:", county);
            return {};
    }
}
