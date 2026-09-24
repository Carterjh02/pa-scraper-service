import { extractBrowardAssets } from "./counties/broward.js";
import { extractPalmBeachAssets } from "./counties/palmBeach.js";
import { extractSaintLucieAssets } from "./counties/saintLucie.js";
import { extractMiamiDadeAssets } from "./counties/miamiDade.js";
import { extractSeminoleAssets } from "./counties/seminole.js";

import { parsePAData } from "./parsers/index.js";

/**
 * Unified county extraction + parsing pipeline.
 * Returns ONLY parsed fields — no HTML, no images.
 */
export async function extractCountyAssets(page, county, address) {
  let html;

  switch (county.toLowerCase()) {
    case "broward":
      ({ html } = await extractBrowardAssets(page, address));
      break;

    case "palmbeach":
      ({ html } = await extractPalmBeachAssets(page, address));
      break;

    case "saintlucie":
      ({ html } = await extractSaintLucieAssets(page, address));
      break;

    case "miamidade":
      ({ html } = await extractMiamiDadeAssets(page, address));
      break;

    case "seminole":
      ({ html } = await extractSeminoleAssets(page, address));
      break;

    default:
      throw new Error(`County not supported: ${county}`);
  }

  if (!html || html.length < 20) {
    throw new Error(`Failed to extract HTML for county ${county}`);
  }

  // Parse HTML into structured PA data
  const parsed = parsePAData(county.toLowerCase(), html);

  return { parsed };
}
