import type { ParsedPAData } from "../types";
import { normalizeOwnerNames } from "./nameUtils";

export function parseSeminolePA(html: string): ParsedPAData {
  const data: ParsedPAData = {};

  /* ---------------------------------------------------------
     PARCEL ID (Folio)
     Example element:
     <button ...>Parcel #: 19-20-30-523-0000-0910</button>
  --------------------------------------------------------- */
  const folioMatch = html.match(/Parcel\s*#:\s*([\d\-]+)/i);
  if (folioMatch) {
    data.folio = folioMatch[1].trim();
  }

  /* ---------------------------------------------------------
  SITE ADDRESS
  Example:
  <div class="parcel-address">241 HANGING MOSS CIR LAKE MARY, FL 32746</div>
--------------------------------------------------------- */
const addressBlockMatch = html.match(
  /<div class="parcel-address">\s*([^<]+?)\s*<\/div>/i
);

if (addressBlockMatch) {
  const fullAddress = addressBlockMatch[1].replace(/\s+/g, " ").trim().toUpperCase();
  data.siteAddress = fullAddress;

  // Use Broward-style deterministic slicing
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
     OWNER NAME(S)
     Example:
     <div class="parcel-address">HOWELL, STACEY R</div>
     (Seminole uses same class for owner + address)
  --------------------------------------------------------- */
  const ownerMatches = html.matchAll(
    /<div class="parcel-address">\s*([A-Z0-9 ,.&']+)\s*<\/div>/gi
  );

  const ownerCandidates = Array.from(ownerMatches, m => m[1].trim());

  // Filter out the address block (contains digits)
  const owners = ownerCandidates.filter(o => !/\d/.test(o));

  if (owners.length > 0) {
    data.ownerName = normalizeOwnerNames(owners);
  }

  /* ---------------------------------------------------------
  LEGAL DESCRIPTION
  Example:
  <td ...><div><!--!-->LOT 91
  HUNTINGTON POINTE PH 2
  PB 50 PGS 33 & 34</div></td>
--------------------------------------------------------- */
const legalMatch = html.match(
  /<td[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>\s*<\/td>/i
);

if (legalMatch) {
  data.legalDescription = legalMatch[1]
    .replace(/<!--.*?-->/g, "") // remove comment nodes
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .trim();
}

  /* ---------------------------------------------------------
     PROPERTY SKETCH IMAGE
     Example:
     <img src="https://files.scpafl.org/footprintimage/192030523000009101.jpg">
  --------------------------------------------------------- */
  const imageMatch = html.match(
    /<img[^>]+src="([^"]+footprintimage[^"]+)"/i
  );

  if (imageMatch) {
    data.imageUrl = imageMatch[1].trim();
  }

  return data;
}
