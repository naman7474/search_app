import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { visualSearchEngine } from "../lib/ai/visual-search.server";

// Supported image MIME types
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/gif'
];

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export const action = async ({ request }: ActionFunctionArgs) => {
  // Authenticate the request
  await authenticate.public.appProxy(request);
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const imageFile = formData.get("image") as File;
    const shopDomain = formData.get("shop") as string;
    const limit = parseInt((formData.get("limit") as string) || "20");
    const offset = parseInt((formData.get("offset") as string) || "0");
    const sessionId = formData.get("session_id") as string | undefined;
    
    // Validate required parameters
    if (!imageFile || !shopDomain) {
      return json({
        success: false,
        error: "Missing required parameters: image and shop",
      }, { status: 400 });
    }

    // Validate file type
    if (!SUPPORTED_MIME_TYPES.includes(imageFile.type)) {
      return json({
        success: false,
        error: `Unsupported image type. Supported types: ${SUPPORTED_MIME_TYPES.join(', ')}`,
      }, { status: 400 });
    }

    // Validate file size
    if (imageFile.size > MAX_FILE_SIZE) {
      return json({
        success: false,
        error: `Image too large. Maximum size: ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    const userAgent = request.headers.get("user-agent") || undefined;

    console.log("VISUAL_SEARCH_API_REQUEST", {
      shop: shopDomain,
      imageSize: imageFile.size,
      mimeType: imageFile.type,
      fileName: imageFile.name,
    });

    // Perform visual search
    const searchResult = await visualSearchEngine.searchByImage({
      imageBuffer,
      mimeType: imageFile.type,
      shopDomain,
      limit,
      offset,
      sessionId,
      userAgent,
    });

    console.log("VISUAL_SEARCH_API_SUCCESS", {
      searchId: searchResult.search_id,
      productCount: searchResult.products.length,
      processingTime: searchResult.query_info.processing_time_ms,
    });

    return json({
      success: true,
      data: searchResult,
    });

  } catch (error) {
    console.error("Visual search API error:", error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('GOOGLE_AI_API_KEY')) {
        return json({
          success: false,
          error: "Visual search service unavailable",
          message: "Configuration error",
        }, { status: 503 });
      }
      
      if (error.message.includes('quota') || error.message.includes('rate limit')) {
        return json({
          success: false,
          error: "Visual search temporarily unavailable",
          message: "Service limit reached, please try again later",
        }, { status: 429 });
      }
    }

    return json({
      success: false,
      error: "Visual search failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
};

// GET endpoint for health check and supported formats
export const loader = async () => {
  return json({
    success: true,
    data: {
      supported_formats: SUPPORTED_MIME_TYPES,
      max_file_size_mb: MAX_FILE_SIZE / (1024 * 1024),
      features: [
        'Product category detection',
        'Color analysis',
        'Style identification',
        'Material recognition',
        'Visual similarity search',
      ],
    },
  });
}; 