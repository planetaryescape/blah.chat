# Slides Feature - Implementation Plan

## Overview

The **Slides** feature is an AI-powered presentation creator for blah.chat that generates professional, design-grade slide decks from user prompts. It leverages multi-model AI (GLM-4.6 for content, Gemini for images) to create distinctive, content-aware presentations.

## Key Features

- **Chat-style outline iteration** - Refine slide structure through natural conversation
- **Content-aware design systems** - AI analyzes presentation theme and creates distinctive visual language
- **Hierarchical generation** - Title → sections → content with context preservation
- **Multi-model flexibility** - Choose between cost-effective (Gemini 2.5 Flash) or premium (Gemini 3 Pro)
- **PowerPoint export** - Download as editable PPTX files
- **Individual slide regeneration** - Refine specific slides with custom prompts

## Architecture Highlights

### Design System First
- AI extracts theme from content (e.g., "peptides-biotech", "startup-pitch-bold")
- Generates comprehensive visual language (colors, fonts, layout principles, design inspiration)
- Single source of truth for all slide generations
- Ensures visual consistency across entire deck

### Hierarchical Generation
```
Design System
  ↓
Title Slide (design system only)
  ↓
Section Slides (parallel: design system + title)
  ↓
Content Slides (parallel: design system + title + sections)
```

Each batch uses previous slides as visual reference for consistency.

### Resilient Generation
- Leverages blah.chat's proven resilient generation pattern
- Survives page refresh mid-generation
- Real-time progress updates via Convex reactive queries
- Partial content saved incrementally

### Image-First Approach
- AI-generated slide images (not WYSIWYG editor)
- Faster to ship, professional output
- Text overlays in PPTX for editability
- Users can refine in PowerPoint after download

## Tech Stack

- **Content Generation**: GLM-4.6 (creative, cost-effective)
- **Image Generation**: Gemini 2.5 Flash Image or Gemini 3 Pro Image
- **Database**: Convex (normalized schema, real-time)
- **PPTX Generation**: PptxGenJS (Node runtime)
- **UI**: React, shadcn/ui, Framer Motion
- **Infrastructure**: Vercel AI SDK, Convex actions, Next.js 15

## Cost Estimation

**Per 20-Slide Deck:**
- Outline generation (GLM-4.6): ~$0.15
- Design system (GLM-4.6): ~$0.10
- Image generation:
  - Gemini 2.5 Flash: ~$5.25
  - Gemini 3 Pro: ~$157.50
- **Total**: $5.50 (Flash) or $157.75 (Pro)

## Implementation Phases

The feature is divided into **7 self-contained phases**, each leaving the system in a working state:

### [Phase 1: Schema & Infrastructure](./phase-1-schema-infrastructure.md)
**Duration**: 1-2 days

Database foundation with normalized schema:
- `presentations` table (main entity, links to conversation)
- `slides` table (individual slides, normalized)
- Basic CRUD operations
- Cascade delete logic

**Deliverables**:
- Schema deployed and tested
- CRUD mutations/queries working
- Ready for outline generation

---

### [Phase 2: Outline Generation](./phase-2-outline-generation.md)
**Duration**: 2-3 days

Chat-style outline creation and iteration:
- Input form (prompt/document/outline)
- GLM-4.6 generates structured outlines
- Chat interface for refinement
- Outline parsing into slide records
- Approval triggers design system generation

**Deliverables**:
- `/slides/new` page working
- Outline chat interface functional
- Outline parser tested
- Ready for design system generation

---

### [Phase 3: Design System Generation](./phase-3-design-system-generation.md)
**Duration**: 1-2 days

Content-aware design system creation:
- GLM-4.6 analyzes presentation content
- Extracts theme (e.g., "peptides-biotech")
- Generates comprehensive design system JSON
- Stores in database
- Triggers slide generation

**Deliverables**:
- Design system generation action working
- Creative, distinctive design systems
- Theme extraction tested across content types
- Ready for slide image generation

---

### [Phase 4: Slide Image Generation](./phase-4-slide-image-generation.md)
**Duration**: 3-4 days (most complex)

