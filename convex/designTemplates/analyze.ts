"use node";

import { generateText } from "ai";
import JSZip from "jszip";
import { v } from "convex/values";
import { getGatewayOptions } from "@/lib/ai/gateway";
import { TEMPLATE_ANALYSIS_MODEL } from "@/lib/ai/operational-models";
import { getModel } from "@/lib/ai/registry";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import {
  buildTemplateAnalysisPrompt,
  TEMPLATE_ANALYSIS_SYSTEM_PROMPT,
} from "../lib/prompts/operational/templateAnalysis";

/**
 * Extract images from a PPTX file (which is a ZIP archive).
 * Images are stored in ppt/media/ directory.
 */
async function extractPptxImages(
  pptxBuffer: ArrayBuffer,
): Promise<Array<{ data: string; mimeType: string; name: string }>> {
  const zip = await JSZip.loadAsync(pptxBuffer);
  const images: Array<{ data: string; mimeType: string; name: string }> = [];

  // PPTX stores images in ppt/media/
  const mediaFolder = zip.folder("ppt/media");
  if (!mediaFolder) {
    return images;
  }

  // Process each file in media folder
  const imageExtensions: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".svg": "image/svg+xml",
  };

  for (const [relativePath, file] of Object.entries(zip.files)) {
    if (!relativePath.startsWith("ppt/media/") || file.dir) continue;

    const ext = relativePath.substring(relativePath.lastIndexOf(".")).toLowerCase();
    const mimeType = imageExtensions[ext];

    if (mimeType) {
      const data = await file.async("base64");
      images.push({
        data,
        mimeType,
        name: relativePath.split("/").pop() || relativePath,
      });
    }
  }

  return images;
}

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
          // Extract images from PPTX using jszip
          console.log(`Extracting images from PPTX: ${file.name}`);
          const pptxImages = await extractPptxImages(arrayBuffer);

          if (pptxImages.length > 0) {
            console.log(`Extracted ${pptxImages.length} images from ${file.name}`);
            contentParts.push({
              type: "text",
              text: `\n[Images extracted from PowerPoint: ${file.name}]`,
            });

            for (const img of pptxImages) {
              contentParts.push({
                type: "image",
                image: `data:${img.mimeType};base64,${img.data}`,
              });
            }
          } else {
            // No images found, send as binary fallback
            console.log(`No images in PPTX ${file.name}, sending as binary`);
            contentParts.push({
              type: "file",
              data: base64,
              mediaType: file.mimeType,
              filename: file.name,
            });
          }
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
      } catch (_parseError) {
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
