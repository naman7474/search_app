import { type LoaderFunctionArgs } from "@remix-run/node";
import fs from "fs";
import path from "path";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Path to the JS file in the extension
    const jsPath = path.join(process.cwd(), "extensions", "ai-search-ui", "assets", "main.js");
    
    // Check if file exists
    if (!fs.existsSync(jsPath)) {
      throw new Response("JS file not found", { status: 404 });
    }

    // Read the JS file
    const jsContent = fs.readFileSync(jsPath, "utf-8");

    // Return JS with proper headers
    return new Response(jsContent, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Error serving JS:", error);
    return new Response("Error loading JS", { 
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
} 