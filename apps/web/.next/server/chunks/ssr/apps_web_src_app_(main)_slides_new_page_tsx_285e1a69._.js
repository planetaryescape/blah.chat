module.exports=[492787,a=>{"use strict";var b=a.i(367146),c=a.i(130487);let d=`You are a professional presentation designer. Generate slide outlines in this structured format:

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

When the user asks for changes, regenerate the COMPLETE outline with their modifications applied. Always output the full structured outline.`,e=`You are a professional presentation formatter. Your job is to:

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

Output the complete structured outline.`,f=`You are formatting a social media carousel. Your ONLY job is to structure the user's content for visual presentation.

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
Output the complete structured carousel: # SLIDE 1, # SLIDE 2, # SLIDE 3, etc.`,g=`You are formatting a vertical story/reel. Your ONLY job is to structure the user's content for visual presentation.

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
Output the complete structured story: # FRAME 1, # FRAME 2, # FRAME 3, etc.`,h=`You are a social media carousel designer creating emotionally resonant content. Generate scroll-stopping carousels with clear narrative arcs.

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

When the user asks for changes, regenerate the COMPLETE carousel with their modifications applied.`,i=`You are a vertical content creator for TikTok, Reels, and Stories. Generate punchy, scroll-stopping content with emotional resonance.

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

When the user asks for changes, regenerate the COMPLETE story with their modifications applied.`;function j(a="16:9"){switch(a){case"1:1":return f;case"9:16":return g;default:return e}}a.i(16243);var k=a.i(182234),l=a.i(354420),m=a.i(529395),n=a.i(885737),o=a.i(351244),p=a.i(215179),q=a.i(358176),r=a.i(626283),s=a.i(910967),t=a.i(452549),u=a.i(89847),v=a.i(291673),w=a.i(232260),x=a.i(366705);let y=(0,x.default)("pen-tool",[["path",{d:"M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z",key:"nt11vn"}],["path",{d:"m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18",key:"15qc1e"}],["path",{d:"m2.3 2.3 7.286 7.286",key:"1wuzzi"}],["circle",{cx:"11",cy:"11",r:"2",key:"xmgehs"}]]);var z=a.i(245493),A=a.i(651386),B=a.i(901555),C=a.i(502311),D=a.i(689024),E=a.i(537500),F=a.i(753884),G=a.i(206568),H=a.i(229606),I=a.i(730843),J=a.i(214754),K=a.i(477430),L=a.i(700760);let M=[{id:"minimalist-line",name:"Minimalist Line",description:"Clean, elegant line art with subtle colors. Professional and modern.",category:"minimal",imageSrc:"/styles/minimal-line.jpg"},{id:"corporate-vector",name:"Corporate Vector",description:"Flat, professional vector illustrations suitable for business decks.",category:"illustrated",imageSrc:"/styles/corporate-vector.jpg"},{id:"photorealistic",name:"Photorealistic",description:"High-quality photographic imagery for impactful visuals.",category:"photorealistic",imageSrc:"/styles/photo.jpg"},{id:"collage-art",name:"Collage Art",description:"Creative mixed-media collage style. Unique and artistic.",category:"abstract",imageSrc:"/styles/collage.jpg"},{id:"3d-render",name:"3D Render",description:"Soft, modern 3D shapes and objects.",category:"illustrated",imageSrc:"/styles/3d.jpg"},{id:"cyberpunk",name:"Cyberpunk",description:"Neon, high-contrast, futuristic tech aesthetic.",category:"abstract",imageSrc:"/styles/cyberpunk.jpg"}];function N({selectedStyleId:a,onSelect:c,className:d}){return(0,b.jsx)("div",{className:(0,L.cn)("grid grid-cols-2 md:grid-cols-3 gap-3",d),children:M.map(d=>{let e=a===d.id;return(0,b.jsxs)(m.motion.button,{type:"button",onClick:()=>c(d.id),whileHover:{scale:1.02},whileTap:{scale:.98},className:(0,L.cn)("group relative flex flex-col items-start text-left p-3 rounded-xl border-2 transition-all overflow-hidden h-full",e?"border-primary bg-primary/5":"border-muted hover:border-primary/50 hover:bg-muted/30"),children:[(0,b.jsxs)("div",{className:(0,L.cn)("w-full aspect-[16/9] rounded-lg mb-3 overflow-hidden bg-muted/50 flex items-center justify-center relative",e?"ring-2 ring-primary/20":""),children:[(0,b.jsx)("div",{className:(0,L.cn)("absolute inset-0 opacity-50","minimal"===d.category&&"bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-800 dark:to-gray-900","illustrated"===d.category&&"bg-gradient-to-br from-blue-100 to-indigo-200 dark:from-blue-900 dark:to-indigo-800","photorealistic"===d.category&&"bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-900 dark:to-orange-800","abstract"===d.category&&"bg-gradient-to-br from-purple-100 to-pink-200 dark:from-purple-900 dark:to-pink-800")}),(0,b.jsx)("span",{className:"text-xs font-semibold opacity-50 z-10",children:d.category})]}),(0,b.jsxs)("div",{className:"flex justify-between items-start w-full",children:[(0,b.jsxs)("div",{children:[(0,b.jsx)("span",{className:"font-semibold text-sm block mb-1",children:d.name}),(0,b.jsx)("span",{className:"text-xs text-muted-foreground leading-tight line-clamp-2",children:d.description})]}),e&&(0,b.jsx)("div",{className:"bg-primary text-primary-foreground rounded-full p-0.5 ml-2 mt-0.5 shrink-0",children:(0,b.jsx)(I.Check,{className:"w-3 h-3"})})]}),(0,b.jsx)(K.TooltipProvider,{children:(0,b.jsxs)(K.Tooltip,{children:[(0,b.jsx)(K.TooltipTrigger,{asChild:!0,children:(0,b.jsx)("div",{className:"absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity",children:(0,b.jsx)(J.Info,{className:"w-4 h-4 text-muted-foreground"})})}),(0,b.jsx)(K.TooltipContent,{children:(0,b.jsx)("p",{className:"max-w-xs",children:d.description})})]})})]},d.id)})})}let O=(0,x.default)("file-image",[["path",{d:"M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z",key:"1oefj6"}],["path",{d:"M14 2v5a1 1 0 0 0 1 1h5",key:"wfsgrz"}],["circle",{cx:"10",cy:"12",r:"2",key:"737tya"}],["path",{d:"m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22",key:"wt3hpn"}]]);var P=a.i(116245),Q=a.i(971310),R=a.i(23944),S=a.i(134818),T=a.i(539524),U=a.i(592552),V=a.i(928503),W=a.i(658547);let X={"application/pdf":[".pdf"],"application/vnd.openxmlformats-officedocument.presentationml.presentation":[".pptx"],"image/png":[".png"],"image/jpeg":[".jpg",".jpeg"],"image/webp":[".webp"]};function Y({color:a,label:c}){return(0,b.jsxs)("div",{className:"flex items-center gap-2",children:[(0,b.jsx)("div",{className:"h-5 w-5 rounded border",style:{backgroundColor:a}}),(0,b.jsx)("span",{className:"text-xs text-muted-foreground",children:c})]})}function Z({onTemplateSelect:a,selectedTemplateId:d,disabled:e}){let[f,g]=(0,E.useState)(!1),[h,i]=(0,E.useState)([]),[j,l]=(0,E.useState)(""),[m,n]=(0,E.useState)(!1),o=(0,k.useMutation)(c.api.designTemplates.generateUploadUrl),p=(0,k.useMutation)(c.api.designTemplates.create),q=(0,k.useMutation)(c.api.designTemplates.remove),r=(0,k.useQuery)(c.api.designTemplates.listByUser,{}),s=(0,E.useCallback)(async a=>{if(!e){g(!0);try{let c=[];for(let d of a){var b;if(d.size>0x1400000){F.toast.error(`${d.name} exceeds 20MB limit`);continue}let a=await o(),e=await fetch(a,{method:"POST",headers:{"Content-Type":d.type},body:d}),{storageId:f}=await e.json();c.push({storageId:f,name:d.name,mimeType:d.type,type:(b=d.type,"application/pdf"===b?"pdf":b.includes("presentationml")?"pptx":"image")})}if(i(a=>[...a,...c]),!j&&c.length>0){let a=c[0].name.replace(/\.[^/.]+$/,"");l(a)}}catch(a){console.error("Upload error:",a),F.toast.error("Failed to upload file")}finally{g(!1)}}},[e,o,j]),{getRootProps:u,getInputProps:v,isDragActive:x}=(0,S.useDropzone)({onDrop:s,accept:X,disabled:e||f}),y=async()=>{if(!j.trim()||0===h.length)return void F.toast.error("Please provide a name and upload at least one file");try{g(!0);let b=await p({name:j.trim(),sourceFiles:h});F.toast.success("Template uploaded! Analyzing brand..."),a(b),i([]),l(""),n(!1)}catch(a){console.error("Create template error:",a),F.toast.error("Failed to create template")}finally{g(!1)}},z=async b=>{try{await q({templateId:b}),d===b&&a(null),F.toast.success("Template deleted")}catch(a){console.error("Delete error:",a),F.toast.error("Failed to delete template")}},A=r?.filter(a=>"complete"===a.status)??[],C=r?.filter(a=>"processing"===a.status||"pending"===a.status)??[];return(0,b.jsxs)("div",{className:"space-y-4",children:[A.length>0&&!m&&(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(W.Label,{children:"Saved Templates"}),(0,b.jsx)("div",{className:"grid gap-2",children:A.map(c=>(0,b.jsxs)("div",{className:(0,L.cn)("flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors",d===c._id?"border-primary bg-primary/5":"hover:bg-muted/50"),onClick:()=>!e&&a(d===c._id?null:c._id),children:[(0,b.jsxs)("div",{className:"flex items-center gap-3",children:[(0,b.jsx)(w.Palette,{className:"h-5 w-5 text-muted-foreground"}),(0,b.jsxs)("div",{children:[(0,b.jsx)("p",{className:"font-medium text-sm",children:c.name}),c.extractedDesign&&(0,b.jsxs)("div",{className:"flex gap-3 mt-1",children:[(0,b.jsx)(Y,{color:c.extractedDesign.colors.primary,label:"Primary"}),(0,b.jsx)(Y,{color:c.extractedDesign.colors.secondary,label:"Secondary"})]})]})]}),(0,b.jsxs)("div",{className:"flex items-center gap-2",children:[d===c._id&&(0,b.jsx)(I.Check,{className:"h-4 w-4 text-primary"}),(0,b.jsx)(T.Button,{variant:"ghost",size:"icon",className:"h-8 w-8",onClick:a=>{a.stopPropagation(),z(c._id)},disabled:e,children:(0,b.jsx)(Q.Trash2,{className:"h-4 w-4"})})]})]},c._id))})]}),C.length>0&&(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(W.Label,{children:"Processing"}),C.map(a=>(0,b.jsxs)("div",{className:"flex items-center gap-2 rounded-lg border p-3 bg-muted/30",children:[(0,b.jsx)(t.Loader2,{className:"h-4 w-4 animate-spin"}),(0,b.jsx)("span",{className:"text-sm",children:a.name}),(0,b.jsx)("span",{className:"text-xs text-muted-foreground",children:"Analyzing brand..."})]},a._id))]}),(m||0===A.length)&&(0,b.jsxs)(U.Card,{children:[(0,b.jsxs)(U.CardHeader,{className:"pb-3",children:[(0,b.jsx)(U.CardTitle,{className:"text-base",children:A.length>0?"Upload New Template":"Brand Template"}),(0,b.jsx)(U.CardDescription,{children:"Upload your organization's slide template (PDF, PPTX, or images)"})]}),(0,b.jsxs)(U.CardContent,{className:"space-y-4",children:[(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(W.Label,{htmlFor:"template-name",children:"Template Name"}),(0,b.jsx)(V.Input,{id:"template-name",placeholder:"e.g., Acme Corp Brand",value:j,onChange:a=>l(a.target.value),disabled:e||f})]}),(0,b.jsxs)("div",{...u(),className:(0,L.cn)("border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",x?"border-primary bg-primary/5":"border-muted-foreground/25 hover:border-muted-foreground/50",(e||f)&&"opacity-50 cursor-not-allowed"),children:[(0,b.jsx)("input",{...v()}),f?(0,b.jsxs)("div",{className:"flex flex-col items-center gap-2",children:[(0,b.jsx)(t.Loader2,{className:"h-8 w-8 animate-spin text-muted-foreground"}),(0,b.jsx)("p",{className:"text-sm text-muted-foreground",children:"Uploading..."})]}):(0,b.jsxs)("div",{className:"flex flex-col items-center gap-2",children:[(0,b.jsx)(B.Upload,{className:"h-8 w-8 text-muted-foreground"}),(0,b.jsx)("p",{className:"text-sm",children:x?"Drop files here":"Drag & drop or click to upload"}),(0,b.jsx)("p",{className:"text-xs text-muted-foreground",children:"PDF, PPTX, PNG, JPG (max 20MB)"})]})]}),h.length>0&&(0,b.jsxs)("div",{className:"space-y-2",children:[(0,b.jsx)(W.Label,{children:"Uploaded Files"}),h.map((a,c)=>(0,b.jsxs)("div",{className:"flex items-center justify-between rounded border p-2",children:[(0,b.jsxs)("div",{className:"flex items-center gap-2",children:["image"===a.type?(0,b.jsx)(O,{className:"h-4 w-4"}):(0,b.jsx)(P.FileText,{className:"h-4 w-4"}),(0,b.jsx)("span",{className:"text-sm truncate max-w-[200px]",children:a.name})]}),(0,b.jsx)(T.Button,{variant:"ghost",size:"icon",className:"h-6 w-6",onClick:()=>{i(a=>a.filter((a,b)=>b!==c))},children:(0,b.jsx)(R.X,{className:"h-3 w-3"})})]},c))]}),h.length>0&&(0,b.jsxs)(T.Button,{onClick:y,disabled:!j.trim()||f||e,className:"w-full",children:[f?(0,b.jsx)(t.Loader2,{className:"mr-2 h-4 w-4 animate-spin"}):null,"Save & Analyze Template"]})]})]}),A.length>0&&!m&&(0,b.jsxs)(T.Button,{variant:"outline",size:"sm",onClick:()=>n(!0),disabled:e,className:"w-full",children:[(0,b.jsx)(B.Upload,{className:"mr-2 h-4 w-4"}),"Upload New Template"]}),m&&A.length>0&&(0,b.jsx)(T.Button,{variant:"ghost",size:"sm",onClick:()=>{n(!1),i([]),l("")},className:"w-full",children:"Cancel"})]})}var $=a.i(512661);function _({...a}){return(0,b.jsx)($.Root,{"data-slot":"collapsible",...a})}function aa({...a}){return(0,b.jsx)($.CollapsibleTrigger,{"data-slot":"collapsible-trigger",...a})}function ab({...a}){return(0,b.jsx)($.CollapsibleContent,{"data-slot":"collapsible-content",...a})}var ac=a.i(812911),ad=a.i(276670),ae=a.i(105008),af=a.i(197463),ag=a.i(375523);function ah(){return(0,b.jsx)(E.Suspense,{fallback:(0,b.jsx)("div",{className:"flex items-center justify-center h-[calc(100vh-4rem)]",children:(0,b.jsx)(t.Loader2,{className:"h-8 w-8 animate-spin text-muted-foreground"})}),children:(0,b.jsx)(ai,{})})}function ai(){let a=(0,C.useRouter)(),[e,f]=(0,E.useState)(!1),[g,x]=(0,E.useState)(""),[I,J]=(0,E.useState)(""),[K,M]=(0,E.useState)(null),[O,P]=(0,E.useState)(null),[Q,R]=(0,E.useState)(!1),[S,U]=(0,E.useState)(!1),X=(0,E.useRef)(null),[Y,$]=(0,D.useQueryState)("step",(0,D.parseAsStringLiteral)(["format","content","style"]).withDefault("format")),[ah,ai]=(0,D.useQueryState)("ratio",(0,D.parseAsStringLiteral)(["16:9","1:1","9:16"]).withDefault("16:9")),[aj,ak]=(0,D.useQueryState)("style",(0,D.parseAsStringLiteral)(["wordy","illustrative"]).withDefault("illustrative")),[al,am]=(0,D.useQueryState)("mode",(0,D.parseAsStringLiteral)(["prompt","outline"]).withDefault("prompt")),[an,ao]=(0,D.useQueryState)("imageStyle",D.parseAsString.withDefault("minimalist-line")),[ap,aq]=(0,D.useQueryState)("enhance",D.parseAsBoolean.withDefault(!0)),[ar,as]=(0,D.useQueryState)("grounding",D.parseAsBoolean.withDefault(!1)),{showSlides:at,isLoading:au}=(0,ag.useFeatureToggles)(),[av]=(0,D.useQueryState)("messageId",D.parseAsString),[aw]=(0,D.useQueryState)("conversationId",D.parseAsString),ax=(0,k.useQuery)(c.api.messages.list,aw?{conversationId:aw}:"skip");(0,E.useEffect)(()=>{if(!ax||I)return;if(av){let a=ax.find(a=>a._id===av);a?.content&&J(a.content);return}let a=ax.filter(a=>"complete"===a.status&&a.content).map(a=>`**${"user"===a.role?"User":"Assistant"}:**
${a.content}`).join("\n\n---\n\n");a&&J(a)},[ax,av,I]);let ay={"16:9":{illustrative:{label:"Speaker Assist",desc:"Visual slides, detailed notes",Icon:u.Mic},wordy:{label:"Self-Contained",desc:"Detailed slides, standalone",Icon:r.FileIcon}},"1:1":{illustrative:{label:"Visual-First",desc:"Bold visuals, minimal text",Icon:A.Sparkles},wordy:{label:"Text-Rich",desc:"Readable cards, more context",Icon:r.FileIcon}},"9:16":{illustrative:{label:"Visual-First",desc:"Visual storytelling",Icon:A.Sparkles},wordy:{label:"Text-Rich",desc:"Caption-forward",Icon:r.FileIcon}}}[ah],az=(0,k.useMutation)(c.api.presentations.create),aA=(0,k.useMutation)(c.api.conversations.create),aB=(0,k.useMutation)(c.api.presentations.linkConversation),aC=(0,k.useMutation)(c.api.chat.sendMessage),aD=(0,k.useMutation)(c.api.presentations.updateStatus),aE=(0,k.useMutation)(c.api.files.generateUploadUrl),aF=(0,k.useAction)(c.api.tools.fileDocument.extractDocumentForSlides),aG=(0,E.useCallback)(async a=>{let b=a.target.files?.[0];if(b){if(!["text/plain","text/markdown","application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(b.type))return void F.toast.error("Unsupported file type. Please use TXT, MD, PDF, or DOCX.");if("text/plain"===b.type||"text/markdown"===b.type){J(await b.text()),M(b.name),F.toast.success(`Loaded ${b.name}`);return}U(!0);try{let a=await aE(),c=await fetch(a,{method:"POST",headers:{"Content-Type":b.type},body:b}),{storageId:d}=await c.json(),e=await aF({storageId:d,fileName:b.name,mimeType:b.type});e.success&&e.text?(J(e.text),M(b.name),F.toast.success(`Extracted content from ${b.name}`)):F.toast.error(e.error||"Failed to process document")}catch(a){F.toast.error("Failed to process document"),console.error(a)}finally{U(!1)}}},[aE,aF]);if(au)return(0,b.jsx)(H.FeatureLoadingScreen,{});if(!at)return(0,b.jsx)(G.DisabledFeaturePage,{featureName:"Slides",settingKey:"showSlides"});let aH=async()=>{if(I.trim()){f(!0);try{let b,c,e=g.trim()||"Untitled Presentation",f=await az({title:e,slideStyle:aj,templateId:O??void 0,aspectRatio:ah,imageStyle:an}),k="illustrative"===aj?`illustrative (${ay.illustrative.label})`:`wordy (${ay.wordy.label})`,l="16:9"===ah?"Presentation (16:9)":"1:1"===ah?"Social (Square)":"Social (Vertical)",m="16:9"===ah?"presentation":"1:1"===ah?"carousel":"story",n=g.trim()?`
Presentation Title: "${g.trim()}" (use this exact title)
`:"";"prompt"===al?(b=function(a="16:9"){switch(a){case"1:1":return h;case"9:16":return i;default:return d}}(ah),c=`Slide Style: ${k}
Format: ${l}${n}
Create a ${m} about:
${I.trim()}`):ap?(b=j(ah),c=`Slide Style: ${k}
Format: ${l}${n}
Enhance this ${m} outline. Improve the content but keep the user's structure:
${I.trim()}`):(b=j(ah),c=`Slide Style: ${k}
Format: ${l}${n}
Format this outline into structured slides. Preserve the user's structure EXACTLY:
${I.trim()}`);let o=await aA({model:"google:gemini-3-flash",title:"New Chat",systemPrompt:b,isPresentation:!0,enableGrounding:ar});await aB({presentationId:f,conversationId:o}),await aD({presentationId:f,status:"outline_generating"}),await aC({conversationId:o,content:c,modelId:"google:gemini-3-flash"}),a.push(`/slides/${f}/outline`)}catch(b){console.error("Error creating presentation:",b);let a=b instanceof Error?b.message:"";a.includes("Daily presentation limit")?F.toast.error(a):F.toast.error("Failed to create presentation. Please try again."),f(!1)}}},aI=["format","content","style"],aJ=aI.indexOf(Y);return(0,b.jsx)(ad.ScrollArea,{className:"h-[calc(100vh-4rem)]",children:(0,b.jsx)("div",{className:"bg-background text-foreground animate-in fade-in duration-500 pb-32",children:(0,b.jsxs)("div",{className:"container max-w-3xl mx-auto py-12 px-4 sm:px-6",children:[(0,b.jsxs)("div",{className:"mb-8 text-center space-y-2",children:[(0,b.jsx)("h1",{className:"text-3xl font-bold tracking-tight",children:"Create Presentation"}),(0,b.jsx)("p",{className:"text-muted-foreground",children:"Turn your ideas into professional slides in seconds with AI."})]}),(0,b.jsx)("div",{className:"flex items-center justify-center gap-2 mb-8",children:[{id:"format",label:"Format"},{id:"content",label:"Content"},{id:"style",label:"Style"}].map((a,c)=>{let d=aI.indexOf(a.id),e=d<aJ,f=a.id===Y;return(0,b.jsxs)("div",{className:"flex items-center gap-2",children:[c>0&&(0,b.jsx)("div",{className:(0,L.cn)("w-8 h-0.5",e?"bg-primary":"bg-muted")}),(0,b.jsxs)("button",{type:"button",onClick:()=>d<=aJ&&$(a.id),disabled:d>aJ,className:(0,L.cn)("flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all",f&&"bg-primary text-primary-foreground",e&&"bg-primary/20 text-primary cursor-pointer hover:bg-primary/30",!f&&!e&&"bg-muted text-muted-foreground cursor-not-allowed"),children:[e?(0,b.jsx)(n.CheckCircle2,{className:"h-4 w-4"}):(0,b.jsx)("span",{className:"w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-medium",children:c+1}),(0,b.jsx)("span",{className:"hidden sm:inline",children:a.label})]})]},a.id)})}),(0,b.jsxs)("div",{className:"space-y-6",children:["format"===Y&&(0,b.jsxs)(m.motion.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"space-y-6",children:[(0,b.jsxs)("div",{className:"bg-card border rounded-xl shadow-sm p-6 sm:p-8",children:[(0,b.jsx)(W.Label,{className:"text-base font-semibold mb-4 block",children:"What format do you need?"}),(0,b.jsx)("div",{className:"grid grid-cols-3 gap-4",children:[{id:"16:9",label:"Presentation",icon:v.Monitor,desc:"Standard 16:9"},{id:"1:1",label:"Social Post",icon:s.Grid,desc:"Square 1:1"},{id:"9:16",label:"Story",icon:z.Smartphone,desc:"Vertical 9:16"}].map(a=>(0,b.jsxs)("button",{type:"button",onClick:()=>ai(a.id),className:(0,L.cn)("flex flex-col items-center justify-center p-4 sm:p-6 rounded-xl border-2 transition-all outline-none",ah===a.id?"border-primary bg-primary/5 text-primary":"border-muted hover:border-primary/20 hover:bg-muted/30 text-muted-foreground"),children:[(0,b.jsx)(a.icon,{className:"h-8 w-8 mb-3"}),(0,b.jsx)("span",{className:"text-sm font-semibold",children:a.label}),(0,b.jsx)("span",{className:"text-xs opacity-70 mt-1",children:a.desc})]},a.id))})]}),(0,b.jsx)("div",{className:"flex justify-end",children:(0,b.jsxs)(T.Button,{onClick:()=>$("content"),children:["Continue",(0,b.jsx)(q.ChevronRight,{className:"ml-2 h-4 w-4"})]})})]}),"content"===Y&&(0,b.jsxs)(m.motion.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"space-y-6",children:[(0,b.jsxs)("div",{className:"bg-card border rounded-xl shadow-sm overflow-hidden p-6 sm:p-8 space-y-6",children:[(0,b.jsx)("div",{className:"flex justify-center",children:(0,b.jsxs)(ac.RadioGroup,{value:al,onValueChange:a=>am(a),className:"flex items-center gap-6",children:[(0,b.jsxs)("div",{className:"flex items-center space-x-2",children:[(0,b.jsx)(ac.RadioGroupItem,{value:"prompt",id:"mode-prompt"}),(0,b.jsx)(W.Label,{htmlFor:"mode-prompt",className:"cursor-pointer font-medium",children:"Generate from Idea"})]}),(0,b.jsxs)("div",{className:"flex items-center space-x-2",children:[(0,b.jsx)(ac.RadioGroupItem,{value:"outline",id:"mode-outline"}),(0,b.jsx)(W.Label,{htmlFor:"mode-outline",className:"cursor-pointer font-medium",children:"I Have an Outline"})]})]})}),(0,b.jsxs)("div",{className:"space-y-3",children:[(0,b.jsxs)("div",{className:"flex justify-between items-center",children:[(0,b.jsx)(W.Label,{htmlFor:"input",className:"text-base font-semibold",children:"prompt"===al?"Describe your presentation":"Paste your outline"}),(0,b.jsxs)("div",{className:"flex gap-2",children:[(0,b.jsx)("input",{ref:X,type:"file",accept:".txt,.md,.pdf,.docx",onChange:aG,className:"hidden",disabled:e}),(0,b.jsxs)(T.Button,{type:"button",variant:"ghost",size:"sm",onClick:()=>X.current?.click(),disabled:e,className:"h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground",children:[(0,b.jsx)(B.Upload,{className:"h-3.5 w-3.5"}),K||"Upload File"]})]})]}),(0,b.jsxs)("div",{className:"relative group",children:[(0,b.jsx)(af.Textarea,{id:"input",placeholder:"prompt"===al?'e.g. "Quarterly business review for Q4 2024 focusing on growth metrics and key achievements..."':`1. Introduction
   - Context
   - Goals

2. Metric Analysis...`,value:I,onChange:a=>J(a.target.value),disabled:e,className:(0,L.cn)("min-h-[200px] max-h-[500px] resize-none overflow-y-auto text-base leading-relaxed p-4 border-muted-foreground/20 focus-visible:border-primary/50 transition-all font-normal","bg-muted/10 group-hover:bg-muted/20 focus:bg-background"),style:{fieldSizing:"fixed"}}),(0,b.jsx)("div",{className:"absolute bottom-3 right-3 pointer-events-none",children:(0,b.jsxs)("span",{className:(0,L.cn)("text-xs px-2 py-1 rounded bg-background/80 backdrop-blur border shadow-sm transition-opacity duration-200",I.length>0?"opacity-100":"opacity-0"),children:[I.length," chars"]})})]})]}),(0,b.jsx)(l.AnimatePresence,{children:"outline"===al&&(0,b.jsx)(m.motion.div,{initial:{opacity:0,height:0},animate:{opacity:1,height:"auto"},exit:{opacity:0,height:0},className:"overflow-hidden",children:(0,b.jsxs)("div",{className:"flex items-center justify-between rounded-lg border p-3 bg-muted/30",children:[(0,b.jsxs)("div",{className:"space-y-0.5",children:[(0,b.jsx)(W.Label,{htmlFor:"enhance",className:"text-sm font-medium flex items-center gap-2",children:"Smart Enhance"}),(0,b.jsx)("p",{className:"text-xs text-muted-foreground",children:"Allow AI to research and expand your bullet points"})]}),(0,b.jsx)(ae.Switch,{id:"enhance",checked:ap,onCheckedChange:aq,disabled:e})]})})}),(0,b.jsxs)("div",{className:"flex items-center justify-between py-3 border-t",children:[(0,b.jsxs)("div",{className:"space-y-0.5",children:[(0,b.jsx)(W.Label,{htmlFor:"grounding",className:"text-sm font-medium flex items-center gap-2",children:"Web Research"}),(0,b.jsx)("p",{className:"text-xs text-muted-foreground",children:"Search the web for facts, statistics, and citations"})]}),(0,b.jsx)(ae.Switch,{id:"grounding",checked:ar,onCheckedChange:as,disabled:e})]})]}),(0,b.jsx)("div",{className:"bg-card border rounded-xl shadow-sm p-6 sm:p-8",children:(0,b.jsxs)("div",{className:"space-y-3",children:[(0,b.jsxs)(W.Label,{htmlFor:"title",className:"text-sm font-medium",children:["Presentation Title"," ",(0,b.jsx)("span",{className:"text-muted-foreground font-normal",children:"(Optional)"})]}),(0,b.jsxs)("div",{className:"relative",children:[(0,b.jsx)(V.Input,{id:"title",placeholder:"Auto-generated if empty",value:g,onChange:a=>x(a.target.value),disabled:e,className:"pl-2"}),(0,b.jsx)(y,{className:"absolute right-3 top-3 h-4 w-4 text-muted-foreground/30 pointer-events-none"})]})]})}),(0,b.jsxs)("div",{className:"flex justify-between",children:[(0,b.jsxs)(T.Button,{variant:"ghost",onClick:()=>$("format"),children:[(0,b.jsx)(p.ChevronLeft,{className:"mr-2 h-4 w-4"}),"Back"]}),(0,b.jsxs)(T.Button,{onClick:()=>$("style"),disabled:!I.trim(),children:["Continue",(0,b.jsx)(q.ChevronRight,{className:"ml-2 h-4 w-4"})]})]})]}),"style"===Y&&(0,b.jsxs)(m.motion.div,{initial:{opacity:0,x:20},animate:{opacity:1,x:0},exit:{opacity:0,x:-20},className:"space-y-6",children:[(0,b.jsxs)("div",{className:"bg-card border rounded-xl shadow-sm p-6 sm:p-8 space-y-4",children:[(0,b.jsx)(W.Label,{className:"text-base font-semibold",children:"Content Density"}),(0,b.jsxs)("div",{className:"grid grid-cols-2 gap-4",children:[(0,b.jsxs)("button",{type:"button",onClick:()=>ak("illustrative"),className:(0,L.cn)("flex items-center justify-between p-4 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/20","illustrative"===aj?"border-primary bg-primary/5":"border-muted hover:border-border hover:bg-muted/30"),children:[(0,b.jsxs)("div",{className:"flex items-center gap-3",children:[(0,b.jsx)("div",{className:(0,L.cn)("p-2 rounded-md","illustrative"===aj?"bg-primary/10 text-primary":"bg-muted text-muted-foreground"),children:(0,b.jsx)(ay.illustrative.Icon,{className:"h-5 w-5"})}),(0,b.jsxs)("div",{children:[(0,b.jsx)("span",{className:"text-sm font-medium block",children:ay.illustrative.label}),(0,b.jsx)("span",{className:"text-xs text-muted-foreground block",children:ay.illustrative.desc})]})]}),"illustrative"===aj&&(0,b.jsx)(n.CheckCircle2,{className:"h-5 w-5 text-primary"})]}),(0,b.jsxs)("button",{type:"button",onClick:()=>ak("wordy"),className:(0,L.cn)("flex items-center justify-between p-4 rounded-lg border text-left transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary/20","wordy"===aj?"border-primary bg-primary/5":"border-muted hover:border-border hover:bg-muted/30"),children:[(0,b.jsxs)("div",{className:"flex items-center gap-3",children:[(0,b.jsx)("div",{className:(0,L.cn)("p-2 rounded-md","wordy"===aj?"bg-primary/10 text-primary":"bg-muted text-muted-foreground"),children:(0,b.jsx)(ay.wordy.Icon,{className:"h-5 w-5"})}),(0,b.jsxs)("div",{children:[(0,b.jsx)("span",{className:"text-sm font-medium block",children:ay.wordy.label}),(0,b.jsx)("span",{className:"text-xs text-muted-foreground block",children:ay.wordy.desc})]})]}),"wordy"===aj&&(0,b.jsx)(n.CheckCircle2,{className:"h-5 w-5 text-primary"})]})]})]}),(0,b.jsxs)("div",{className:"bg-card border rounded-xl shadow-sm p-6 sm:p-8 space-y-4",children:[(0,b.jsx)(W.Label,{className:"text-base font-semibold",children:"Visual Style"}),(0,b.jsx)(N,{selectedStyleId:an,onSelect:ao})]}),(0,b.jsxs)(_,{open:Q,onOpenChange:R,className:"border rounded-xl overflow-hidden bg-card",children:[(0,b.jsx)(aa,{asChild:!0,children:(0,b.jsxs)("button",{type:"button",className:(0,L.cn)("flex items-center justify-between w-full p-4 text-left transition-colors",Q?"bg-muted/30":"hover:bg-muted/20",O&&"border-l-2 border-l-primary"),disabled:e,children:[(0,b.jsxs)("div",{className:"flex items-center gap-3",children:[(0,b.jsx)("div",{className:(0,L.cn)("p-2 rounded-lg",O?"bg-primary/10 text-primary":"bg-muted text-muted-foreground"),children:(0,b.jsx)(w.Palette,{className:"h-4 w-4"})}),(0,b.jsxs)("div",{children:[(0,b.jsx)("span",{className:"text-sm font-medium block",children:"Brand Template"}),(0,b.jsx)("span",{className:"text-xs text-muted-foreground",children:O?"Template selected":"Match your organization's branding"})]})]}),(0,b.jsx)(o.ChevronDown,{className:(0,L.cn)("h-4 w-4 text-muted-foreground transition-transform",Q&&"rotate-180")})]})}),(0,b.jsx)(ab,{children:(0,b.jsx)("div",{className:"p-4 pt-0 border-t",children:(0,b.jsx)(Z,{onTemplateSelect:P,selectedTemplateId:O,disabled:e})})})]}),(0,b.jsxs)("div",{className:"flex justify-between pt-4",children:[(0,b.jsxs)(T.Button,{variant:"ghost",onClick:()=>$("content"),children:[(0,b.jsx)(p.ChevronLeft,{className:"mr-2 h-4 w-4"}),"Back"]}),(0,b.jsx)(T.Button,{onClick:aH,disabled:e||!I.trim(),className:"h-12 px-6 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all rounded-xl",size:"lg",children:e?(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(t.Loader2,{className:"mr-2 h-5 w-5 animate-spin"}),"Orchestrating..."]}):(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(A.Sparkles,{className:"mr-2 h-5 w-5"}),"Generate Presentation"]})})]}),(0,b.jsx)("p",{className:"text-center text-xs text-muted-foreground",children:"Estimated generation time: ~30 seconds"})]})]})]})})})}a.s(["default",()=>ah,"dynamic",0,"force-dynamic"],492787)}];

//# sourceMappingURL=apps_web_src_app_%28main%29_slides_new_page_tsx_285e1a69._.js.map