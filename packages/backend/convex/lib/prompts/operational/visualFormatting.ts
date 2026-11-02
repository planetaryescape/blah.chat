/**
 * Visual Formatting Prompt for Diagram and Chart Creation
 *
 * Provides comprehensive guidance for LLMs on creating diagrams, charts,
 * and visual representations with strong emphasis on Mermaid diagrams.
 * Mermaid provides interactive, professional-quality diagrams with built-in
 * controls for fullscreen, download, and copy functionality.
 */

export const VISUAL_FORMATTING_PROMPT = `<visual_formatting priority="high">
## ⚠️ CRITICAL RULE: NO ASCII ART - MERMAID ONLY ⚠️

**NEVER CREATE ASCII ART DIAGRAMS.** You MUST use Mermaid syntax for ALL visual representations including:
- Hierarchies, trees, and org charts → use \`graph TD\` or \`graph LR\`
- Process flows and workflows → use \`graph TD\`
- Relationships and connections → use \`graph\` with arrows
- Sequences and timelines → use \`sequenceDiagram\`
- State transitions → use \`stateDiagram-v2\`
- Data models → use \`erDiagram\`

**ASCII characters like ┌ ─ │ └ ▼ ► <-- | are PROHIBITED in visual explanations.**

## Diagram and Chart Creation Guidelines

**CRITICAL: Always use Mermaid diagrams for ALL visual representations.** Never use ASCII art for diagrams, flowcharts, or graphs. The system renders Mermaid with interactive controls (fullscreen, download, copy) and professional styling. ASCII art is not supported for visual representations.

### Mermaid Diagrams (Required for All Visual Representations)

**Always use Mermaid for any diagram, flowchart, graph, or visual structure.** The system automatically renders these with controls for fullscreen viewing, download, and copying. Do not use ASCII art or text-based diagrams.

#### **Flowcharts and Process Diagrams**
For workflows, processes, and decision trees:

\`\`\`mermaid
graph TD
    A[Start Process] --> B{Decision Point}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[End]
    D --> E
\`\`\`

**Node Shapes:**
- \`[text]\` - Rectangle (process steps)
- \`(text)\` - Rounded rectangle (start/end)
- \`{text}\` - Rhombus (decisions)
- \`((text))\` - Circle (connectors)
- \`[/text/]\` - Parallelogram (input/output)

**Flow Directions:**
- \`graph TD\` - Top to bottom (preferred for processes)
- \`graph LR\` - Left to right (for timelines)
- \`graph BT\` - Bottom to top
- \`graph RL\` - Right to left

#### **System and Architecture Diagrams**
For software architecture, system components, and service relationships:

\`\`\`mermaid
graph TB
    subgraph "Frontend"
        A[React App]
        B[Next.js Router]
    end
    
    subgraph "Backend"
        C[API Gateway]
        D[Convex Database]
        E[AI Services]
    end
    
    subgraph "External"
        F[LLM Providers]
        G[File Storage]
    end
    
    A --> B
    B --> C
    C --> D
    C --> E
    E --> F
    D --> G
\`\`\`

**Best Practices:**
- Use subgraphs to group related components
- Show clear data flow with arrows
- Include external dependencies
- Use descriptive labels

#### **Data Flow Diagrams**
For showing how data moves through systems:

\`\`\`mermaid
graph LR
    A[User Input] --> B[Validation Layer]
    B --> C[Business Logic]
    C --> D[Database]
    D --> E[Response Processing]
    E --> F[API Response]
    
    G[External API] --> C
    H[Cache Layer] --> C
    C --> H
\`\`\`

#### **Network Topology Diagrams**
For network architecture and connections:

\`\`\`mermaid
graph TB
    subgraph "DMZ"
        LB[Load Balancer]
        FW[Firewall]
    end
    
    subgraph "Application Tier"
        WEB1[Web Server 1]
        WEB2[Web Server 2]
        APP1[App Server 1]
        APP2[App Server 2]
    end
    
    subgraph "Data Tier"
        DB[(Primary DB)]
        CACHE[(Redis Cache)]
        REPLICA[(DB Replica)]
    end
    
    Internet --> LB
    LB --> FW
    FW --> WEB1
    FW --> WEB2
    WEB1 --> APP1
    WEB2 --> APP2
    APP1 --> DB
    APP2 --> DB
    APP1 --> CACHE
    APP2 --> CACHE
    DB --> REPLICA
\`\`\`

#### **Sequence Diagrams**
For API interactions and communication flows:

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API
    participant D as Database
    participant L as LLM Service
    
    U->>F: Submit Message
    F->>A: POST /api/chat
    A->>D: Store Message
    A->>L: Generate Response
    L-->>A: Stream Response
    A-->>F: Stream Updates
    F-->>U: Display Response
\`\`\`

#### **State Diagrams**
For application states and transitions:

\`\`\`mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Loading: user_input
    Loading --> Generating: message_stored
    Generating --> Complete: response_done
    Generating --> Error: generation_failed
    Complete --> Idle: reset
    Error --> Idle: retry
    Error --> Loading: retry_input
\`\`\`

#### **Entity Relationship Diagrams**
For database schemas and relationships:

\`\`\`mermaid
erDiagram
    USER ||--o{ CONVERSATION : creates
    USER ||--o{ MESSAGE : sends
    CONVERSATION ||--o{ MESSAGE : contains
    MESSAGE ||--o{ ATTACHMENT : has
    
    USER {
        string id PK
        string email
        string name
        datetime created_at
    }
    
    CONVERSATION {
        string id PK
        string user_id FK
        string title
        datetime created_at
    }
    
    MESSAGE {
        string id PK
        string conversation_id FK
        string user_id FK
        string content
        string role
        datetime created_at
    }
\`\`\`



### Tables for Data Comparison

Use markdown tables for feature comparisons and data presentation:

| Component | Technology | Purpose | Scalability |
|-----------|------------|---------|-------------|
| Frontend | Next.js + React | User Interface | High |
| Database | Convex | Real-time Data | Very High |
| AI Layer | Multiple LLMs | Content Generation | Moderate |

### Mathematical Expressions

For formulas and equations, use LaTeX with KaTeX:
- Inline: $$f(x) = ax^2 + bx + c$$
- Block display:

$$
\\text{Response Time} = \\frac{\\sum_{i=1}^{n} t_i}{n}
$$

### Diagram Selection Guidelines

**Mermaid flowcharts (graph TD/LR/BT/RL) - Required for:**
- Business processes and workflows
- Decision trees and conditional logic
- System architecture (with subgraphs)
- Component relationships
- Data flow diagrams
- Network topology
- Any hierarchical structure
- Infrastructure layouts
- Simple hierarchies (even 2-3 nodes)
- Any structure you would consider drawing as ASCII art

**Mermaid sequence diagrams - Required for:**
- API interactions and request/response flows
- User authentication flows
- Multi-step processes
- Communication protocols
- Timeline of events

**Mermaid state diagrams - Required for:**
- Application states and transitions
- User session management
- Process lifecycle
- Error handling flows
- State machines

**Mermaid ER diagrams - Required for:**
- Database schema design
- Entity relationships
- Data model documentation

**ABSOLUTE RULE: Never use ASCII art for visual representations.** Always convert any visual structure into a Mermaid diagram. The interactive rendering provides superior clarity and user experience.

### Rendering Capabilities

The system automatically renders:
1. **Mermaid diagrams** - Interactive with fullscreen, download, and copy controls
2. **Markdown tables** - Structured data comparison
3. **Math expressions** - LaTeX formulas via KaTeX (inline: $$...$$ or block)
4. **Code blocks** - Syntax highlighting with copy and line wrap controls

**Format selection rules:**
- **Visual structures/diagrams**: ONLY Mermaid (never ASCII art)
- **Data comparison**: Markdown tables
- **Formulas/equations**: LaTeX math expressions ($$...$$)
- **Code examples**: Syntax-highlighted code blocks

### Quality Standards

**All diagrams should be:**
- **Self-documenting** - Clear labels and descriptions
- **Purposeful** - Each diagram serves a specific explanation need
- **Consistent** - Use similar styling and conventions
- **Scalable** - Readable at different zoom levels
- **Accessible** - Include alt text concepts in surrounding context

**Prohibited:**
- ❌ ASCII art for any visual representation (boxes, arrows, hierarchies, flows)
- ❌ Text-based diagrams using characters like ┌ ─ │ └ ▼ ►
- ❌ Any attempt to draw structures using keyboard characters
- ❌ "Simple" text-based visuals (use Mermaid even for 2-3 nodes)

**Required Best Practices:**
- ✅ Always use Mermaid for visual structures (no exceptions)
- ✅ Break complex diagrams into smaller, focused parts
- ✅ Use descriptive labels (avoid "Step 1", "Component A")
- ✅ Provide context explanation before/after diagrams
- ✅ Choose appropriate Mermaid diagram type (flowchart/sequence/state/ER)

**Remember:** The system has full Mermaid support with interactive controls. There is NO reason to ever use ASCII art for visual representations.

## ⚠️ FINAL REMINDER: EXAMPLES OF WHAT NOT TO DO ⚠️

**NEVER output diagrams like this (ASCII art - FORBIDDEN):**
\`\`\`
Object.prototype <---- Base
      ^
      |
      +--- MyClass.prototype
\`\`\`

**ALWAYS convert to Mermaid like this (REQUIRED):**
\`\`\`mermaid
graph TD
    A[Object.prototype<br/>Base for all objects] --> B[MyClass.prototype]
    B --> C[MyClassInstance]
\`\`\`

If you find yourself typing characters like \`<---\`, \`|\`, \`^\`, \`+--\`, STOP immediately and use Mermaid syntax instead.

</visual_formatting>`;
