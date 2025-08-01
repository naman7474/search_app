import { type LoaderFunctionArgs } from "@remix-run/node";
import fs from "fs";
import path from "path";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // Path to the CSS file in the extension
    const cssPath = path.join(process.cwd(), "extensions", "ai-search-ui", "assets", "search-page.css");
    
    // Check if file exists
    if (!fs.existsSync(cssPath)) {
      throw new Response("CSS file not found", { status: 404 });
    }

    // Read the CSS file
    const cssContent = fs.readFileSync(cssPath, "utf-8");

    // Return CSS with proper headers
    return new Response(cssContent, {
      status: 200,
      headers: {
        "Content-Type": "text/css",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Error serving search page CSS:", error);
    return new Response("Error loading CSS", { 
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
} 