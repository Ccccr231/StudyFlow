import { api, body, sameOrigin } from "@/lib/api";
import { requireUser } from "@/modules/identity/service";
import { createTask, newTask } from "@/modules/planning/service";
export async function POST(request: Request) { return api(async () => { sameOrigin(request); const user = await requireUser(); return createTask(user.id, await body(request, newTask)); }); }
