import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import { extractCountyAssets } from "./helpers.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/pa-search", async (req, res) => {
  console.log("📥 PA Search Request");

  try {
    const { county, address, jobId, companyCode, jobNumber } = req.body;

    if (!county || !address) {
      return res.status(400).json({ error: "Missing county or address" });
    }

    console.log(`🔎 Running scraper for county: ${county}`);

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // NEW PIPELINE: helpers returns ONLY parsed fields
    const { parsed } = await extractCountyAssets(page, county, address);

    await browser.close();

    // Return ONLY parsed fields — no HTML, no images, no huge payloads
    return res.json({
      county,
      jobId,
      jobNumber,
      companyCode,
      parsed
    });

  } catch (err) {
    console.error("🔥 SCRAPER ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("🚀 PA Scraper Service running on port 3000");
});
