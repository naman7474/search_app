import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { storefront } = await authenticate.public.appProxy(request);
    
    const url = new URL(request.url);
    const shopDomain = url.searchParams.get("shop");
    
    if (!shopDomain) {
      return json({ error: "Shop domain is required" }, { status: 400 });
    }
    
    if (!storefront) {
      return json({ error: "Storefront access not available" }, { status: 500 });
    }
    
    // Get shop information including currency
    try {
      const query = `
        query {
          shop {
            name
            myshopifyDomain
            currencyCode
            moneyFormat
            moneyWithCurrencyFormat
            primaryDomain {
              host
            }
            plan {
              displayName
            }
          }
        }
      `;
      
      const response = await storefront.graphql(query);
      const data = await response.json() as { data?: any; errors?: any[] };
      
      if (data.errors) {
        console.error("GraphQL errors:", data.errors);
        return json({ error: "Failed to fetch shop information" }, { status: 500 });
      }
      
      const shop = data.data.shop;
      
      return json({
        success: true,
        data: {
          name: shop.name,
          domain: shop.myshopifyDomain,
          primaryDomain: shop.primaryDomain?.host,
          currency: {
            code: shop.currencyCode,
            format: shop.moneyFormat,
            formatWithCurrency: shop.moneyWithCurrencyFormat,
          },
          plan: shop.plan?.displayName,
        },
      });
      
    } catch (error) {
      console.error("Store info API error:", error);
      
      // Fallback - return basic info with default currency
      return json({
        success: true,
        data: {
          name: shopDomain,
          domain: shopDomain,
          currency: {
            code: 'USD',
            format: '${{amount}}',
            formatWithCurrency: '${{amount}} USD',
          },
        },
      });
    }
    
  } catch (error) {
    console.error("Authentication error:", error);
    return json({ error: "Authentication failed" }, { status: 401 });
  }
}; 