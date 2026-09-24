import type { ParsedPAData } from "../types";
import { normalizeOwnerNames } from "./nameUtils";

export function parseBrowardPA(html: string): ParsedPAData {
  const data: ParsedPAData = {};

  /* ---------------------------------------------------------
     FOLIO NUMBER
  --------------------------------------------------------- */
  const folioMatch = html.match(/<div id="folioNumberId">.*?>(\d{12})<\/a>/i);
  if (folioMatch) {
    data.folio = folioMatch[1].trim();
  }

  /* ---------------------------------------------------------
     OWNER NAME (multi-owner support)
  --------------------------------------------------------- */
  const ownerMatches = html.matchAll(
    /<div id="ownerName(?:Id|2Id)">([^<]+)<\/div>/gi
  );

  const owners = Array.from(ownerMatches, (m) =>
    m[1].replace(/&amp;/gi, "&").trim()
  );

  if (owners.length > 0) {
    data.ownerName = normalizeOwnerNames(owners);
  }

  /* ---------------------------------------------------------
     SITE ADDRESS (deterministic slicing + unit support)
  --------------------------------------------------------- */
  const addressMatch = html.match(
    /<div id="situsAddressId">.*?>([^<]+)<\/a>/i
  );

  if (addressMatch) {
    const fullAddress = addressMatch[1].replace(/\s+/g, " ").trim();
    data.siteAddress = fullAddress;

    const suffixes = [
      "STREET", "ST", "AVENUE", "AVE", "BOULEVARD", "BLVD",
      "ROAD", "RD", "DRIVE", "DR", "COURT", "CT",
      "LANE", "LN", "TERRACE", "TER", "PLACE", "PL",
      "CIRCLE", "CIR", "HIGHWAY", "HWY", "WAY", "WY"
    ];

    const suffixRegex = new RegExp(`\\b(${suffixes.join("|")})\\b`, "i");
    const suffixMatch = fullAddress.match(suffixRegex);

    if (suffixMatch) {
      const suffix = suffixMatch[1];
      let idx = fullAddress.indexOf(suffix) + suffix.length;

      const remainderAfterSuffix = fullAddress.slice(idx).trim();
      const unitRegex = /^(#\s*\d+|UNIT\s*\d+|APT\s*\d+|BLDG\s*\d+)/i;
      const unitMatch = remainderAfterSuffix.match(unitRegex);

      if (unitMatch) {
        idx += unitMatch[0].length + 1;
      }

      data.street = fullAddress.slice(0, idx).trim();

      const remainder = fullAddress.slice(idx).trim();

      const cityMatch = remainder.match(/^(.+?),/);
      if (cityMatch) {
        data.city = cityMatch[1].trim();
      }

      const zipMatch = remainder.match(/,?\s*(\d{5})/);
      if (zipMatch) {
        data.zip = zipMatch[1];
      }
    }
  }

  /* ---------------------------------------------------------
     LEGAL DESCRIPTION (with AKA support)
  --------------------------------------------------------- */
  const legalMatch = html.match(
    /<div id="legalDescId"[^>]*>([^<]+)<\/div>/i
  );

  if (legalMatch) {
    const rawLegal = legalMatch[1].replace(/\s+/g, " ").trim();

    const akaIndex = rawLegal.toUpperCase().indexOf("AKA:");
    if (akaIndex !== -1) {
      data.legalDescription = rawLegal.slice(akaIndex + 4).trim();
    } else {
      data.legalDescription = rawLegal;
    }
  }

  return data;
}