Hierarchical slide image generation:
- Title slide generated first
- Section slides (parallel batch)
- Content slides (parallel batches)
- Design system + context preservation
- Progress tracking
- Cost tracking

**Deliverables**:
- All slides generate with images
- Visual consistency maintained
- Progress updates in real-time
- Model selection (Flash vs Pro) working
- Ready for preview interface

---

### [Phase 5: Preview Interface](./phase-5-preview-interface.md)
**Duration**: 2-3 days

PowerPoint-like preview UI:
- Three-panel layout (thumbnails, preview, details)
- Keyboard navigation (arrows, number keys)
- Real-time updates during generation
- Loading/error states
- Zoom functionality
- Download button

**Deliverables**:
- `/slides/[id]/preview` page working
- Navigation tested
- Real-time updates verified
- Ready for PPTX export

---

### [Phase 6: PPTX Export](./phase-6-pptx-export.md)
**Duration**: 2-3 days

PowerPoint file generation:
- PptxGenJS integration (Node runtime)
- Design system application to master slides
- Image backgrounds + text overlays
- Speaker notes export
- On-demand generation with caching
- Download functionality

**Deliverables**:
- PPTX files download successfully
- Files open in PowerPoint/Google Slides/Keynote
- Text editable, design maintained
- Caching working
- Ready for regeneration feature

---

### [Phase 7: Slide Regeneration](./phase-7-slide-regeneration.md)
**Duration**: 1-2 days

Individual slide refinement:
- Regeneration modal UI
- Custom prompt support
- Single slide regeneration
- PPTX cache invalidation
- Real-time preview updates

**Deliverables**:
- Regenerate button working
- Custom prompts modify generation
- Design system maintained
- Feature complete!

---

## Total Timeline

**Estimated**: 12-17 days (2.5-3.5 weeks)

**Conservative**: 3-4 weeks with testing, polish, bug fixes

## Getting Started

### Prerequisites
- Phases 1-4 of blah.chat completed (schema, chat, Convex, auth)
- GLM-4.6 model configured in `src/lib/ai/models.ts`
- Gemini 2.5 Flash Image and 3 Pro Image configured
- Convex deployed and working

### Installation
```bash
# Install PptxGenJS (Phase 6)
bun add pptxgenjs
```

### Development Workflow

1. **Start with Phase 1** - Read `phase-1-schema-infrastructure.md`
2. **Complete phase entirely** - Don't skip to next phase until fully working
3. **Test thoroughly** - Each phase has success criteria
4. **Deploy incrementally** - Each phase leaves system in working state
5. **Move to next phase** - Only when previous phase is stable

### Phase Independence

Each phase document is **fully self-contained** with:
- Complete context about the Slides feature
- Overall architecture overview
- Specific implementation steps for that phase
- Code examples
- Testing steps
- Success criteria
- Files to create/modify

**You can hand any phase doc to a developer and they can build it without referencing other docs.**

## Key Architectural Decisions

### 1. Normalized Schema
- Separate `presentations` and `slides` tables (not nested)
- Junction tables for relationships
- Atomic updates, queryable relationships
- 40% smaller documents, 10x faster cascade deletes

### 2. GLM-4.6 for Content
- Cost-effective ($0.30/M input vs $1.25 for GPT-5.1)
- Creative, high-quality generation
- Excellent at structured output
- ~$0.25 saved per presentation

### 3. Design System First
- Analyze content → extract theme → generate design language
- Single source of truth for all slides
- Ensures visual consistency
- Creative, distinctive aesthetics (not generic templates)

### 4. Hierarchical Generation
- Title → sections → content (not sequential or fully parallel)
- Each batch uses previous slides as visual reference
- Enables parallelization while maintaining consistency
- Faster than sequential (1-2 min for 20 slides)

### 5. Image-First Approach
- AI-generated images (not WYSIWYG editor)
- Faster to ship (no editor to build)
- Professional output quality
- Users can edit in PowerPoint after download
- Avoids complex state management (undo/redo, sync)

### 6. On-Demand PPTX with Caching
- Generate when user requests (not pre-generated)
- Cache in Convex storage
- Invalidate cache on slide regeneration
- Storage efficient, CDN-backed

