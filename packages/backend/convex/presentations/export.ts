"use node";

import { v } from "convex/values";
import JSZip from "jszip";
import { PDFDocument } from "pdf-lib";
import PptxGenJS from "pptxgenjs";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { logger } from "../lib/logger";

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
      logger.info("Starting PPTX generation", {
        tag: "PPTX Export",
        presentationId: args.presentationId,
      });

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

      logger.info("Found slides for PPTX", {
        tag: "PPTX Export",
        slideCount: slides.length,
        slidesWithImages: slides.filter((s) => s.imageStorageId).length,
      });

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
              logger.info("Added background image for slide", {
                tag: "PPTX Export",
                position: slideData.position,
              });
            }
          } catch (error) {
            logger.error("Failed to add background for slide", {
              tag: "PPTX Export",
              position: slideData.position,
              error: String(error),
            });
            // Continue without background
          }
        } else {
          logger.info("No imageStorageId for slide", {
            tag: "PPTX Export",
            position: slideData.position,
          });
        }

        // ===== SPEAKER NOTES =====
        if (slideData.speakerNotes) {
          slide.addNotes(slideData.speakerNotes);
        }
      }

      // ===== GENERATE PPTX BUFFER =====
      logger.info("Generating PPTX buffer", { tag: "PPTX Export" });
      const pptxBuffer = (await pptx.write({
        outputType: "nodebuffer",
      })) as Buffer;

      // ===== STORE IN CONVEX STORAGE =====
      logger.info("Storing PPTX in Convex storage", { tag: "PPTX Export" });
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

      logger.info("Successfully generated PPTX", {
        tag: "PPTX Export",
        storageId,
      });

      return { success: true, storageId };
    } catch (error) {
      logger.error("PPTX generation error", {
        tag: "PPTX Export",
        error: String(error),
      });
      throw error;
    }
  },
});

// PDF page dimensions for different aspect ratios (in points, 72 points = 1 inch)
// Using standard slide dimensions scaled to PDF
const PDF_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "16:9": { width: 1920 * 0.5, height: 1080 * 0.5 }, // 960x540 points
  "1:1": { width: 1080 * 0.5, height: 1080 * 0.5 }, // 540x540 points
  "9:16": { width: 1080 * 0.5, height: 1920 * 0.5 }, // 540x960 points
};

export const generatePDF = internalAction({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    try {
      logger.info("Starting PDF generation", {
        tag: "PDF Export",
        presentationId: args.presentationId,
      });

      // Fetch presentation
      const presentation = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getPresentationInternal,
        { presentationId: args.presentationId },
      )) as (PresentationData & { aspectRatio?: string }) | null;

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

      logger.info("Found slides for PDF", {
        tag: "PDF Export",
        slideCount: slides.length,
      });

      // Get page dimensions based on aspect ratio
      const aspectRatio = presentation.aspectRatio || "16:9";
      const dims = PDF_DIMENSIONS[aspectRatio] || PDF_DIMENSIONS["16:9"];

      // Initialize pdf-lib document
      const pdfDoc = await PDFDocument.create();

      // Sort slides by position
      const sortedSlides = [...slides].sort((a, b) => a.position - b.position);

      // Add each slide as a page
      for (const slideData of sortedSlides) {
        if (slideData.imageStorageId) {
          try {
            // Get image URL from storage
            const imageUrl = await ctx.storage.getUrl(slideData.imageStorageId);

            if (imageUrl) {
              // Fetch image data
              const imageResponse = await fetch(imageUrl);
              const imageBytes = new Uint8Array(
                await imageResponse.arrayBuffer(),
              );

              // Embed image (detect format from magic bytes)
              let image;
              if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50) {
                // PNG
                image = await pdfDoc.embedPng(imageBytes);
              } else {
                // Assume JPEG
                image = await pdfDoc.embedJpg(imageBytes);
              }

              // Add page with dimensions matching the image's aspect ratio
              const page = pdfDoc.addPage([dims.width, dims.height]);

              // Draw image to fill the page
              page.drawImage(image, {
                x: 0,
                y: 0,
                width: dims.width,
                height: dims.height,
              });

              logger.info("Added image for slide", {
                tag: "PDF Export",
                position: slideData.position,
              });
            }
          } catch (error) {
            logger.error("Failed to add image for slide", {
              tag: "PDF Export",
              position: slideData.position,
              error: String(error),
            });
            // Add blank page on error
            pdfDoc.addPage([dims.width, dims.height]);
          }
        } else {
          // Add blank page for slides without images
          pdfDoc.addPage([dims.width, dims.height]);
        }
      }

      // Generate PDF buffer
      logger.info("Generating PDF buffer", { tag: "PDF Export" });
      const pdfBytes = await pdfDoc.save();

      // Store in Convex storage
      logger.info("Storing PDF in Convex storage", { tag: "PDF Export" });
      const blob = new Blob([new Uint8Array(pdfBytes)], {
        type: "application/pdf",
      });

      const storageId = await ctx.storage.store(blob);

      // Update presentation with PDF storage ID
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updatePdfInternal,
        {
          presentationId: args.presentationId,
          pdfStorageId: storageId,
        },
      );

      logger.info("Successfully generated PDF", {
        tag: "PDF Export",
        storageId,
      });

      return { success: true, storageId };
    } catch (error) {
      logger.error("PDF generation error", {
        tag: "PDF Export",
        error: String(error),
      });
      throw error;
    }
  },
});

