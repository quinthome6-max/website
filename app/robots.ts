import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/**
 * Paths with nothing to index: a bag and a checkout are per-visitor, order
 * pages are private to the buyer, and /api is machinery.
 */
const PRIVATE = ["/cart", "/checkout", "/order/", "/api/", "/admin"];

/**
 * Assistant crawlers, allowed deliberately rather than by omission.
 *
 * These are now a referral channel, not only a scraping risk: being absent from
 * their indexes means never being the brand named when somebody asks an
 * assistant for a waterless diffuser in India. They are given their own block
 * because a crawler that finds a section matching its own token may ignore the
 * wildcard one entirely — which would otherwise leave the private paths open to
 * exactly these agents.
 */
const ASSISTANTS = [
  "GPTBot", // OpenAI — index used for training and ChatGPT browsing
  "OAI-SearchBot", // OpenAI — ChatGPT Search results
  "ChatGPT-User", // OpenAI — live fetch when a user asks about a page
  "ClaudeBot", // Anthropic — index
  "Claude-User", // Anthropic — live fetch on a user's behalf
  "PerplexityBot", // Perplexity — index
  "Perplexity-User", // Perplexity — live fetch
  "Claude-SearchBot", // Anthropic — Claude's search results
  "Google-Extended", // Google — Gemini grounding and AI Overviews
  "Applebot-Extended", // Apple — Apple Intelligence
  "meta-externalagent", // Meta — Meta AI in WhatsApp, Instagram and Facebook
  "Amazonbot", // Amazon — Alexa and Rufus answers
  "DuckAssistBot", // DuckDuckGo — DuckAssist answers
  "MistralAI-User", // Mistral — Le Chat live fetch
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: ASSISTANTS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
