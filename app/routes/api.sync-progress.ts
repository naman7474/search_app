import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getSyncJobStatus } from "./api.index";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  
  const url = new URL(request.url);
  const jobId = url.searchParams.get("job_id");
  
  if (!jobId) {
    return json({
      success: false,
      error: "Missing job_id parameter",
    }, { status: 400 });
  }
  
  try {
    const job = getSyncJobStatus(jobId);
    
    if (!job) {
      return json({
        success: false,
        error: "Job not found",
      }, { status: 404 });
    }
    
    // Verify job belongs to the current shop
    if (job.shopDomain !== shopDomain) {
      return json({
        success: false,
        error: "Access denied",
      }, { status: 403 });
    }
    
    return json({
      success: true,
      data: {
        job_id: job.id,
        status: job.status,
        processed: job.processed,
        total: job.total,
        current_step: job.current_step,
        error: job.error,
        created_at: job.created_at,
      },
    });
    
  } catch (error) {
    console.error("Failed to get sync progress:", error);
    return json({
      success: false,
      error: "Failed to get sync progress",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}; 