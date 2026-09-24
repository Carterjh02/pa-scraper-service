/**
 * Normalize owner names for Broward + Palm Beach
 * Always returns:
 *  - "First Last"
 *  - "First & First Last"
 *  - "First Last & First Last"
 *
 * Removes:
 *  - Middle names
 *  - Secondary last names
 *  - Trusts
 */
export function normalizeOwnerNames(raw: string | string[]): string | undefined {
  if (!raw) return undefined;

  const names = Array.isArray(raw) ? raw : [raw];

  // ---------------------------
  // 1. Remove trust entries
  // ---------------------------
  const filtered = names.filter(n => {
    const upper = n.toUpperCase();
    return !upper.includes(" TR") && !upper.includes("TRUST");
  });

  if (filtered.length === 0) return undefined;

  // ---------------------------
  // Helper: extract first names + primary last
  // ---------------------------
  function extractNameParts(name: string): { firstNames: string[]; last: string } {
    name = name.trim().replace(/\s+/g, " ").replace(/&amp;/gi, "&");

    // Case: "LAST LAST2, FIRST & SECOND MIDDLE"
    if (name.includes(",")) {
      const [lastRaw, restRaw] = name.split(",").map(s => s.trim());

      // FIRST & SECOND MIDDLE → ["FIRST", "SECOND"]
      const firstNames = restRaw
        .split("&")
        .map(s => s.trim().split(" ")[0]); // remove middle names

      // PRIMARY LAST = last token before comma
      const lastParts = lastRaw.split(" ");
      const last = lastParts[lastParts.length - 1];

      return { firstNames, last };
    }

    // Case: "LAST LAST2 FIRST MIDDLE"
    const parts = name.split(" ");

    if (parts.length >= 2) {
      const last = parts[parts.length - 2]; // primary last
      const first = parts[parts.length - 1]; // first name only
      return { firstNames: [first], last };
    }

    return { firstNames: [name], last: "" };
  }

  // ---------------------------
  // 2. Normalize each owner
  // ---------------------------
  const normalized = filtered.map(n => {
    const { firstNames, last } = extractNameParts(n);
    return { firstNames, last };
  });

  // ---------------------------
  // 3. Merge multiple owners
  // ---------------------------
  if (normalized.length > 1) {
    const lastNames = normalized.map(n => n.last);
    const allSameLast = lastNames.every(l => l === lastNames[0]);

    // Case: shared last name → "First & First Last"
    if (allSameLast && lastNames[0]) {
      const last = lastNames[0];
      const allFirstNames = normalized
        .flatMap(n => n.firstNames)
        .join(" & ");
      return `${allFirstNames} ${last}`.trim();
    }

    // Case: different last names → "First Last & First Last"
    return normalized
      .map(n => `${n.firstNames[0]} ${n.last}`.trim())
      .join(" & ");
  }

  // Single owner
  const single = normalized[0];
  return `${single.firstNames.join(" & ")} ${single.last}`.trim();
}
