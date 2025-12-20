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
}

const BATCH_SIZE = 10;

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
          },
        );

        await (ctx.runMutation as any)(
          // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
          internal.presentations.incrementProgressInternal,
          { presentationId: args.presentationId },
        );

        console.log("Title slide complete");
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
            },
          ),
        );

        await Promise.all(sectionPromises);

        for (let i = 0; i < sectionSlides.length; i++) {
          await (ctx.runMutation as any)(
            // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
            internal.presentations.incrementProgressInternal,
            { presentationId: args.presentationId },
          );
        }

        console.log("Section slides complete");
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
              },
            ),
          );

          await Promise.all(batchPromises);

          for (let i = 0; i < batch.length; i++) {
            await (ctx.runMutation as any)(
              // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
              internal.presentations.incrementProgressInternal,
              { presentationId: args.presentationId },
            );
          }
        }

        console.log("Content slides complete");
      }

      await (ctx.runMutation as any)(
        // @ts-ignore - TypeScript recursion limit with 94+ Convex modules
        internal.presentations.updateStatusInternal,
        { presentationId: args.presentationId, status: "slides_complete" },
      );

      console.log(`Presentation ${args.presentationId} generation complete!`);

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
