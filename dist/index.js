import express from "express";
import cors from "cors";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { extractCountyAssets } from "./helpers.js";
import ws from "ws";
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
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
            realtime: {
                transport: ws
            }
        });
        console.log(`🔎 Running scraper for county: ${county}`);
        const browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();
        const { html, screenshot, sketchBuffer, parcelPhotoBuffer, finalUrl, selectorFound } = await extractCountyAssets(page, county, address);
        await browser.close();
        console.log("📡 Final URL:", finalUrl ?? "(unknown)");
        console.log("📏 HTML size:", html ? html.length : 0);
        console.log("📏 Screenshot size:", screenshot ? screenshot.length : 0);
        console.log("🔎 Selectors found:", selectorFound);
        const basePath = `companies/${companyCode}/jobs/${jobNumber}`;
        const htmlPath = `${basePath}/pa.html`;
        const screenshotPath = `${basePath}/pa.png`;
        const sketchPath = sketchBuffer ? `${basePath}/sketch.png` : null;
        const parcelPhotoPath = parcelPhotoBuffer ? `${basePath}/parcel.png` : null;
        // Upload HTML
        if (html && html.length > 20) {
            const { error } = await supabase.storage.from("companies").upload(htmlPath, Buffer.from(html), { upsert: true, contentType: "text/html" });
            console.log("🧪 HTML upload result:", error ?? "success");
        }
        // Upload screenshot
        if (screenshot && screenshot.length > 20) {
            const { error } = await supabase.storage.from("companies").upload(screenshotPath, Buffer.from(screenshot), { upsert: true, contentType: "image/png" });
            console.log("🧪 Screenshot upload result:", error ?? "success");
        }
        // Upload sketch
        if (sketchBuffer && sketchBuffer.length > 20) {
            const { error } = await supabase.storage.from("companies").upload(sketchPath, Buffer.from(sketchBuffer), { upsert: true, contentType: "image/png" });
            console.log("🧪 Sketch upload result:", error ?? "success");
        }
        // Upload parcel photo
        if (parcelPhotoBuffer && parcelPhotoBuffer.length > 20) {
            const { error } = await supabase.storage.from("companies").upload(parcelPhotoPath, Buffer.from(parcelPhotoBuffer), { upsert: true, contentType: "image/png" });
            console.log("🧪 Parcel upload result:", error ?? "success");
        }
        return res.json({
            county,
            jobId,
            jobNumber,
            companyCode,
            htmlPath: html && html.length > 20 ? htmlPath : null,
            screenshotPath: screenshot && screenshot.length > 20 ? screenshotPath : null,
            sketchPath,
            parcelPhotoPath,
        });
    }
    catch (err) {
        console.error("🔥 SCRAPER ERROR:", err);
        return res.status(500).json({ error: err.message });
    }
});
app.listen(3000, () => {
    console.log("🚀 PA Scraper Service running on port 3000");
});
