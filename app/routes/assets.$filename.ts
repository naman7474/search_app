import { type LoaderFunctionArgs } from "@remix-run/node";
import fs from "fs";
import path from "path";

// MIME type mapping
const mimeTypes: Record<string, string> = {
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.html': 'text/html',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

export async function loader({ request, params }: LoaderFunctionArgs) {
  try {
    const { filename } = params;
    
    if (!filename) {
      throw new Response("Filename is required", { status: 400 });
    }

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    
    // Path to the asset file in the extension
    const assetPath = path.join(process.cwd(), "extensions", "ai-search-ui", "assets", sanitizedFilename);
    
    // Check if file exists and is within the assets directory
    if (!fs.existsSync(assetPath)) {
      throw new Response("Asset file not found", { status: 404 });
    }

    // Verify the file is actually in the assets directory (security check)
    const assetsDir = path.join(process.cwd(), "extensions", "ai-search-ui", "assets");
    const resolvedPath = path.resolve(assetPath);
    const resolvedAssetsDir = path.resolve(assetsDir);
    
    if (!resolvedPath.startsWith(resolvedAssetsDir)) {
      throw new Response("Access denied", { status: 403 });
    }

    // Read the asset file
    const assetContent = fs.readFileSync(assetPath);

    // Determine content type based on file extension
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Return asset with proper headers
    return new Response(assetContent, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Error serving asset:", error);
    return new Response("Error loading asset", { 
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }
} 