export const generateImagesZip = internalAction({
  args: {
    presentationId: v.id("presentations"),
  },
  handler: async (ctx, args) => {
    try {
      logger.info("Starting ZIP generation", {
        tag: "ZIP Export",
        presentationId: args.presentationId,
      });

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

      logger.info("Found slides for ZIP", {
        tag: "ZIP Export",
        slideCount: slides.length,
      });

      // Sort slides by position
      const sortedSlides = [...slides].sort((a, b) => a.position - b.position);

      // Create ZIP using JSZip
      const zip = new JSZip();

      // Add each slide image to the archive
      for (const slideData of sortedSlides) {
        if (slideData.imageStorageId) {
          try {
            // Get image URL from storage
            const imageUrl = await ctx.storage.getUrl(slideData.imageStorageId);

            if (imageUrl) {
              // Fetch image data
              const imageResponse = await fetch(imageUrl);
              const imageData = new Uint8Array(
                await imageResponse.arrayBuffer(),
              );

              // Add to archive with numbered filename
              const filename = `slide-${String(slideData.position + 1).padStart(2, "0")}.png`;
              zip.file(filename, imageData);

              logger.info("Added file to ZIP", {
                tag: "ZIP Export",
                filename,
              });
            }
          } catch (error) {
            logger.error("Failed to add slide to ZIP", {
              tag: "ZIP Export",
              position: slideData.position,
              error: String(error),
            });
          }
        }
      }

      // Generate ZIP buffer
      const zipData = await zip.generateAsync({
        type: "uint8array",
        compression: "DEFLATE",
      });

      logger.info("Generated ZIP buffer", {
        tag: "ZIP Export",
        bytes: zipData.length,
      });

      // Store in Convex storage
      logger.info("Storing ZIP in Convex storage", { tag: "ZIP Export" });
      const blob = new Blob([new Uint8Array(zipData)], {
        type: "application/zip",
      });

      const storageId = await ctx.storage.store(blob);

      // Update presentation with ZIP storage ID
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateImagesZipInternal,
        {
          presentationId: args.presentationId,
          imagesZipStorageId: storageId,
        },
      );

      logger.info("Successfully generated ZIP", {
        tag: "ZIP Export",
        storageId,
      });

      return { success: true, storageId };
    } catch (error) {
      logger.error("ZIP generation error", {
        tag: "ZIP Export",
        error: String(error),
      });
      throw error;
    }
  },
});