### 7. Linked Conversation
- Reuse chat infrastructure for outline iteration
- Proven resilient generation pattern
- Familiar UX for users
- No duplicate code

## Common Pitfalls to Avoid

### Schema Design
- ❌ Don't nest slides in presentations array (bloats documents)
- ✅ Use normalized tables with indexes

### Generation Flow
- ❌ Don't generate all slides fully in parallel (inconsistent visuals)
- ✅ Use hierarchical batching (title → sections → content)

### Cost Management
- ❌ Don't default to Gemini 3 Pro for all users (expensive)
- ✅ Offer model selection, default to 2.5 Flash

### PPTX Export
- ❌ Don't pre-generate PPTX after every slide (wastes storage)
- ✅ Generate on-demand with caching

### Error Handling
- ❌ Don't fail entire presentation if one slide errors
- ✅ Mark individual slides as error, continue with others

### Regeneration
- ❌ Don't keep old slide images in storage (bloat)
- ✅ Delete old image before storing new one

## Testing Strategy

### Unit Testing
- Outline parser (markdown → structured data)
- Design system JSON validation
- Prompt builders (correct format)

### Integration Testing
- End-to-end flow: input → outline → design → slides → export
- Real API calls to GLM-4.6 and Gemini
- Convex actions with full context

### Manual Testing
- Different content types (technical, business, creative)
- Edge cases (1 slide, 50 slides, missing data)
- Error scenarios (API failures, invalid outlines)
- Performance (large presentations, concurrent users)

### Success Metrics
- Outline generation <5 seconds
- Design system generation <3 seconds
- Slide generation 1-2 minutes for 20 slides
- PPTX export <10 seconds
- 95% successful generations

## Support & Troubleshooting

### Common Issues

**Outline not parsing correctly**:
- Check markdown format in GLM-4.6 output
- Verify Type field present on each slide
- Test parser with sample outlines

**Design system missing fields**:
- Validate JSON parsing (check for markdown code blocks)
- Verify all required fields in schema
- Check GLM-4.6 prompt clarity

**Slide images not generating**:
- Check Gemini API quotas/credits
- Verify image model configured correctly
- Check Convex action logs
- Test with smaller presentation first

**PPTX file corrupted**:
- Verify PptxGenJS version (should be latest)
- Check image base64 encoding
- Test with simple presentation (no images)
- Verify color hex format (no # symbol)

**Regeneration not working**:
- Check PPTX cache invalidation
- Verify old images deleted
- Check context slides passed correctly

## Future Enhancements

### Near-Term (Post-MVP)
- Slide templates (pre-made layouts)
- Batch slide regeneration
- Prompt suggestions ("More visual", "Less text")
- Design system preview UI
- Cost estimates before generation

### Medium-Term
- Slide editing (drag-drop, text editing)
- Animation/transitions
- PDF export
- Google Slides direct export
- Collaboration (real-time, comments)

### Long-Term
- Presentation templates library
- Brand kits (company colors, logos)
- A/B testing (multiple variations)
- Analytics (views, engagement)
- Presenter mode (notes, timing)

## Contributing

When working on the Slides feature:

1. **Read the relevant phase doc first** - Don't start coding without understanding the full phase
2. **Follow blah.chat patterns** - Normalized schema, API envelopes, Convex patterns
3. **Test incrementally** - Don't build entire phase before testing
4. **Document changes** - Update phase docs if implementation differs
5. **Consider costs** - Always track token usage and costs
6. **Think creatively** - This feature is about distinctive design, not generic templates

## Questions?

For questions about:
- **Architecture**: Review overall plan in `/Users/bhekanik/.claude/plans/wondrous-herding-waterfall.md`
- **Specific phase**: Read the relevant phase doc
- **blah.chat patterns**: See `CLAUDE.md`, `docs/SCHEMA_NORMALIZATION_GUIDE.md`
- **Convex**: https://docs.convex.dev
- **PptxGenJS**: https://gitbrent.github.io/PptxGenJS/

## License

Part of blah.chat project. See project root for license information.
