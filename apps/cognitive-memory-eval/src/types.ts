export type Persona = {
  id: string; // persona_001
  name: string;
  age: number;
  occupation: string;
  interests: string[];
  personality: string;
  communicationStyle: string;
};

export type EvidenceType = "factual" | "temporal" | "preference" | "opinion";

export type Evidence = {
  id: string;
  type: EvidenceType;
  statement: string;
  importance: number; // 0..1
  category: string;
};

export type Message = {
  role: "user";
  content: string;
  timestamp: number;
  evidence: Evidence[];
};

export type Conversation = {
  id: string;
  personaId: string;
  sessionNumber: number; // 1..4
  timestamp: number; // ms
  messages: Message[];
};

export type QuestionType = "factual" | "temporal" | "preference" | "inference";
export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  id: string;
  personaId: string;
  question: string;
  type: QuestionType;
  expectedEvidence: string[];
  difficulty: Difficulty;
  sessionSpan: number[];
  reasoning: string;
};

export type AnswerVariant = "basic" | "cognitive";

export type AnswerRow = {
  questionId: string;
  personaId: string;
  variant: AnswerVariant;
  answer: string;
  retrievedMemories: Array<{
    id: string;
    content: string;
    relevanceScore: number;
    finalScore: number;
    retention: number;
    metadata?: Record<string, unknown>;
  }>;
  timestamp: number;
  retrievalTimeMs: number;
};

export type JudgmentRow = {
  questionId: string;
  personaId: string;
  variant: AnswerVariant;
  accuracy: number;
  completeness: number;
  relevance: number;
  reasoning: string;
  timestamp: number;
};

export type VariantMetrics = {
  variant: AnswerVariant;
  overallScore: number;
  accuracy: number;
  completeness: number;
  relevance: number;
  byType: Record<QuestionType, number>;
  byDifficulty: Record<Difficulty, number>;
  bySession: Record<"session1" | "session2" | "session3" | "session4", number>;
  avgRetrievalTimeMs: number;
  avgMemoriesRetrieved: number;
  n: number;
};
