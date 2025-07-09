import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { ConversationalSearchEngine, type Message, type ConversationContext } from "../lib/ai/conversation.server";

// Initialize the conversational search engine
const conversationEngine = new ConversationalSearchEngine();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return json({ error: "Method not allowed" }, { status: 405 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.public.appProxy(request);
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  
  try {
    const body = await request.json();
    const { messages, shop_domain, context } = body;
    
    // Validate required parameters
    if (!messages || !Array.isArray(messages) || !shop_domain) {
      return json({ 
        error: "Missing required parameters: messages (array) and shop_domain" 
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
        error: "Invalid message format. Each message must have 'role' ('user'|'assistant') and 'content' (string)" 
      }, { status: 400 });
    }
    
    // Process the conversation
    const response = await conversationEngine.processConversation(
      messages as Message[],
      shop_domain,
      context as ConversationContext | undefined
    );
    
    return json({
      success: true,
      data: response,
    });
    
  } catch (error) {
    console.error("Conversation API error:", error);
    
    // Return a friendly error message that the frontend can display
    return json({
      success: false,
      error: "I'm having trouble processing your request right now. Please try again in a moment.",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}; 