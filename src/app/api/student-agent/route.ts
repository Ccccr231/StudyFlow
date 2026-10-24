import { z } from "zod";
import { api, body, sameOrigin, rateLimit } from "@/lib/api";
import { requireUser } from "@/modules/identity/service";
import { agentHome, readConversation, sendMessage, messageInput, removeAgentItem } from "@/modules/student-agent/service";
export async function GET(request: Request) { return api(async () => { const user = await requireUser(); const id = new URL(request.url).searchParams.get("id"); return id ? readConversation(user.id, id) : agentHome(user.id); }); }
export async function POST(request: Request) { return api(async () => { sameOrigin(request); const user = await requireUser(); rateLimit(`student-agent:${user.id}`, 5); return sendMessage(user.id, await body(request, messageInput)); }); }
export async function DELETE(request: Request) { return api(async () => { sameOrigin(request); const user = await requireUser(); const input = await body(request, z.object({ kind: z.enum(["conversation", "observation"]), id: z.string().min(1) }).strict()); return removeAgentItem(user.id, input.kind, input.id); }); }
