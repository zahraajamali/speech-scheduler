#!/usr/bin/env node
import { makeAnnouncement } from "../src/index.js";

async function testExample() {
  console.log("🧪 Testing piper-announce...");

  try {
    const result = await makeAnnouncement(
      "Welcome to our store! We have fresh coffee and pastries available.",
      "en",
      "female",
      "friendly",
      { master: true, exportFormats: ["mp3"] }
    );

    console.log("✅ Success!");
    console.log(`📝 Text: "${result.text}"`);
    console.log(`🎵 Audio: ${result.audio}`);
    if (result.extras.mp3) {
      console.log(`🎵 MP3: ${result.extras.mp3}`);
    }
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
}

testExample();
