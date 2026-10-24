export type MaterialSource = { id: string; materialId: string; title: string; subject: string; locator: string; text: string };
export type ToolTrace = { name: string; label: string; ok: boolean; summary: string; sources?: MaterialSource[]; proposalId?: string };
export type ConversationMessage = { id: string; role: string; content: string; trace: ToolTrace[]; createdAt: string };
export type Conversation = { id: string; title: string; messages: ConversationMessage[] };
export type AgentHome = {
  conversations: { id: string; title: string; updatedAt: string }[];
  observations: { id: string; topic: string; observation: string; evidence: string; createdAt: string }[];
};
export type Material = { id: string; title: string; subject: string; _count: { chunks: number } };
