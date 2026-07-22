import type { ToolCategory } from "./api";

export type TraceCall = {
  id: string;
  tool: string;
  category: ToolCategory;
  args: Record<string, unknown>;
  result?: unknown;
  agent?: string;
};

export type Answer = {
  summary: string[];
  trends: string[];
  investigationAreas: string[];
  recommendation: string;
  reasoning: string;
};

export type Turn = {
  id: string;
  question: string;
  trace: TraceCall[];
  routing?: string[];
  answer: Answer | null;
  error: string | null;
  isRunning: boolean;
};
