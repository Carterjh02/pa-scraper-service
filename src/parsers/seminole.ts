import type { ParsedPAData } from "../types.js";
import { normalizeOwnerNames } from "./nameUtils.js";

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
  // Capture owner block with <br> separators and tenancy text
  const ownerBlockMatch = html.match(
    /<div[^>]*>\s*([\s\S]*?)<\/div>/i
  );
  
  if (ownerBlockMatch) {
    const rawOwnerBlock = ownerBlockMatch[1]
      .replace(/<!--.*?-->/g, "")
      .replace(/<span[\s\S]*$/i, "") // remove trailing span/links
      .trim();
  
    const ownerLines = rawOwnerBlock
      .split(/<br\s*\/?>/i)
      .map(line =>
        line
          .replace(/-?\s*Tenancy by Entirety/i, "")
          .replace(/&amp;/g, "&")
          .trim()
      )
      .filter(line => line.length > 0);
  
    if (ownerLines.length > 0) {
      data.ownerName = normalizeOwnerNames(ownerLines);
    }
  }

  /* ---------------------------------------------------------
  LEGAL DESCRIPTION
  Example:
  <td ...><div><!--!-->LOT 91
  HUNTINGTON POINTE PH 2
  PB 50 PGS 33 & 34</div></td>
--------------------------------------------------------- */
// Seminole legal description cell is labeled "Legal" in the first column
const legalMatch = html.match(
  /<td[^>]*>\s*<div><b>Legal<\/b><\/div><\/td>\s*<td[^>]*class="[^"]*e-templatecell[^"]*"[^>]*>\s*<div[^>]*>([\s\S]*?)<\/div>/i
);

if (legalMatch) {
  const raw = legalMatch[1]
    .replace(/<!--.*?-->/g, "")
    .replace(/\s+/g, " ")
    .replace(/&amp;/g, "&")
    .trim();

  data.legalDescription = raw;
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
