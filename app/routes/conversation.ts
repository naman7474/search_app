import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { ConversationalSearchEngine, type Message, type ConversationContext } from "../lib/ai/conversation.server";

// Initialize the conversational search engine
const conversationEngine = new ConversationalSearchEngine();

/**
 * Handle direct /conversation requests from the app proxy
 * This route proxies to the main conversational search API functionality
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Authenticate using app proxy
    await authenticate.public.appProxy(request);
    
    const body = await request.json();
    const { messages, shop_domain, context } = body;
    
    if (!messages || !shop_domain) {
      return json({ 
        success: false,
        error: "Missing required parameters: messages and shop_domain"
      }, { status: 400 });
    }
    
    // Validate message format
    const validMessages = messages.every((msg: any) => 
      msg && 
      typeof msg === 'object' && 
      typeof msg.content === 'string' && 
      (msg.role === 'user' || msg.role === 'assistant')
    );
    
    if (!validMessages) {
      return json({ 
        success: false,
        error: "Invalid message format. Each message must have 'role' ('user'|'assistant') and 'content' (string)" 
      }, { status: 400 });
    }
    
    // Process the conversation using the same engine as the API route
    const result = await conversationEngine.processConversation(
      messages as Message[],
      shop_domain,
      context as ConversationContext | undefined
    );
    
    return json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error("Conversation route error:", error);
    return json({
      success: false,
      error: "Conversation failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}; 