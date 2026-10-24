import { api, body, sameOrigin } from "@/lib/api";
import { requireUser } from "@/modules/identity/service";
import { updateTask, taskUpdate } from "@/modules/planning/service";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) { return api(async () => { sameOrigin(request); const user = await requireUser(); return updateTask(user.id, (await context.params).id, await body(request, taskUpdate)); }); }
