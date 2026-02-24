/**
 * Seed Examples for Classifier Router
 *
 * ~120 labeled examples used for embedding similarity routing.
 * 10-15 per route label. These ship with the package as static data.
 */

import type { RoutingExample } from "./types";

export const SEED_EXAMPLES: RoutingExample[] = [
  // ============================================================================
  // fast_cheap_chat (12 examples)
  // ============================================================================
  { text: "hi", routeLabel: "fast_cheap_chat", complexity: "simple" },
  { text: "hello there", routeLabel: "fast_cheap_chat", complexity: "simple" },
  { text: "what's up?", routeLabel: "fast_cheap_chat", complexity: "simple" },
  { text: "thanks!", routeLabel: "fast_cheap_chat", complexity: "simple" },
  {
    text: "what's the capital of France?",
    routeLabel: "fast_cheap_chat",
    complexity: "simple",
  },
  {
    text: "how do you say hello in Spanish?",
    routeLabel: "fast_cheap_chat",
    complexity: "simple",
  },
  {
    text: "what's 2 + 2?",
    routeLabel: "fast_cheap_chat",
    complexity: "simple",
  },
  {
    text: "tell me a joke",
    routeLabel: "fast_cheap_chat",
    complexity: "simple",
  },
  {
    text: "what day is today?",
    routeLabel: "fast_cheap_chat",
    complexity: "simple",
  },
  {
    text: "can you repeat that?",
    routeLabel: "fast_cheap_chat",
    complexity: "simple",
  },
  {
    text: "yes",
    routeLabel: "fast_cheap_chat",
    complexity: "simple",
  },
  {
    text: "no, that's not what I meant",
    routeLabel: "fast_cheap_chat",
    complexity: "simple",
  },

  // ============================================================================
  // balanced_general (12 examples)
  // ============================================================================
  {
    text: "can you summarize this article for me?",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },
  {
    text: "write me a short email to my boss about taking tomorrow off",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },
  {
    text: "what are the pros and cons of remote work?",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },
  {
    text: "explain quantum computing in simple terms",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },
  {
    text: "help me plan a birthday party for 20 people",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },
  {
    text: "what's the difference between a virus and bacteria?",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },
  {
    text: "give me 5 dinner ideas for tonight",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },
  {
    text: "how does photosynthesis work?",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },
  {
    text: "translate this paragraph to French",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },
  {
    text: "what are the best practices for time management?",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },
  {
    text: "compare electric cars vs hybrid cars",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },
  {
    text: "explain the difference between a 401k and IRA in simple terms",
    routeLabel: "balanced_general",
    complexity: "moderate",
  },

  // ============================================================================
  // code_heavy (15 examples)
  // ============================================================================
  {
    text: "write a Python function that finds all prime numbers up to N using the Sieve of Eratosthenes",
    routeLabel: "code_heavy",
    complexity: "moderate",
  },
  {
    text: "debug this React component - it's re-rendering infinitely",
    routeLabel: "code_heavy",
    complexity: "moderate",
  },
  {
    text: "how do I implement a binary search tree in TypeScript?",
    routeLabel: "code_heavy",
    complexity: "moderate",
  },
  {
    text: "refactor this class to use the strategy pattern",
    routeLabel: "code_heavy",
    complexity: "complex",
  },
  {
    text: "write unit tests for this API endpoint using vitest",
    routeLabel: "code_heavy",
    complexity: "moderate",
  },
  {
    text: "design a database schema for a social media app with posts, comments, and likes",
    routeLabel: "code_heavy",
    complexity: "complex",
  },
  {
    text: "fix this SQL query - it's returning duplicate rows",
    routeLabel: "code_heavy",
    complexity: "moderate",
  },
  {
    text: "implement a rate limiter middleware in Express.js",
    routeLabel: "code_heavy",
    complexity: "moderate",
  },
  {
    text: "convert this JavaScript code to TypeScript with proper types",
    routeLabel: "code_heavy",
    complexity: "moderate",
  },
  {
    text: "write a GitHub Actions CI/CD pipeline for a Next.js app",
    routeLabel: "code_heavy",
    complexity: "complex",
  },
  {
    text: "explain the difference between useEffect and useLayoutEffect in React",
    routeLabel: "code_heavy",
    complexity: "simple",
  },
  {
    text: "build a REST API with authentication using Fastify and Prisma",
    routeLabel: "code_heavy",
    complexity: "complex",
  },
  {
    text: "optimize this recursive function - it's too slow for large inputs",
    routeLabel: "code_heavy",
    complexity: "moderate",
  },
  {
    text: "write a custom React hook for infinite scroll with intersection observer",
    routeLabel: "code_heavy",
    complexity: "moderate",
  },
  {
    text: "how do I set up WebSocket connections with reconnection logic?",
    routeLabel: "code_heavy",
    complexity: "moderate",
  },

  // ============================================================================
  // long_context (10 examples)
  // ============================================================================
  {
    text: "analyze this 50-page research paper and give me the key findings",
    routeLabel: "long_context",
    complexity: "complex",
  },
  {
    text: "summarize this entire book chapter I'm pasting below",
    routeLabel: "long_context",
    complexity: "complex",
  },
  {
    text: "review this long legal document and highlight potential issues",
    routeLabel: "long_context",
    complexity: "complex",
  },
  {
    text: "compare these two lengthy reports and find the discrepancies",
    routeLabel: "long_context",
    complexity: "complex",
  },
  {
    text: "here's a full codebase - find all the security vulnerabilities",
    routeLabel: "long_context",
    complexity: "complex",
  },
  {
    text: "read through this entire conversation history and summarize the key decisions",
    routeLabel: "long_context",
    complexity: "complex",
  },
  {
    text: "analyze this CSV with 10,000 rows and find patterns",
    routeLabel: "long_context",
    complexity: "complex",
  },
  {
    text: "I'm going to paste a very long document - please wait for all of it before responding",
    routeLabel: "long_context",
    complexity: "complex",
  },
  {
    text: "process this entire meeting transcript and extract action items",
    routeLabel: "long_context",
    complexity: "complex",
  },
  {
    text: "review all my previous messages in this conversation and identify recurring themes",
    routeLabel: "long_context",
    complexity: "moderate",
  },

  // ============================================================================
  // strict_json (10 examples)
  // ============================================================================
  {
    text: "extract all the names, dates, and locations from this text and return as JSON",
    routeLabel: "strict_json",
    complexity: "moderate",
  },
  {
    text: "parse this resume into a structured JSON format with sections for education, experience, and skills",
    routeLabel: "strict_json",
    complexity: "moderate",
  },
  {
    text: "convert this unstructured data into a normalized JSON schema",
    routeLabel: "strict_json",
    complexity: "moderate",
  },
  {
    text: "return the output as a JSON array with objects containing title, author, and year",
    routeLabel: "strict_json",
    complexity: "moderate",
  },
  {
    text: "extract product information from this HTML and output as structured data",
    routeLabel: "strict_json",
    complexity: "moderate",
  },
  {
    text: "create a JSON schema for a user profile with validation rules",
    routeLabel: "strict_json",
    complexity: "moderate",
  },
  {
    text: "parse this email thread and extract sender, recipient, date, subject, and body as JSON",
    routeLabel: "strict_json",
    complexity: "moderate",
  },
  {
    text: "transform this CSV data into a JSON format grouped by category",
    routeLabel: "strict_json",
    complexity: "moderate",
  },
  {
    text: "extract all API endpoints from this documentation and return as a structured list",
    routeLabel: "strict_json",
    complexity: "moderate",
  },
  {
    text: "classify these sentences by sentiment and return results as JSON with confidence scores",
    routeLabel: "strict_json",
    complexity: "moderate",
  },

  // ============================================================================
  // creative_writing (12 examples)
  // ============================================================================
  {
    text: "write a short story about a time traveler who can only go forward",
    routeLabel: "creative_writing",
    complexity: "complex",
  },
  {
    text: "help me write compelling marketing copy for a new SaaS product",
    routeLabel: "creative_writing",
    complexity: "moderate",
  },
  {
    text: "write a poem about the ocean at sunset",
    routeLabel: "creative_writing",
    complexity: "moderate",
  },
  {
    text: "brainstorm 20 creative names for a coffee shop",
    routeLabel: "creative_writing",
    complexity: "moderate",
  },
  {
    text: "write a screenplay scene where two old friends meet after 20 years",
    routeLabel: "creative_writing",
    complexity: "complex",
  },
  {
    text: "help me craft a personal statement for my college application",
    routeLabel: "creative_writing",
    complexity: "complex",
  },
  {
    text: "write a children's bedtime story about a brave little robot",
    routeLabel: "creative_writing",
    complexity: "moderate",
  },
  {
    text: "create a compelling product description for this gadget",
    routeLabel: "creative_writing",
    complexity: "moderate",
  },
  {
    text: "write song lyrics about heartbreak in the style of indie folk",
    routeLabel: "creative_writing",
    complexity: "moderate",
  },
  {
    text: "help me write a best man speech - funny but heartfelt",
    routeLabel: "creative_writing",
    complexity: "moderate",
  },
  {
    text: "write a satirical news article about AI taking over mundane jobs",
    routeLabel: "creative_writing",
    complexity: "moderate",
  },
  {
    text: "create a detailed fantasy world with its own history, geography, and magic system",
    routeLabel: "creative_writing",
    complexity: "complex",
  },

  // ============================================================================
  // research (12 examples)
  // ============================================================================
  {
    text: "search for the latest developments in quantum computing in 2026",
    routeLabel: "research",
    complexity: "moderate",
  },
  {
    text: "find me recent reviews of the MacBook Pro M5",
    routeLabel: "research",
    complexity: "moderate",
  },
  {
    text: "what happened in the US elections today?",
    routeLabel: "research",
    complexity: "simple",
  },
  {
    text: "look up the current price of Bitcoin",
    routeLabel: "research",
    complexity: "simple",
  },
  {
    text: "research the best React state management libraries in 2026",
    routeLabel: "research",
    complexity: "moderate",
  },
  {
    text: "find recent scientific papers on mRNA vaccine long-term effects",
    routeLabel: "research",
    complexity: "complex",
  },
  {
    text: "what are the latest news about SpaceX Starship?",
    routeLabel: "research",
    complexity: "simple",
  },
  {
    text: "search for competitor pricing for project management tools",
    routeLabel: "research",
    complexity: "moderate",
  },
  {
    text: "find me the most cited papers on transformer architectures from 2025",
    routeLabel: "research",
    complexity: "moderate",
  },
  {
    text: "what's the current weather in Tokyo?",
    routeLabel: "research",
    complexity: "simple",
  },
  {
    text: "look up recent court rulings on AI copyright",
    routeLabel: "research",
    complexity: "moderate",
  },
  {
    text: "find the latest statistics on remote work adoption globally",
    routeLabel: "research",
    complexity: "moderate",
  },

  // ============================================================================
  // vision (10 examples)
  // ============================================================================
  {
    text: "what's in this image?",
    routeLabel: "vision",
    complexity: "simple",
  },
  {
    text: "describe this screenshot and identify any UI issues",
    routeLabel: "vision",
    complexity: "moderate",
  },
  {
    text: "read the text from this photo of a document",
    routeLabel: "vision",
    complexity: "moderate",
  },
  {
    text: "analyze this chart and explain the trends",
    routeLabel: "vision",
    complexity: "moderate",
  },
  {
    text: "what breed is this dog in the photo?",
    routeLabel: "vision",
    complexity: "simple",
  },
  {
    text: "compare these two images and spot the differences",
    routeLabel: "vision",
    complexity: "moderate",
  },
  {
    text: "transcribe the handwritten text in this image",
    routeLabel: "vision",
    complexity: "moderate",
  },
  {
    text: "analyze this architectural blueprint and identify potential issues",
    routeLabel: "vision",
    complexity: "complex",
  },
  {
    text: "extract the data from this table in the screenshot",
    routeLabel: "vision",
    complexity: "moderate",
  },
  {
    text: "what does this error message on my screen say?",
    routeLabel: "vision",
    complexity: "simple",
  },

  // ============================================================================
  // reasoning_complex (15 examples)
  // ============================================================================
  {
    text: "solve this differential equation: dy/dx = 3x^2 + 2xy",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "prove that the square root of 2 is irrational",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "design a distributed system architecture for a ride-sharing app that handles 10M requests/day",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "analyze this logic puzzle: five people sit in a row, each wearing a different color hat...",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "evaluate the trade-offs between microservices and monolith for a startup with 5 developers",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "what's the time complexity of this algorithm and can it be optimized?",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "derive the formula for the sum of an infinite geometric series",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "analyze the game theory behind the prisoner's dilemma with repeated interactions",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "should I take ibuprofen with my blood pressure medication?",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "evaluate whether I should accept this job offer considering these factors...",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "calculate the optimal portfolio allocation given these risk parameters and constraints",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "explain the P vs NP problem and why it matters",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "analyze the constitutional implications of this new regulation",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },
  {
    text: "work through this multi-step word problem: a train leaves station A...",
    routeLabel: "reasoning_complex",
    complexity: "moderate",
  },
  {
    text: "compare and contrast three different approaches to solving this optimization problem",
    routeLabel: "reasoning_complex",
    complexity: "complex",
  },

  // ============================================================================
  // fallback_default (5 examples - rare, ambiguous queries)
  // ============================================================================
  {
    text: "hmm",
    routeLabel: "fallback_default",
    complexity: "simple",
  },
  {
    text: "...",
    routeLabel: "fallback_default",
    complexity: "simple",
  },
  {
    text: "ok",
    routeLabel: "fallback_default",
    complexity: "simple",
  },
  {
    text: "test",
    routeLabel: "fallback_default",
    complexity: "simple",
  },
  {
    text: "asdfghjkl",
    routeLabel: "fallback_default",
    complexity: "simple",
  },
];
