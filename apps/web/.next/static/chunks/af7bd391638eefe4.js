(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,319432,e=>{"use strict";var t=e.i(379492),a=e.i(283164);let s=`You are a professional presentation designer. Generate slide outlines in this structured format:

# TITLE SLIDE
Title: [Main Title - concise, impactful]
Subtitle: [Supporting subtitle or tagline]
Visual: [Describe the background image/visual - mood, style, colors, specific elements to generate]
Type: title

# SECTION: [Section Name]
Title: [Section Title]
Visual: [Describe transitional visual - abstract, thematic, or symbolic imagery]
Type: section

# Slide N: [Slide Title]
- [Bullet point 1]
- [Bullet point 2]
- [Bullet point 3]
Visual: [Describe supporting imagery - what should the AI-generated image show, mood, style]
Type: content
Speaker Notes: [Notes for presenter]

SLIDE STYLE (pay close attention to the user's chosen style):

**illustrative (Speaker Assist)**:
- Slides should be VISUAL with MINIMAL text (3-5 words per bullet MAX).
- Speaker Notes should be DETAILED and COMPREHENSIVE - include all talking points, data, context, and transitions.
- Think: slides are prompts for the speaker, notes are the full script.

**wordy (Self-Contained)**:
- Slides should be DETAILED and READABLE without a speaker (full sentences, 7-15 words per bullet).
- Speaker Notes are optional, brief reminders only.
- Think: slides tell the complete story on their own.

DESIGN PRINCIPLES:
- One key idea per slide
- Clear visual hierarchy (title -> bullets -> notes)
- Professional, compelling language
- Logical flow with section dividers

OUTPUT FORMAT:
- Use exactly this markdown structure
- Include Type field for each slide
- Maximum 3-4 bullets per content slide
- ALWAYS include Visual field for EVERY slide - describe the AI-generated image (mood, colors, composition, specific elements)
- ALWAYS include Speaker Notes (detailed for illustrative, brief for wordy)

CITATION FORMAT (when web search tools are available):
- Use web search to find current facts, statistics, and examples
- Cite sources inline as [1], [2], etc. where facts appear
- Include source context in Speaker Notes
- End your response with a sources section:

  ---SOURCES---
  [1] Source Title - URL
  [2] Source Title - URL

Generate 10-15 slides for a standard presentation.

When the user asks for changes, regenerate the COMPLETE outline with their modifications applied. Always output the full structured outline.`,i=`You are a professional presentation formatter. Your job is to:

1. PARSE the user's outline exactly as provided
2. FORMAT it into the structured slide format below
3. PRESERVE all content - do not add, remove, or change meaning
4. ONLY organize and structure for visual presentation

OUTPUT FORMAT (use exactly this structure):

# TITLE SLIDE
Title: [Extract or infer main title]
Subtitle: [Extract or create brief subtitle]
Type: title

# SECTION: [Section Name]
Title: [Section Title from outline]
Type: section

# Slide N: [Slide Title]
- [Bullet point from outline]
- [Bullet point from outline]
- [Bullet point from outline]
Type: content
Speaker Notes: [Notes for presenter]

SLIDE STYLE (pay close attention to the user's chosen style):

**illustrative (Speaker Assist)**:
- Keep slide bullets MINIMAL (3-5 words each).
- Move detailed content into comprehensive Speaker Notes.

**wordy (Self-Contained)**:
- Keep bullets DETAILED (full sentences, 7-15 words).
- Speaker Notes are brief or omitted.

FORMATTING GUIDELINES:
- Preserve ALL content from the user's outline
- Do NOT add new information or statistics
- Do NOT remove any points the user included
- Infer logical sections if not explicitly provided
- Maintain the user's original intent and messaging

Output the complete structured outline.`,r=`You are formatting a social media carousel. Your ONLY job is to structure the user's content for visual presentation.

CRITICAL: Use the user's EXACT words. Do NOT:
- Rewrite or "improve" their copy
- Summarize or shorten their messages
- Add new hooks, CTAs, or content
- Change their emotional tone or messaging

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE TRANSFORMATION #1 (User provides --- separators with FULL PARAGRAPHS)
═══════════════════════════════════════════════════════════════════════════════

INPUT:
---
We have a glass door leading to our back garden that my daughter loves to play at. I was with her there the other day. She was busy doing what babies do: playing with the door handle, grabbing it, tapping it.

And while she's doing all that… my mind was in full parent mode. I was thinking about all the ways she could get hurt.
---
And then I start doing that constant calculation parents do:

* That could hurt her badly, so I need to stop it.
* That might hurt a bit, but she'll learn from it.
* That's not dangerous, it's just messy.

Meanwhile she's completely oblivious. She's just… living. Exploring. Playing.
---
Sometimes we don't see how many "what ifs" are being handled for us in the background.

A God behind you and ahead of you.
A hand already there.
Not only reacting to the fall… but anticipating it.
---

OUTPUT:
# SLIDE 1 (Hook)
Title: We have a glass door leading to our back garden that my daughter loves to play at. I was with her there the other day. She was busy doing what babies do: playing with the door handle, grabbing it, tapping it.

And while she's doing all that… my mind was in full parent mode. I was thinking about all the ways she could get hurt.
Visual: Warm domestic scene, glass door, soft natural light, parent-child moment
Type: hook

# SLIDE 2
Title: And then I start doing that constant calculation parents do:

* That could hurt her badly, so I need to stop it.
* That might hurt a bit, but she'll learn from it.
* That's not dangerous, it's just messy.

Meanwhile she's completely oblivious. She's just… living. Exploring. Playing.
Visual: Split perspective - protective parent, carefree child, warm tones
Type: content

# SLIDE 3 (CTA)
Title: Sometimes we don't see how many "what ifs" are being handled for us in the background.

A God behind you and ahead of you.
A hand already there.
Not only reacting to the fall… but anticipating it.
Visual: Hopeful, light breaking through, protective presence, warm glow
Type: cta

═══════════════════════════════════════════════════════════════════════════════
❌ WRONG - DO NOT DO THIS (Summarizing user content)
═══════════════════════════════════════════════════════════════════════════════

WRONG OUTPUT (summarized/condensed):
# SLIDE 1
Title: Glass door moment with my daughter
❌ WRONG - You summarized instead of using their exact words

# SLIDE 2
Title: The parent calculation we all do
❌ WRONG - You created a "punchy title" instead of preserving their paragraphs

CORRECT: Copy the ENTIRE text between --- separators into the Title field. Every sentence. Every line break. Every bullet point. VERBATIM.

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE TRANSFORMATION #2 (User provides long prose with NO breaks)
═══════════════════════════════════════════════════════════════════════════════

INPUT:
I was sitting at my desk when it hit me. The project we'd been working on for months wasn't just late - it was fundamentally flawed. I called my team together that afternoon. We had a choice: patch it up and ship, or start over. Starting over felt impossible. But we did it anyway. Three months later, we launched something we were actually proud of.

OUTPUT:
# SLIDE 1 (Hook)
Title: I was sitting at my desk when it hit me.
Visual: Contemplative, moment of realization, soft lighting
Type: hook

# SLIDE 2
Title: The project we'd been working on for months wasn't just late - it was fundamentally flawed.
Visual: Tension, concern, muted colors
Type: content

# SLIDE 3
Title: I called my team together. We had a choice: patch it up and ship, or start over.
Visual: Crossroads, decision moment, two paths
Type: content

# SLIDE 4
Title: Starting over felt impossible. But we did it anyway.
Visual: Determination, courage, warm tones emerging
Type: content

# SLIDE 5 (CTA)
Title: Three months later, we launched something we were actually proud of.
Visual: Triumph, pride, warmth, celebration
Type: cta

═══════════════════════════════════════════════════════════════════════════════
BOUNDARY DETECTION RULES
═══════════════════════════════════════════════════════════════════════════════

**If user provides EXPLICIT breaks (respect exactly):**
- "---" = explicit slide break (each section between = one slide)
- "Slide 1:", "Slide 2:" = explicit numbering (use their structure)
- Numbered sections (1., 2., 3.) = each number is a slide
- Bullet points with major topic shifts = separate slides

**If user provides long prose with NO breaks (AI decides):**
- Find natural topic shifts in the narrative
- Look for: time shifts, perspective changes, new arguments, emotional beats
- One key idea/moment per slide
- Aim for 6-8 slides total
- Break at sentence boundaries, NEVER mid-sentence

OUTPUT FORMAT (you MUST use this exact structure with # headers):

# SLIDE 1 (Hook)
Title: [User's exact first section - can be multiple sentences]
Visual: [Mood/colors that complement their message]
Type: hook

# SLIDE 2
Title: [User's exact second section - preserve ALL their text]
Visual: [Complementary visual suggestion]
Type: content

# SLIDE N (continue numbering for each section)
Title: [User's exact text for this slide]
Visual: [Complementary visual suggestion]
Type: content

# FINAL SLIDE (CTA)
Title: [User's exact closing section]
Visual: [Visual suggestion]
Type: cta

The TITLE field contains the user's FULL text for that slide (can be multiple sentences or paragraphs).
This is social media - the slide text IS the content. NO speaker notes.

YOU MUST OUTPUT # HEADERS - the parser requires them.
Output the complete structured carousel: # SLIDE 1, # SLIDE 2, # SLIDE 3, etc.`,o=`You are formatting a vertical story/reel. Your ONLY job is to structure the user's content for visual presentation.

CRITICAL: Use the user's EXACT words. Do NOT:
- Rewrite or "improve" their copy
- Summarize or shorten their messages
- Add new hooks or content
- Change their narrative flow

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE TRANSFORMATION #1 (User provides --- separators with FULL PARAGRAPHS)
═══════════════════════════════════════════════════════════════════════════════

INPUT:
---
We have a glass door leading to our back garden that my daughter loves to play at. I was with her there the other day. She was busy doing what babies do: playing with the door handle, grabbing it, tapping it.

And while she's doing all that… my mind was in full parent mode.
---
And then I start doing that constant calculation parents do:

* That could hurt her badly, so I need to stop it.
* That might hurt a bit, but she'll learn from it.

Meanwhile she's completely oblivious. She's just… living. Exploring. Playing.
---
Sometimes we don't see how many "what ifs" are being handled for us in the background.

A God behind you and ahead of you.
A hand already there.
---

OUTPUT:
# FRAME 1 (Hook)
Title: We have a glass door leading to our back garden that my daughter loves to play at. I was with her there the other day. She was busy doing what babies do: playing with the door handle, grabbing it, tapping it.

And while she's doing all that… my mind was in full parent mode.
Visual: Warm domestic scene, soft natural light, parent-child moment
Type: hook

# FRAME 2
Title: And then I start doing that constant calculation parents do:

* That could hurt her badly, so I need to stop it.
* That might hurt a bit, but she'll learn from it.

Meanwhile she's completely oblivious. She's just… living. Exploring. Playing.
Visual: Split perspective - protective parent, carefree child
Type: content

# FRAME 3 (Payoff)
Title: Sometimes we don't see how many "what ifs" are being handled for us in the background.

A God behind you and ahead of you.
A hand already there.
Visual: Hopeful, light breaking through, protective presence
Type: cta

═══════════════════════════════════════════════════════════════════════════════
❌ WRONG - DO NOT DO THIS (Summarizing user content)
═══════════════════════════════════════════════════════════════════════════════

WRONG OUTPUT (summarized/condensed):
# FRAME 1
Title: Glass door moment with my daughter
❌ WRONG - You summarized instead of using their exact words

CORRECT: Copy the ENTIRE text between --- separators into the Title field. Every sentence. Every line break. Every bullet point. VERBATIM.

═══════════════════════════════════════════════════════════════════════════════
EXAMPLE TRANSFORMATION #2 (User provides long prose with NO breaks)
═══════════════════════════════════════════════════════════════════════════════

INPUT:
I was sitting at my desk when it hit me. The project we'd been working on for months wasn't just late - it was fundamentally flawed. I called my team together that afternoon. We had a choice: patch it up and ship, or start over. Starting over felt impossible. But we did it anyway. Three months later, we launched something we were actually proud of.

OUTPUT:
# FRAME 1 (Hook)
Title: I was sitting at my desk when it hit me.
Visual: Contemplative, moment of realization, soft lighting
Type: hook

# FRAME 2
Title: The project we'd been working on for months wasn't just late - it was fundamentally flawed.
Visual: Tension, concern, muted colors
Type: content

# FRAME 3
Title: I called my team together. We had a choice: patch it up and ship, or start over.
Visual: Crossroads, decision moment, two paths
Type: content

# FRAME 4
Title: Starting over felt impossible. But we did it anyway.
Visual: Determination, courage, warm tones emerging
Type: content

# FRAME 5 (Payoff)
Title: Three months later, we launched something we were actually proud of.
Visual: Triumph, pride, warmth, celebration
Type: cta

═══════════════════════════════════════════════════════════════════════════════
BOUNDARY DETECTION RULES
═══════════════════════════════════════════════════════════════════════════════

**If user provides EXPLICIT breaks (respect exactly):**
- "---" = explicit frame break (each section between = one frame)
- "Frame 1:", "Slide 1:" = explicit numbering (use their structure)
- Numbered sections (1., 2., 3.) = each number is a frame
- Bullet points with major topic shifts = separate frames

**If user provides long prose with NO breaks (AI decides):**
- Find natural topic shifts in the narrative
- Look for: time shifts, perspective changes, new arguments, emotional beats
- One key idea/moment per frame
- Aim for 5-8 frames total
- Break at sentence boundaries, NEVER mid-sentence

OUTPUT FORMAT (you MUST use this exact structure with # headers):

# FRAME 1 (Hook)
Title: [User's exact first section - can be multiple sentences]
Visual: [Mood/colors that complement their message]
Type: hook

# FRAME 2
Title: [User's exact second section - preserve ALL their text]
Visual: [Complementary visual suggestion]
Type: content

# FRAME N (continue numbering for each section)
Title: [User's exact text for this frame]
Visual: [Complementary visual suggestion]
Type: content

# FINAL FRAME (Payoff)
Title: [User's exact closing section]
Visual: [Visual suggestion]
Type: cta

The TITLE field contains the user's FULL text for that frame (can be multiple sentences or paragraphs).
This is vertical video - the frame text IS the content. NO speaker notes.
Consider vertical safe zones (avoid top 10%, bottom 20%).

YOU MUST OUTPUT # HEADERS - the parser requires them.
Output the complete structured story: # FRAME 1, # FRAME 2, # FRAME 3, etc.`,n=`You are a social media carousel designer creating emotionally resonant content. Generate scroll-stopping carousels with clear narrative arcs.

OUTPUT STRUCTURE (use exactly this format):

# SLIDE 1 (Hook)
Title: [Bold statement that stops the scroll - 5-7 words max]
Visual: [Mood, colors, imagery - e.g., "Soft neutral background, minimal text, calm design"]
Type: hook

# SLIDE 2 (Context)
Title: [Set the scene - relatable situation - 5-7 words]
Visual: [Imagery that grounds the story]
Type: context

# SLIDE 3-6 (Journey Slides - pick from these narrative beats)
Title: [One key idea - poetic, punchy - 5-7 words max]
Visual: [Mood progression - colors, imagery, symbolism]
Type: [validation | reality | emotional | reframe | affirmation]

Available narrative beats (use 3-5 of these):
- validation: Acknowledge their experience ("That alone required courage")
- reality: Specific relatable details ("You learned new systems")
- emotional: Deeper connection, vulnerability ("You missed home")
- reframe: Positive shift, perspective change ("But you kept going")
- affirmation: Value statement, recognition ("That matters. It counts.")

# FINAL SLIDE (CTA)
Title: [Engagement prompt with emoji - invite response]
Visual: [Warm, hopeful, open space for reflection]
Type: cta

CAROUSEL PRINCIPLES:
- ONE idea per slide (never multiple bullets)
- 6-8 slides total (sweet spot: 7-8)
- Maximum 5-7 words per line
- Build an EMOTIONAL ARC: hook → context → journey → hope → action
- Visual mood progression: reflective → hopeful (color temperature shift)
- Mobile-first, center-weighted text
- No section dividers (continuous flow)
- Each slide must make sense on its own (users may screenshot)

TEXT STYLE:
- Second person "you" - direct address
- Poetic rhythm, punchy line breaks
- Short sentences. Line breaks for emphasis.
- Emojis sparingly: hook and CTA only
- Avoid corporate/formal language - warm, human, conversational

VISUAL DIRECTION:
- Each slide has mood + color + imagery guidance
- Progression from muted/reflective → warm/hopeful
- Symbolism: forward motion, light breaking through, open paths
- Cultural patterns as subtle watermarks if relevant

Speaker Notes: Use for post caption draft with relevant hashtags and engagement hooks.

When the user asks for changes, regenerate the COMPLETE carousel with their modifications applied.`,l=`You are a vertical content creator for TikTok, Reels, and Stories. Generate punchy, scroll-stopping content with emotional resonance.

OUTPUT STRUCTURE (use exactly this format):

# FRAME 1 (Hook)
Title: [Pattern interrupt - no preamble - 3-7 words]
Visual: [Shot description with mood/color]
Type: hook

# FRAME 2 (Context)
Title: [Ground the story - relatable setup - 3-7 words]
Visual: [Scene-setting imagery]
Type: context

# FRAME 3-6 (Journey Frames - pick from narrative beats)
Title: [One point per frame - punchy, poetic - 3-7 words]
Visual: [Shot description with mood progression]
Type: [validation | reality | emotional | reframe | affirmation]

Available narrative beats:
- validation: Acknowledge experience ("That took real courage")
- reality: Specific relatable moments ("The small daily wins")
- emotional: Vulnerability, connection ("You felt it too")
- reframe: Shift perspective ("But here's the thing")
- affirmation: Recognition ("That matters")

# FINAL FRAME (Payoff)
Title: [Resolution or CTA with emoji - 3-7 words]
Visual: [Warm, hopeful closing - invite engagement]
Type: cta

STORY PRINCIPLES:
- NO title slide - jump straight into the hook
- 5-8 frames total (tight, punchy)
- First frame MUST hook immediately (no warm-up, no "Hey guys")
- Build EMOTIONAL ARC: hook → context → journey → payoff
- Punchy, conversational - TikTok energy, not corporate
- Vertical safe zones: avoid top 10% and bottom 20%
- Every word must earn its place
- End with payoff or loop trigger

TEXT STYLE:
- Second person "you" where relevant
- Short. Punchy. Line breaks matter.
- Emojis sparingly: hook and CTA only
- Warm, human, never corporate

VISUAL PROGRESSION:
- Mood shift from hook tension → warm resolution
- Color temperature: muted → warm
- Motion symbolism: forward movement, light breaking through

NO SPEAKER NOTES - all content is visual/on-screen only.

When the user asks for changes, regenerate the COMPLETE story with their modifications applied.`;function d(e="16:9"){switch(e){case"1:1":return r;case"9:16":return o;default:return i}}e.i(977101);var c=e.i(727630),m=e.i(813038),u=e.i(403950),h=e.i(87056),p=e.i(141477),g=e.i(543621),x=e.i(359548),f=e.i(165002),y=e.i(135456),b=e.i(2138),w=e.i(239149),v=e.i(690737),T=e.i(706575),j=e.i(755430);let N=(0,j.default)("pen-tool",[["path",{d:"M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z",key:"nt11vn"}],["path",{d:"m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18",key:"15qc1e"}],["path",{d:"m2.3 2.3 7.286 7.286",key:"1wuzzi"}],["circle",{cx:"11",cy:"11",r:"2",key:"xmgehs"}]]);var S=e.i(228559),k=e.i(346596),E=e.i(593830),A=e.i(430387),I=e.i(505196),C=e.i(384078),L=e.i(799126),R=e.i(82595),O=e.i(152001),U=e.i(828982),P=e.i(846532),M=e.i(465986),D=e.i(152088);let F=[{id:"minimalist-line",name:"Minimalist Line",description:"Clean, elegant line art with subtle colors. Professional and modern.",category:"minimal",imageSrc:"/styles/minimal-line.jpg"},{id:"corporate-vector",name:"Corporate Vector",description:"Flat, professional vector illustrations suitable for business decks.",category:"illustrated",imageSrc:"/styles/corporate-vector.jpg"},{id:"photorealistic",name:"Photorealistic",description:"High-quality photographic imagery for impactful visuals.",category:"photorealistic",imageSrc:"/styles/photo.jpg"},{id:"collage-art",name:"Collage Art",description:"Creative mixed-media collage style. Unique and artistic.",category:"abstract",imageSrc:"/styles/collage.jpg"},{id:"3d-render",name:"3D Render",description:"Soft, modern 3D shapes and objects.",category:"illustrated",imageSrc:"/styles/3d.jpg"},{id:"cyberpunk",name:"Cyberpunk",description:"Neon, high-contrast, futuristic tech aesthetic.",category:"abstract",imageSrc:"/styles/cyberpunk.jpg"}];function V({selectedStyleId:e,onSelect:a,className:s}){return(0,t.jsx)("div",{className:(0,D.cn)("grid grid-cols-2 md:grid-cols-3 gap-3",s),children:F.map(s=>{let i=e===s.id;return(0,t.jsxs)(u.motion.button,{type:"button",onClick:()=>a(s.id),whileHover:{scale:1.02},whileTap:{scale:.98},className:(0,D.cn)("group relative flex flex-col items-start text-left p-3 rounded-xl border-2 transition-all overflow-hidden h-full",i?"border-primary bg-primary/5":"border-muted hover:border-primary/50 hover:bg-muted/30"),children:[(0,t.jsxs)("div",{className:(0,D.cn)("w-full aspect-[16/9] rounded-lg mb-3 overflow-hidden bg-muted/50 flex items-center justify-center relative",i?"ring-2 ring-primary/20":""),children:[(0,t.jsx)("div",{className:(0,D.cn)("absolute inset-0 opacity-50","minimal"===s.category&&"bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-800 dark:to-gray-900","illustrated"===s.category&&"bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-800","photorealistic"===s.category&&"bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-900 dark:to-orange-800","abstract"===s.category&&"bg-gradient-to-br from-purple-100 to-pink-200 dark:from-purple-900 dark:to-pink-800")}),(0,t.jsx)("span",{className:"text-xs font-semibold opacity-50 z-10",children:s.category})]}),(0,t.jsxs)("div",{className:"flex justify-between items-start w-full",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{className:"font-semibold text-sm block mb-1",children:s.name}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground leading-tight line-clamp-2",children:s.description})]}),i&&(0,t.jsx)("div",{className:"bg-primary text-primary-foreground rounded-full p-0.5 ml-2 mt-0.5 shrink-0",children:(0,t.jsx)(U.Check,{className:"w-3 h-3"})})]}),(0,t.jsx)(M.TooltipProvider,{children:(0,t.jsxs)(M.Tooltip,{children:[(0,t.jsx)(M.TooltipTrigger,{asChild:!0,children:(0,t.jsx)("div",{className:"absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity",children:(0,t.jsx)(P.Info,{className:"w-4 h-4 text-muted-foreground"})})}),(0,t.jsx)(M.TooltipContent,{children:(0,t.jsx)("p",{className:"max-w-xs",children:s.description})})]})})]},s.id)})})}let B=(0,j.default)("file-image",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["circle",{cx:"10",cy:"12",r:"2",key:"737tya"}],["path",{d:"m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22",key:"wt3hpn"}]]);var z=e.i(462957),G=e.i(126312),Y=e.i(328299),W=e.i(690558),$=e.i(985902),H=e.i(264036),X=e.i(610012),Q=e.i(173554);let _={"application/pdf":[".pdf"],"application/vnd.openxmlformats-officedocument.presentationml.presentation":[".pptx"],"image/png":[".png"],"image/jpeg":[".jpg",".jpeg"],"image/webp":[".webp"]};function q({color:e,label:a}){return(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsx)("div",{className:"h-5 w-5 rounded border",style:{backgroundColor:e}}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground",children:a})]})}function K({onTemplateSelect:e,selectedTemplateId:s,disabled:i}){let[r,o]=(0,C.useState)(!1),[n,l]=(0,C.useState)([]),[d,m]=(0,C.useState)(""),[u,h]=(0,C.useState)(!1),p=(0,c.useMutation)(a.api.designTemplates.generateUploadUrl),g=(0,c.useMutation)(a.api.designTemplates.create),x=(0,c.useMutation)(a.api.designTemplates.remove),f=(0,c.useQuery)(a.api.designTemplates.listByUser,{}),y=(0,C.useCallback)(async e=>{if(!i){o(!0);try{let a=[];for(let s of e){var t;if(s.size>0x1400000){L.toast.error(`${s.name} exceeds 20MB limit`);continue}let e=await p(),i=await fetch(e,{method:"POST",headers:{"Content-Type":s.type},body:s}),{storageId:r}=await i.json();a.push({storageId:r,name:s.name,mimeType:s.type,type:(t=s.type,"application/pdf"===t?"pdf":t.includes("presentationml")?"pptx":"image")})}if(l(e=>[...e,...a]),!d&&a.length>0){let e=a[0].name.replace(/\.[^/.]+$/,"");m(e)}}catch(e){console.error("Upload error:",e),L.toast.error("Failed to upload file")}finally{o(!1)}}},[i,p,d]),{getRootProps:w,getInputProps:v,isDragActive:j}=(0,W.useDropzone)({onDrop:y,accept:_,disabled:i||r}),N=async()=>{if(!d.trim()||0===n.length)return void L.toast.error("Please provide a name and upload at least one file");try{o(!0);let t=await g({name:d.trim(),sourceFiles:n});L.toast.success("Template uploaded! Analyzing brand..."),e(t),l([]),m(""),h(!1)}catch(e){console.error("Create template error:",e),L.toast.error("Failed to create template")}finally{o(!1)}},S=async t=>{try{await x({templateId:t}),s===t&&e(null),L.toast.success("Template deleted")}catch(e){console.error("Delete error:",e),L.toast.error("Failed to delete template")}},k=f?.filter(e=>"complete"===e.status)??[],A=f?.filter(e=>"processing"===e.status||"pending"===e.status)??[];return(0,t.jsxs)("div",{className:"space-y-4",children:[k.length>0&&!u&&(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsx)(Q.Label,{children:"Saved Templates"}),(0,t.jsx)("div",{className:"grid gap-2",children:k.map(a=>(0,t.jsxs)("div",{className:(0,D.cn)("flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors",s===a._id?"border-primary bg-primary/5":"hover:bg-muted/50"),onClick:()=>!i&&e(s===a._id?null:a._id),children:[(0,t.jsxs)("div",{className:"flex items-center gap-3",children:[(0,t.jsx)(T.Palette,{className:"h-5 w-5 text-muted-foreground"}),(0,t.jsxs)("div",{children:[(0,t.jsx)("p",{className:"font-medium text-sm",children:a.name}),a.extractedDesign&&(0,t.jsxs)("div",{className:"flex gap-3 mt-1",children:[(0,t.jsx)(q,{color:a.extractedDesign.colors.primary,label:"Primary"}),(0,t.jsx)(q,{color:a.extractedDesign.colors.secondary,label:"Secondary"})]})]})]}),(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[s===a._id&&(0,t.jsx)(U.Check,{className:"h-4 w-4 text-primary"}),(0,t.jsx)($.Button,{variant:"ghost",size:"icon",className:"h-8 w-8",onClick:e=>{e.stopPropagation(),S(a._id)},disabled:i,children:(0,t.jsx)(G.Trash2,{className:"h-4 w-4"})})]})]},a._id))})]}),A.length>0&&(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsx)(Q.Label,{children:"Processing"}),A.map(e=>(0,t.jsxs)("div",{className:"flex items-center gap-2 rounded-lg border p-3 bg-muted/30",children:[(0,t.jsx)(b.Loader2,{className:"h-4 w-4 animate-spin"}),(0,t.jsx)("span",{className:"text-sm",children:e.name}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground",children:"Analyzing brand..."})]},e._id))]}),(u||0===k.length)&&(0,t.jsxs)(H.Card,{children:[(0,t.jsxs)(H.CardHeader,{className:"pb-3",children:[(0,t.jsx)(H.CardTitle,{className:"text-base",children:k.length>0?"Upload New Template":"Brand Template"}),(0,t.jsx)(H.CardDescription,{children:"Upload your organization's slide template (PDF, PPTX, or images)"})]}),(0,t.jsxs)(H.CardContent,{className:"space-y-4",children:[(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsx)(Q.Label,{htmlFor:"template-name",children:"Template Name"}),(0,t.jsx)(X.Input,{id:"template-name",placeholder:"e.g., Acme Corp Brand",value:d,onChange:e=>m(e.target.value),disabled:i||r})]}),(0,t.jsxs)("div",{...w(),className:(0,D.cn)("border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",j?"border-primary bg-primary/5":"border-muted-foreground/25 hover:border-muted-foreground/50",(i||r)&&"opacity-50 cursor-not-allowed"),children:[(0,t.jsx)("input",{...v()}),r?(0,t.jsxs)("div",{className:"flex flex-col items-center gap-2",children:[(0,t.jsx)(b.Loader2,{className:"h-8 w-8 animate-spin text-muted-foreground"}),(0,t.jsx)("p",{className:"text-sm text-muted-foreground",children:"Uploading..."})]}):(0,t.jsxs)("div",{className:"flex flex-col items-center gap-2",children:[(0,t.jsx)(E.Upload,{className:"h-8 w-8 text-muted-foreground"}),(0,t.jsx)("p",{className:"text-sm",children:j?"Drop files here":"Drag & drop or click to upload"}),(0,t.jsx)("p",{className:"text-xs text-muted-foreground",children:"PDF, PPTX, PNG, JPG (max 20MB)"})]})]}),n.length>0&&(0,t.jsxs)("div",{className:"space-y-2",children:[(0,t.jsx)(Q.Label,{children:"Uploaded Files"}),n.map((e,a)=>(0,t.jsxs)("div",{className:"flex items-center justify-between rounded border p-2",children:[(0,t.jsxs)("div",{className:"flex items-center gap-2",children:["image"===e.type?(0,t.jsx)(B,{className:"h-4 w-4"}):(0,t.jsx)(z.FileText,{className:"h-4 w-4"}),(0,t.jsx)("span",{className:"text-sm truncate max-w-[200px]",children:e.name})]}),(0,t.jsx)($.Button,{variant:"ghost",size:"icon",className:"h-6 w-6",onClick:()=>{l(e=>e.filter((e,t)=>t!==a))},children:(0,t.jsx)(Y.X,{className:"h-3 w-3"})})]},a))]}),n.length>0&&(0,t.jsxs)($.Button,{onClick:N,disabled:!d.trim()||r||i,className:"w-full",children:[r?(0,t.jsx)(b.Loader2,{className:"mr-2 h-4 w-4 animate-spin"}):null,"Save & Analyze Template"]})]})]}),k.length>0&&!u&&(0,t.jsxs)($.Button,{variant:"outline",size:"sm",onClick:()=>h(!0),disabled:i,className:"w-full",children:[(0,t.jsx)(E.Upload,{className:"mr-2 h-4 w-4"}),"Upload New Template"]}),u&&k.length>0&&(0,t.jsx)($.Button,{variant:"ghost",size:"sm",onClick:()=>{h(!1),l([]),m("")},className:"w-full",children:"Cancel"})]})}var J=e.i(982708);function Z({...e}){return(0,t.jsx)(J.Root,{"data-slot":"collapsible",...e})}function ee({...e}){return(0,t.jsx)(J.CollapsibleTrigger,{"data-slot":"collapsible-trigger",...e})}function et({...e}){return(0,t.jsx)(J.CollapsibleContent,{"data-slot":"collapsible-content",...e})}var ea=e.i(573511),es=e.i(783055),ei=e.i(632555),er=e.i(541247),eo=e.i(152823);function en(){return(0,t.jsx)(C.Suspense,{fallback:(0,t.jsx)("div",{className:"flex items-center justify-center h-[calc(100vh-4rem)]",children:(0,t.jsx)(b.Loader2,{className:"h-8 w-8 animate-spin text-muted-foreground"})}),children:(0,t.jsx)(el,{})})}function el(){let e=(0,A.useRouter)(),[i,r]=(0,C.useState)(!1),[o,j]=(0,C.useState)(""),[U,P]=(0,C.useState)(""),[M,F]=(0,C.useState)(null),[B,z]=(0,C.useState)(null),[G,Y]=(0,C.useState)(!1),[W,H]=(0,C.useState)(!1),_=(0,C.useRef)(null),[q,J]=(0,I.useQueryState)("step",(0,I.parseAsStringLiteral)(["format","content","style"]).withDefault("format")),[en,el]=(0,I.useQueryState)("ratio",(0,I.parseAsStringLiteral)(["16:9","1:1","9:16"]).withDefault("16:9")),[ed,ec]=(0,I.useQueryState)("style",(0,I.parseAsStringLiteral)(["wordy","illustrative"]).withDefault("illustrative")),[em,eu]=(0,I.useQueryState)("mode",(0,I.parseAsStringLiteral)(["prompt","outline"]).withDefault("prompt")),[eh,ep]=(0,I.useQueryState)("imageStyle",I.parseAsString.withDefault("minimalist-line")),[eg,ex]=(0,I.useQueryState)("enhance",I.parseAsBoolean.withDefault(!0)),[ef,ey]=(0,I.useQueryState)("grounding",I.parseAsBoolean.withDefault(!1)),{showSlides:eb,isLoading:ew}=(0,eo.useFeatureToggles)(),[ev]=(0,I.useQueryState)("messageId",I.parseAsString),[eT]=(0,I.useQueryState)("conversationId",I.parseAsString),ej=(0,c.useQuery)(a.api.messages.list,eT?{conversationId:eT}:"skip");(0,C.useEffect)(()=>{if(!ej||U)return;if(ev){let e=ej.find(e=>e._id===ev);e?.content&&P(e.content);return}let e=ej.filter(e=>"complete"===e.status&&e.content).map(e=>`**${"user"===e.role?"User":"Assistant"}:**
${e.content}`).join("\n\n---\n\n");e&&P(e)},[ej,ev,U]);let eN={"16:9":{illustrative:{label:"Speaker Assist",desc:"Visual slides, detailed notes",Icon:w.Mic},wordy:{label:"Self-Contained",desc:"Detailed slides, standalone",Icon:f.FileIcon}},"1:1":{illustrative:{label:"Visual-First",desc:"Bold visuals, minimal text",Icon:k.Sparkles},wordy:{label:"Text-Rich",desc:"Readable cards, more context",Icon:f.FileIcon}},"9:16":{illustrative:{label:"Visual-First",desc:"Visual storytelling",Icon:k.Sparkles},wordy:{label:"Text-Rich",desc:"Caption-forward",Icon:f.FileIcon}}}[en],eS=(0,c.useMutation)(a.api.presentations.create),ek=(0,c.useMutation)(a.api.conversations.create),eE=(0,c.useMutation)(a.api.presentations.linkConversation),eA=(0,c.useMutation)(a.api.chat.sendMessage),eI=(0,c.useMutation)(a.api.presentations.updateStatus),eC=(0,c.useMutation)(a.api.files.generateUploadUrl),eL=(0,c.useAction)(a.api.tools.fileDocument.extractDocumentForSlides),eR=(0,C.useCallback)(async e=>{let t=e.target.files?.[0];if(t){if(!["text/plain","text/markdown","application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(t.type))return void L.toast.error("Unsupported file type. Please use TXT, MD, PDF, or DOCX.");if("text/plain"===t.type||"text/markdown"===t.type){P(await t.text()),F(t.name),L.toast.success(`Loaded ${t.name}`);return}H(!0);try{let e=await eC(),a=await fetch(e,{method:"POST",headers:{"Content-Type":t.type},body:t}),{storageId:s}=await a.json(),i=await eL({storageId:s,fileName:t.name,mimeType:t.type});i.success&&i.text?(P(i.text),F(t.name),L.toast.success(`Extracted content from ${t.name}`)):L.toast.error(i.error||"Failed to process document")}catch(e){L.toast.error("Failed to process document"),console.error(e)}finally{H(!1)}}},[eC,eL]);if(ew)return(0,t.jsx)(O.FeatureLoadingScreen,{});if(!eb)return(0,t.jsx)(R.DisabledFeaturePage,{featureName:"Slides",settingKey:"showSlides"});let eO=async()=>{if(U.trim()){r(!0);try{let t,a,i=o.trim()||"Untitled Presentation",r=await eS({title:i,slideStyle:ed,templateId:B??void 0,aspectRatio:en,imageStyle:eh}),c="illustrative"===ed?`illustrative (${eN.illustrative.label})`:`wordy (${eN.wordy.label})`,m="16:9"===en?"Presentation (16:9)":"1:1"===en?"Social (Square)":"Social (Vertical)",u="16:9"===en?"presentation":"1:1"===en?"carousel":"story",h=o.trim()?`
Presentation Title: "${o.trim()}" (use this exact title)
`:"";"prompt"===em?(t=function(e="16:9"){switch(e){case"1:1":return n;case"9:16":return l;default:return s}}(en),a=`Slide Style: ${c}
Format: ${m}${h}
Create a ${u} about:
${U.trim()}`):eg?(t=d(en),a=`Slide Style: ${c}
Format: ${m}${h}
Enhance this ${u} outline. Improve the content but keep the user's structure:
${U.trim()}`):(t=d(en),a=`Slide Style: ${c}
Format: ${m}${h}
Format this outline into structured slides. Preserve the user's structure EXACTLY:
${U.trim()}`);let p=await ek({model:"google:gemini-3-flash",title:"New Chat",systemPrompt:t,isPresentation:!0,enableGrounding:ef});await eE({presentationId:r,conversationId:p}),await eI({presentationId:r,status:"outline_generating"}),await eA({conversationId:p,content:a,modelId:"google:gemini-3-flash"}),e.push(`/slides/${r}/outline`)}catch(t){console.error("Error creating presentation:",t);let e=t instanceof Error?t.message:"";e.includes("Daily presentation limit")?L.toast.error(e):L.toast.error("Failed to create presentation. Please try again."),r(!1)}}},eU=["format","content","style"],eP=eU.indexOf(q);return(0,t.jsx)(es.ScrollArea,{className:"h-[calc(100vh-4rem)]",children:(0,t.jsx)("div",{className:"bg-background text-foreground animate-in fade-in duration-500 pb-32",children:(0,t.jsxs)("div",{className:"container max-w-3xl mx-auto py-12 px-4 sm:px-6",children:[(0,t.jsxs)("div",{className:"mb-8 text-center space-y-2",children:[(0,t.jsx)("h1",{className:"text-3xl font-bold tracking-tight",children:"Create Presentation"}),(0,t.jsx)("p",{className:"text-muted-foreground",children:"Turn your ideas into professional slides in seconds with AI."})]}),(0,t.jsx)("div",{className:"flex items-center justify-center gap-2 mb-8",children:[{id:"format",label:"Format"},{id:"content",label:"Content"},{id:"style",label:"Style"}].map((e,a)=>{let s=eU.indexOf(e.id),i=s<eP,r=e.id===q;return(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[a>0&&(0,t.jsx)("div",{className:(0,D.cn)("w-8 h-0.5",i?"bg-primary":"bg-muted")}),(0,t.jsxs)("button",{type:"button",onClick:()=>s<=eP&&J(e.id),disabled:s>eP,className:(0,D.cn)("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",r&&"bg-primary text-primary-foreground",i&&"bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",!r&&!i&&"bg-muted text-muted-foreground cursor-not-allowed"),children:[i?(0,t.jsx)(h.CheckCircle2,{className:"h-4 w-4"}):(0,t.jsx)("span",{className:"w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-medium",children:a+1}),(0,t.jsx)("span",{className:"hidden sm:inline",children:e.label})]})]},e.id)})}),(0,t.jsxs)("div",{className:"space-y-6",children:["format"===q&&(0,t.jsxs)(u.motion.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"space-y-6",children:[(0,t.jsxs)("div",{className:"bg-card border rounded-xl shadow-sm p-6 sm:p-8",children:[(0,t.jsx)(Q.Label,{className:"text-base font-semibold mb-4 block",children:"What format do you need?"}),(0,t.jsx)("div",{className:"grid grid-cols-3 gap-4",children:[{id:"16:9",label:"Presentation",icon:v.Monitor,desc:"Standard 16:9"},{id:"1:1",label:"Social Post",icon:y.Grid,desc:"Square 1:1"},{id:"9:16",label:"Story",icon:S.Smartphone,desc:"Vertical 9:16"}].map(e=>(0,t.jsxs)("button",{type:"button",onClick:()=>el(e.id),className:(0,D.cn)("flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl border-2 transition-all outline-none",en===e.id?"border-primary bg-primary/5 text-primary":"border-muted hover:border-primary/20 hover:bg-muted/30 text-muted-foreground"),children:[(0,t.jsx)(e.icon,{className:"h-8 w-8 mb-3"}),(0,t.jsx)("span",{className:"text-sm font-semibold",children:e.label}),(0,t.jsx)("span",{className:"text-xs opacity-70 mt-1",children:e.desc})]},e.id))})]}),(0,t.jsx)("div",{className:"flex justify-end",children:(0,t.jsxs)($.Button,{onClick:()=>J("content"),children:["Continue",(0,t.jsx)(x.ChevronRight,{className:"ml-2 h-4 w-4"})]})})]}),"content"===q&&(0,t.jsxs)(u.motion.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"space-y-6",children:[(0,t.jsxs)("div",{className:"bg-card border rounded-xl shadow-sm overflow-hidden p-6 sm:p-8 space-y-6",children:[(0,t.jsx)("div",{className:"flex justify-center",children:(0,t.jsxs)(ea.RadioGroup,{value:em,onValueChange:e=>eu(e),className:"flex items-center gap-6",children:[(0,t.jsxs)("div",{className:"flex items-center space-x-2",children:[(0,t.jsx)(ea.RadioGroupItem,{value:"prompt",id:"mode-prompt"}),(0,t.jsx)(Q.Label,{htmlFor:"mode-prompt",className:"cursor-pointer font-medium",children:"Generate from Idea"})]}),(0,t.jsxs)("div",{className:"flex items-center space-x-2",children:[(0,t.jsx)(ea.RadioGroupItem,{value:"outline",id:"mode-outline"}),(0,t.jsx)(Q.Label,{htmlFor:"mode-outline",className:"cursor-pointer font-medium",children:"I Have an Outline"})]})]})}),(0,t.jsxs)("div",{className:"space-y-3",children:[(0,t.jsxs)("div",{className:"flex justify-between items-center",children:[(0,t.jsx)(Q.Label,{htmlFor:"input",className:"text-base font-semibold",children:"prompt"===em?"Describe your presentation":"Paste your outline"}),(0,t.jsxs)("div",{className:"flex gap-2",children:[(0,t.jsx)("input",{ref:_,type:"file",accept:".txt,.md,.pdf,.docx",onChange:eR,className:"hidden",disabled:i}),(0,t.jsxs)($.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>_.current?.click(),disabled:i,className:"h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground",children:[(0,t.jsx)(E.Upload,{className:"h-3.5 w-3.5"}),M||"Upload File"]})]})]}),(0,t.jsxs)("div",{className:"relative group",children:[(0,t.jsx)(er.Textarea,{id:"input",placeholder:"prompt"===em?'e.g. "Quarterly business review for Q4 2024 focusing on growth metrics and key achievements..."':`1. Introduction
   - Context
   - Goals

2. Metric Analysis...`,value:U,onChange:e=>P(e.target.value),disabled:i,className:(0,D.cn)("min-h-[200px] max-h-[500px] resize-none overflow-y-auto text-base leading-relaxed p-4 border-muted-foreground/20 focus-visible:border-primary/50 transition-all font-normal","bg-muted/10 group-hover:bg-muted/20 focus:bg-background"),style:{fieldSizing:"fixed"}}),(0,t.jsx)("div",{className:"absolute bottom-3 right-3 pointer-events-none",children:(0,t.jsxs)("span",{className:(0,D.cn)("text-xs px-2 py-1 rounded bg-background/80 backdrop-blur border shadow-sm transition-opacity duration-200",U.length>0?"opacity-100":"opacity-0"),children:[U.length," chars"]})})]})]}),(0,t.jsx)(m.AnimatePresence,{children:"outline"===em&&(0,t.jsx)(u.motion.div,{initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},className:"overflow-hidden",children:(0,t.jsxs)("div",{className:"flex items-center justify-between rounded-lg border p-3 bg-muted/30",children:[(0,t.jsxs)("div",{className:"space-y-0.5",children:[(0,t.jsx)(Q.Label,{htmlFor:"enhance",className:"text-sm font-medium flex items-center gap-2",children:"Smart Enhance"}),(0,t.jsx)("p",{className:"text-xs text-muted-foreground",children:"Allow AI to research and expand your bullet points"})]}),(0,t.jsx)(ei.Switch,{id:"enhance",checked:eg,onCheckedChange:ex,disabled:i})]})})}),(0,t.jsxs)("div",{className:"flex items-center justify-between py-3 border-t",children:[(0,t.jsxs)("div",{className:"space-y-0.5",children:[(0,t.jsx)(Q.Label,{htmlFor:"grounding",className:"text-sm font-medium flex items-center gap-2",children:"Web Research"}),(0,t.jsx)("p",{className:"text-xs text-muted-foreground",children:"Search the web for facts, statistics, and citations"})]}),(0,t.jsx)(ei.Switch,{id:"grounding",checked:ef,onCheckedChange:ey,disabled:i})]})]}),(0,t.jsx)("div",{className:"bg-card border rounded-xl shadow-sm p-6 sm:p-8",children:(0,t.jsxs)("div",{className:"space-y-3",children:[(0,t.jsxs)(Q.Label,{htmlFor:"title",className:"text-sm font-medium",children:["Presentation Title"," ",(0,t.jsx)("span",{className:"text-muted-foreground font-normal",children:"(Optional)"})]}),(0,t.jsxs)("div",{className:"relative",children:[(0,t.jsx)(X.Input,{id:"title",placeholder:"Auto-generated if empty",value:o,onChange:e=>j(e.target.value),disabled:i,className:"pl-2"}),(0,t.jsx)(N,{className:"absolute right-3 top-3 h-4 w-4 text-muted-foreground/30 pointer-events-none"})]})]})}),(0,t.jsxs)("div",{className:"flex justify-between",children:[(0,t.jsxs)($.Button,{variant:"ghost",onClick:()=>J("format"),children:[(0,t.jsx)(g.ChevronLeft,{className:"mr-2 h-4 w-4"}),"Back"]}),(0,t.jsxs)($.Button,{onClick:()=>J("style"),disabled:!U.trim(),children:["Continue",(0,t.jsx)(x.ChevronRight,{className:"ml-2 h-4 w-4"})]})]})]}),"style"===q&&(0,t.jsxs)(u.motion.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"space-y-6",children:[(0,t.jsxs)("div",{className:"bg-card border rounded-xl shadow-sm p-6 sm:p-8 space-y-4",children:[(0,t.jsx)(Q.Label,{className:"text-base font-semibold",children:"Content Density"}),(0,t.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,t.jsxs)("button",{type:"button",onClick:()=>ec("illustrative"),className:(0,D.cn)("flex items-center justify-between p-4 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/20","illustrative"===ed?"border-primary bg-primary/5":"border-muted hover:border-border hover:bg-muted/30"),children:[(0,t.jsxs)("div",{className:"flex items-center gap-3",children:[(0,t.jsx)("div",{className:(0,D.cn)("p-2 rounded-md","illustrative"===ed?"bg-primary/10 text-primary":"bg-muted text-muted-foreground"),children:(0,t.jsx)(eN.illustrative.Icon,{className:"h-5 w-5"})}),(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{className:"text-sm font-medium block",children:eN.illustrative.label}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground block",children:eN.illustrative.desc})]})]}),"illustrative"===ed&&(0,t.jsx)(h.CheckCircle2,{className:"h-5 w-5 text-primary"})]}),(0,t.jsxs)("button",{type:"button",onClick:()=>ec("wordy"),className:(0,D.cn)("flex items-center justify-between p-4 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/20","wordy"===ed?"border-primary bg-primary/5":"border-muted hover:border-border hover:bg-muted/30"),children:[(0,t.jsxs)("div",{className:"flex items-center gap-3",children:[(0,t.jsx)("div",{className:(0,D.cn)("p-2 rounded-md","wordy"===ed?"bg-primary/10 text-primary":"bg-muted text-muted-foreground"),children:(0,t.jsx)(eN.wordy.Icon,{className:"h-5 w-5"})}),(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{className:"text-sm font-medium block",children:eN.wordy.label}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground block",children:eN.wordy.desc})]})]}),"wordy"===ed&&(0,t.jsx)(h.CheckCircle2,{className:"h-5 w-5 text-primary"})]})]})]}),(0,t.jsxs)("div",{className:"bg-card border rounded-xl shadow-sm p-6 sm:p-8 space-y-4",children:[(0,t.jsx)(Q.Label,{className:"text-base font-semibold",children:"Visual Style"}),(0,t.jsx)(V,{selectedStyleId:eh,onSelect:ep})]}),(0,t.jsxs)(Z,{open:G,onOpenChange:Y,className:"border rounded-xl overflow-hidden bg-card",children:[(0,t.jsx)(ee,{asChild:!0,children:(0,t.jsxs)("button",{type:"button",className:(0,D.cn)("flex items-center justify-between w-full p-4 text-left transition-colors",G?"bg-muted/30":"hover:bg-muted/20",B&&"border-l-2 border-l-primary"),disabled:i,children:[(0,t.jsxs)("div",{className:"flex items-center gap-3",children:[(0,t.jsx)("div",{className:(0,D.cn)("p-2 rounded-lg",B?"bg-primary/10 text-primary":"bg-muted text-muted-foreground"),children:(0,t.jsx)(T.Palette,{className:"h-4 w-4"})}),(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{className:"text-sm font-medium block",children:"Brand Template"}),(0,t.jsx)("span",{className:"text-xs text-muted-foreground",children:B?"Template selected":"Match your organization's branding"})]})]}),(0,t.jsx)(p.ChevronDown,{className:(0,D.cn)("h-4 w-4 text-muted-foreground transition-transform",G&&"rotate-180")})]})}),(0,t.jsx)(et,{children:(0,t.jsx)("div",{className:"p-4 pt-0 border-t",children:(0,t.jsx)(K,{onTemplateSelect:z,selectedTemplateId:B,disabled:i})})})]}),(0,t.jsxs)("div",{className:"flex justify-between pt-4",children:[(0,t.jsxs)($.Button,{variant:"ghost",onClick:()=>J("content"),children:[(0,t.jsx)(g.ChevronLeft,{className:"mr-2 h-4 w-4"}),"Back"]}),(0,t.jsx)($.Button,{onClick:eO,disabled:i||!U.trim(),className:"h-12 px-6 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl",size:"lg",children:i?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(b.Loader2,{className:"mr-2 h-5 w-5 animate-spin"}),"Orchestrating..."]}):(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)(k.Sparkles,{className:"mr-2 h-5 w-5"}),"Generate Presentation"]})})]}),(0,t.jsx)("p",{className:"text-center text-xs text-muted-foreground",children:"Estimated generation time: ~30 seconds"})]})]})]})})})}e.s(["default",()=>en,"dynamic",0,"force-dynamic"],319432)}]);