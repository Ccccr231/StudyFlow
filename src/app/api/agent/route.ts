import { z } from "zod";
import { api, body, rateLimit, sameOrigin } from "@/lib/api";
import { requireUser } from "@/modules/identity/service";
import { propose, decide } from "@/modules/agent/service";
export async function POST(request: Request) { return api(async () => { sameOrigin(request); const user = await requireUser(); rateLimit(`agent:${user.id}`, 5); const input = await body(request, z.object({ prompt: z.string().trim().min(2).max(2000) })); return propose(user.id, input.prompt); }); }
export async function PATCH(request: Request) { return api(async () => { sameOrigin(request); const user = await requireUser(); const input = await body(request, z.object({ id: z.string(), approve: z.boolean() })); return decide(user.id, input.id, input.approve); }); }
