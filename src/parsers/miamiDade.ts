import type { ParsedPAData } from "../types.js";

/* ---------------------------------------------------------
   MIAMI-DADE — CUSTOM NAME NORMALIZER
--------------------------------------------------------- */
function normalizeMiamiDadeOwnerNames(owners: string[]): string {
  if (!owners || owners.length === 0) return "";

  const parsed = owners.map(full => {
    const parts = full.trim().split(/\s+/);
    const first = parts[0];
    const last = parts[parts.length - 1];
    return { first, last, full };
  });

  const allSameLast = parsed.every(p => p.last === parsed[0].last);

  if (parsed.length === 1) return parsed[0].full;

  if (allSameLast) {
    const last = parsed[0].last;
    const firstNames = parsed.map(p => p.first).join(" & ");
    return `${firstNames} ${last}`;
  }

  return parsed.map(p => `${p.first} ${p.last}`).join(" & ");
}

/* ---------------------------------------------------------
   MIAMI-DADE PARSER
--------------------------------------------------------- */

export function parseMiamiDadePA(html: string): ParsedPAData {
  const data: ParsedPAData = {};

  /* ---------------------------------------------------------
     FOLIO NUMBER
     Pattern: 30-5903-026-1670
  --------------------------------------------------------- */
  const folioMatch = html.match(/\b(\d{2}-\d{4}-\d{3}-\d{4})\b/);
  if (folioMatch) {
    data.folio = folioMatch[1].trim();
  }

  /* ---------------------------------------------------------
  OWNER NAMES (FIRST LAST format)
--------------------------------------------------------- */
  const ownerMatches = html.matchAll(
    /<div[^>]*class="pa-font-size-11"[^>]*>([^<]+)<\/div>/gi
  );

  const owners: string[] = [];
  for (const m of ownerMatches) {
    const raw = m[1].trim();
    if (raw && /^[A-Z][A-Z\s'.-]+$/.test(raw)) {
      owners.push(raw);
    }
  }
  
  // Miami-Dade names are FIRST LAST → apply custom formatter
  if (owners.length > 0) {
    data.ownerName = normalizeMiamiDadeOwnerNames(owners);
  }

  /* ---------------------------------------------------------
  PROPERTY ADDRESS (joined spans)
--------------------------------------------------------- */
const propertyAddressBlock = html.match(
 /<div[^>]*class="property-add[^"]*"[^>]*>([\s\S]*?)<\/div>/i
);

if (propertyAddressBlock) {
 const spans = Array.from(
   propertyAddressBlock[1].matchAll(/<span[^>]*>([^<]+)<\/span>/gi),
   m => m[1].trim()
 );

 const joined = spans.join(" ").replace(/\s+/g, " ").trim();
 data.siteAddress = joined;
 data.street = joined;
}

/* ---------------------------------------------------------
  MAILING ADDRESS
--------------------------------------------------------- */
const mailingBlock = html.match(
 /<td[^>]*class="pi_mailing_address"[\s\S]*?<div[^>]*>([\s\S]*?)<\/div>/i
);

let mailingStreet: string | undefined;
let mailingCity: string | undefined;
let mailingZip: string | undefined;

if (mailingBlock) {
 const block = mailingBlock[1];

 // All spans inside mailing block
 const spans = Array.from(
   block.matchAll(/<span[^>]*>([^<]+)<\/span>/gi),
   m => m[1].trim()
 );

 // Street: first span
 mailingStreet = spans[0];

 // City: text between <br> and comma
 const cityMatch = block.match(/<br[^>]*>([^<]+),/i);
 if (cityMatch) {
   mailingCity = cityMatch[1].trim();
 }

 // ZIP: LAST span containing 5 digits
 const zipSpan = [...spans].reverse().find(s => /\d{5}/.test(s));
 if (zipSpan) {
   const zipMatch = zipSpan.match(/\d{5}/);
   mailingZip = zipMatch ? zipMatch[0] : undefined;
 }
}

/* ---------------------------------------------------------
  ADDRESS MATCH RULE
--------------------------------------------------------- */
function normalize(s: string | undefined): string {
 return (s || "").replace(/\s+/g, " ").trim().toUpperCase();
}

const physical = normalize(data.siteAddress);
const mailing = normalize(mailingStreet);

if (physical && mailing && physical.startsWith(mailing)) {
 data.city = mailingCity;
 data.zip = mailingZip;
} else {
 data.city = undefined;
 data.zip = undefined;
}


  /* ---------------------------------------------------------
  LEGAL DESCRIPTION (multi-row table)
  Extract all <td class="description-block"><span>...</span></td>
  --------------------------------------------------------- */
  const legalBlock = html.match(
  /<div[^>]*class="table-responsive legal-descr"[\s\S]*?<table[\s\S]*?<\/table>/i
  );

  if (legalBlock) {
  const spans = Array.from(
    legalBlock[0].matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi),
    m =>
      m[1]
        .replace(/<br[^>]*>/gi, " ")   // convert <br> to space
        .replace(/&amp;/gi, "&")       // decode ampersands
        .replace(/\s+/g, " ")          // normalize whitespace
        .trim()
  );

  if (spans.length > 0) {
    data.legalDescription = spans.join(" ");
    console.log("🟩 [MIAMI_DEBUG] Extracted legal description:", data.legalDescription);
  } else {
    console.log("🟡 [MIAMI_DEBUG] No spans found in legal block");
  }
  } else {
  console.log("🔴 [MIAMI_DEBUG] Legal description block not found");
  }

/* ---------------------------------------------------------
  DEBUG LOG
--------------------------------------------------------- */
console.log("🟦 [PA_DEBUG:MIAMI_PARSED]", {
 ownerName: data.ownerName,
 siteAddress: data.siteAddress,
 street: data.street,
 city: data.city,
 zip: data.zip,
 folio: data.folio,
 legalDescription: data.legalDescription,
});

return data;
}
