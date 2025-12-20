"use node";

import PptxGenJS from "pptxgenjs";
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

interface SlideData {
  _id: string;
  position: number;
  slideType: "title" | "section" | "content";
  title: string;
  content: string;
  speakerNotes?: string;
  imageStorageId?: string;
  hasEmbeddedText?: boolean;
}

interface DesignSystem {
  theme: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  fontPairings: {
    heading: string;
    body: string;
  };
}

interface PresentationData {
  _id: string;
  title: string;
  status: string;
  designSystem?: DesignSystem;
}

export const generatePPTX = internalAction({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    try {
      console.log(
        `[PPTX Export] Starting generation for ${args.presentationId}`,
      );

      // Fetch presentation
      const presentation = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getPresentationInternal,
        { presentationId: args.presentationId },
      )) as PresentationData | null;

      if (!presentation) {
        throw new Error("Presentation not found");
      }

      if (presentation.status !== "slides_complete") {
        throw new Error("Slides not fully generated yet");
      }

      // Fetch all slides
      const slides = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getSlidesInternal,
        { presentationId: args.presentationId },
      )) as SlideData[];

      if (slides.length === 0) {
        throw new Error("No slides found");
      }

      console.log(`[PPTX Export] Found ${slides.length} slides`);
      console.log(
        `[PPTX Export] Slides with images: ${slides.filter((s) => s.imageStorageId).length}`,
      );

      // Initialize PptxGenJS
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      pptx.author = "blah.chat";
      pptx.title = presentation.title;
      pptx.subject = "AI-Generated Presentation";

      // Design system
      const ds = presentation.designSystem;

      // Define Master Slide (template)
      if (ds) {
        pptx.defineSlideMaster({
          title: "MASTER",
          background: { color: ds.backgroundColor.replace("#", "") },
          objects: [
            // Footer with blah.chat branding
            {
              text: {
                text: "Created with blah.chat",
                options: {
                  x: 0.5,
                  y: 6.8,
                  w: 9,
                  h: 0.3,
                  fontSize: 10,
                  color: ds.primaryColor.replace("#", ""),
                  align: "left",
                  valign: "bottom",
                },
              },
            },
          ],
        });
      }

      // Sort slides by position
      const sortedSlides = [...slides].sort((a, b) => a.position - b.position);

      // Add each slide
      for (const slideData of sortedSlides) {
        const slide = pptx.addSlide({ masterName: ds ? "MASTER" : undefined });

        // ===== BACKGROUND IMAGE =====
        if (slideData.imageStorageId) {
          try {
            // Get image URL from storage
            const imageUrl = await ctx.storage.getUrl(slideData.imageStorageId);

            if (imageUrl) {
              // Fetch image data
              const imageResponse = await fetch(imageUrl);
              const imageArrayBuffer = await imageResponse.arrayBuffer();
              const imageBase64 =
                Buffer.from(imageArrayBuffer).toString("base64");

              // Add as background
              slide.background = {
                data: `data:image/png;base64,${imageBase64}`,
              };
              console.log(
                `[PPTX Export] Added background image for slide ${slideData.position}`,
              );
            }
          } catch (error) {
            console.error(
              `[PPTX Export] Failed to add background for slide ${slideData.position}:`,
              error,
            );
            // Continue without background
          }
        } else {
          console.log(
            `[PPTX Export] No imageStorageId for slide ${slideData.position}`,
          );
        }

        // ===== SPEAKER NOTES =====
        if (slideData.speakerNotes) {
          slide.addNotes(slideData.speakerNotes);
        }
      }

      // ===== GENERATE PPTX BUFFER =====
      console.log("[PPTX Export] Generating PPTX buffer...");
      const pptxBuffer = (await pptx.write({
        outputType: "nodebuffer",
      })) as Buffer;

      // ===== STORE IN CONVEX STORAGE =====
      console.log("[PPTX Export] Storing PPTX in Convex storage...");
      const blob = new Blob([new Uint8Array(pptxBuffer)], {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      });

      const storageId = await ctx.storage.store(blob);

      // ===== UPDATE PRESENTATION =====
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updatePptxInternal,
        {
          presentationId: args.presentationId,
          pptxStorageId: storageId,
        },
      );

      console.log(`[PPTX Export] Successfully generated PPTX: ${storageId}`);

      return { success: true, storageId };
    } catch (error) {
      console.error("[PPTX Export] Generation error:", error);
      throw error;
    }
  },
});
