"use node";

import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";

interface Slide {
  _id: string;
  title: string;
  content: string;
  slideType: "title" | "section" | "content";
  position: number;
}

interface Presentation {
  _id: string;
  imageModel: string;
  designSystem: unknown;
  slideStyle?: "wordy" | "illustrative";
  templateId?: string;
  aspectRatio?: "16:9" | "1:1" | "9:16";
  imageStyle?: string;
}

interface DesignTemplate {
  logoStorageId?: string;
  extractedDesign?: {
    logoGuidelines?: {
      position: string;
      size: string;
    };
  };
}

const BATCH_SIZE = 10;

// Helper to check if generation was stopped
async function checkIfStopped(
  ctx: any,
  presentationId: string,
): Promise<boolean> {
  const current = (await (ctx.runQuery as any)(
    // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
    internal.presentations.internal.getPresentationInternal,
    { presentationId },
  )) as { status: string } | null;

  return current?.status === "stopped";
}

export const generateSlides = internalAction({
  args: { presentationId: v.id("presentations") },
  handler: async (ctx, args) => {
    try {
      const presentation = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getPresentationInternal,
        { presentationId: args.presentationId },
      )) as Presentation | null;

      if (!presentation) {
        throw new Error("Presentation not found");
      }

      if (!presentation.designSystem) {
        throw new Error("Design system not found - run Phase 3 first");
      }

      const slideStyle = presentation.slideStyle ?? "illustrative";
      const isTemplateBased = !!presentation.templateId;
      const aspectRatio = presentation.aspectRatio ?? "16:9";
      const imageStyle = presentation.imageStyle;

      // Fetch logo data from template if available
      let logoStorageId: string | undefined;
      let logoGuidelines: { position: string; size: string } | undefined;

      if (presentation.templateId) {
        const template = (await (ctx.runQuery as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.designTemplates.getInternal,
          { templateId: presentation.templateId },
        )) as DesignTemplate | null;

        if (template) {
          logoStorageId = template.logoStorageId;
          logoGuidelines = template.extractedDesign?.logoGuidelines;
          if (logoStorageId) {
            console.log(
              `Logo found in template, position: ${logoGuidelines?.position ?? "default"}`,
            );
          }
        }
      }

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateStatusInternal,
        { presentationId: args.presentationId, status: "slides_generating" },
      );

      const allSlides = (await (ctx.runQuery as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.getSlidesWithIdsInternal,
        { presentationId: args.presentationId },
      )) as Slide[];

      if (allSlides.length === 0) {
        throw new Error("No slides found");
      }

      const titleSlides = allSlides.filter((s) => s.slideType === "title");
      const sectionSlides = allSlides.filter((s) => s.slideType === "section");
      const contentSlides = allSlides.filter((s) => s.slideType === "content");

      console.log(
        `Generating ${allSlides.length} slides: ${titleSlides.length} title, ${sectionSlides.length} section, ${contentSlides.length} content`,
      );

      // BATCH 1: Title slide (no context)
      if (titleSlides.length > 0) {
        console.log("Batch 1: Generating title slide...");
        const titleSlide = titleSlides[0];

        try {
          await (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.generation.slideImage.generateSlideImage,
            {
              slideId: titleSlide._id,
              modelId: presentation.imageModel,
              designSystem: presentation.designSystem,
              contextSlides: [],
              slideStyle,
              isTemplateBased,
              logoStorageId,
              logoGuidelines,
              aspectRatio,
              imageStyle,
            },
          );
          console.log("Title slide complete");
        } catch (error) {
          console.warn("Title slide failed, continuing...", error);
        }

        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.presentations.incrementProgressInternal,
          { presentationId: args.presentationId },
        );

        // Check if stopped after title slide
        if (await checkIfStopped(ctx, args.presentationId)) {
          console.log("Generation stopped by user after title slide");
          return { success: false, stopped: true };
        }
      }

      // BATCH 2: Section slides (parallel, context: title)
      if (sectionSlides.length > 0) {
        console.log(
          `Batch 2: Generating ${sectionSlides.length} section slides in parallel...`,
        );

        const titleContext =
          titleSlides.length > 0
            ? [{ type: "title", title: titleSlides[0].title }]
            : [];

        const sectionPromises = sectionSlides.map((slide) =>
          (ctx.runAction as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.generation.slideImage.generateSlideImage,
            {
              slideId: slide._id,
              modelId: presentation.imageModel,
              designSystem: presentation.designSystem,
              contextSlides: titleContext,
              slideStyle,
              isTemplateBased,
              logoStorageId,
              logoGuidelines,
              aspectRatio,
              imageStyle,
            },
          ),
        );

        const sectionResults = await Promise.allSettled(sectionPromises);
        const sectionFailures = sectionResults.filter(
          (r) => r.status === "rejected",
        );
        if (sectionFailures.length > 0) {
          console.warn(
            `${sectionFailures.length}/${sectionSlides.length} section slides failed, continuing...`,
          );
        }

        // Increment progress for all attempted slides (not just successful ones)
        for (let i = 0; i < sectionSlides.length; i++) {
          await (ctx.runMutation as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.presentations.incrementProgressInternal,
            { presentationId: args.presentationId },
          );
        }

        console.log("Section slides complete");

        // Check if stopped after section slides
        if (await checkIfStopped(ctx, args.presentationId)) {
          console.log("Generation stopped by user after section slides");
          return { success: false, stopped: true };
        }
      }

      // BATCH 3: Content slides (parallel with sub-batching)
      if (contentSlides.length > 0) {
        console.log(
          `Batch 3: Generating ${contentSlides.length} content slides...`,
        );

        // Context: title + first 3 sections
        const contentContext = [
          ...titleSlides
            .slice(0, 1)
            .map((s) => ({ type: "title", title: s.title })),
          ...sectionSlides
            .slice(0, 3)
            .map((s) => ({ type: "section", title: s.title })),
        ];

        // Sub-batch to respect Convex concurrency limits
        const batches: Slide[][] = [];
        for (let i = 0; i < contentSlides.length; i += BATCH_SIZE) {
          batches.push(contentSlides.slice(i, i + BATCH_SIZE));
        }

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          console.log(
            `  Sub-batch ${batchIndex + 1}/${batches.length}: ${batch.length} slides`,
          );

          const batchPromises = batch.map((slide) =>
            (ctx.runAction as any)(
              // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
              internal.generation.slideImage.generateSlideImage,
              {
                slideId: slide._id,
                modelId: presentation.imageModel,
                designSystem: presentation.designSystem,
                contextSlides: contentContext,
                slideStyle,
                isTemplateBased,
                logoStorageId,
                logoGuidelines,
                aspectRatio,
                imageStyle,
              },
            ),
          );

          const batchResults = await Promise.allSettled(batchPromises);
          const batchFailures = batchResults.filter(
            (r) => r.status === "rejected",
          );
          if (batchFailures.length > 0) {
            console.warn(
              `${batchFailures.length}/${batch.length} content slides failed in batch ${batchIndex + 1}, continuing...`,
            );
          }

          // Increment progress for all attempted slides
          for (let i = 0; i < batch.length; i++) {
            await (ctx.runMutation as any)(
              // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
              internal.presentations.incrementProgressInternal,
              { presentationId: args.presentationId },
            );
          }

          // Check if stopped after each sub-batch
          if (await checkIfStopped(ctx, args.presentationId)) {
            console.log(
              `Generation stopped by user after content sub-batch ${batchIndex + 1}`,
            );
            return { success: false, stopped: true };
          }
        }

        console.log("Content slides complete");
      }

      // Check if all slides completed successfully and update status accordingly
      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.checkAndCompletePresentation,
        { presentationId: args.presentationId },
      );

      console.log(`Presentation ${args.presentationId} generation attempted!`);

      return { success: true };
    } catch (error) {
      console.error("Slide generation orchestration error:", error);

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateStatusInternal,
        { presentationId: args.presentationId, status: "error" },
      );

      throw error;
    }
  },
});
