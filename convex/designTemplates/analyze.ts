"use node";

import { generateText } from "ai";
import { v } from "convex/values";
import { getModel } from "@/lib/ai/registry";
import { getGatewayOptions } from "../../src/lib/ai/gateway";
import { TEMPLATE_ANALYSIS_MODEL } from "../../src/lib/ai/operational-models";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
  TEMPLATE_ANALYSIS_SYSTEM_PROMPT,
  buildTemplateAnalysisPrompt,
} from "../lib/prompts/operational/templateAnalysis";

interface SourceFile {
  storageId: string;
  name: string;
  mimeType: string;
  type: "pdf" | "pptx" | "image";
}

interface ExtractedDesign {
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
    fallbackHeading?: string;
    fallbackBody?: string;
  };
  logoGuidelines?: {
    position: string;
    size: string;
    description?: string;
  };
  layoutPatterns: string[];
  visualStyle: string;
  iconStyle?: string;
  analysisNotes: string;
}

/**
 * Analyze uploaded template files to extract design constraints.
 * Uses Claude 4.5 Sonnet with vision to analyze PDFs, images, and extracted PPTX images.
 */
export const analyzeTemplate = internalAction({
  args: { templateId: v.id("designTemplates") },
  handler: async (ctx, args) => {
    try {
      // Update status to processing
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.designTemplates.updateStatusInternal,
        { templateId: args.templateId, status: "processing" },
      );

      // Get template record
      const template = await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.designTemplates.getInternal,
        { templateId: args.templateId },
      );

      if (!template) {
        throw new Error("Template not found");
      }

      const sourceFiles = template.sourceFiles as SourceFile[];
      if (sourceFiles.length === 0) {
        throw new Error("No source files found");
      }

      // Build content parts for multimodal analysis
      const contentParts: Array<
        | { type: "text"; text: string }
        | { type: "image"; image: string }
        | { type: "file"; data: string; mediaType: string; filename?: string }
      > = [];

      // Add the analysis prompt
      contentParts.push({
        type: "text",
        text: buildTemplateAnalysisPrompt(sourceFiles.length),
      });

      // Process each source file
      for (const file of sourceFiles) {
        const url = await ctx.storage.getUrl(file.storageId as any);
        if (!url) {
          console.warn(`Could not get URL for file: ${file.name}`);
          continue;
        }

        // Fetch file data
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");

        if (file.type === "image") {
          // Images sent directly
          contentParts.push({
            type: "image",
            image: `data:${file.mimeType};base64,${base64}`,
          });
        } else if (file.type === "pdf") {
          // PDFs sent as file type
          contentParts.push({
            type: "file",
            data: base64,
            mediaType: file.mimeType,
            filename: file.name,
          });
        } else if (file.type === "pptx") {
          // For PPTX, we need to extract images
          // TODO: Implement PPTX extraction using jszip
          // For now, we'll try sending as-is and see if Claude can handle it
          // If not, we'll need to add image extraction
          console.log(
            `PPTX file detected: ${file.name}. Sending as binary for analysis.`,
          );
          contentParts.push({
            type: "file",
            data: base64,
            mediaType: file.mimeType,
            filename: file.name,
          });
        }
      }

      // Call Claude with vision capabilities
      const result = await generateText({
        model: getModel(TEMPLATE_ANALYSIS_MODEL.id),
        system: TEMPLATE_ANALYSIS_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: contentParts,
          },
        ],
        providerOptions: getGatewayOptions(
          TEMPLATE_ANALYSIS_MODEL.id,
          undefined,
          ["template-analysis"],
        ),
      });

      // Parse the JSON response
      let extractedDesign: ExtractedDesign;
      try {
        const responseText = result.text.trim();
        // Handle potential markdown code blocks
        const jsonMatch = responseText.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
        const jsonText = jsonMatch ? jsonMatch[1].trim() : responseText;
        extractedDesign = JSON.parse(jsonText);
      } catch (parseError) {
        console.error("Failed to parse template analysis:", result.text);
        throw new Error("Invalid JSON response from template analysis");
      }

      // Validate required fields
      if (!extractedDesign.colors || !extractedDesign.fonts) {
        throw new Error("Missing required fields in extracted design");
      }

      // Save extracted design
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.designTemplates.saveExtractedDesignInternal,
        {
          templateId: args.templateId,
          extractedDesign,
        },
      );

      return { success: true, design: extractedDesign };
    } catch (error) {
      console.error("Template analysis failed:", error);

      // Update status to error
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.designTemplates.updateStatusInternal,
        {
          templateId: args.templateId,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        },
      );

      throw error;
    }
  },
});
