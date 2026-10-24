import { api, body, sameOrigin } from "@/lib/api";
import { requireUser } from "@/modules/identity/service";
import { startFocus, actFocus, focusStart, focusAction } from "@/modules/focus/service";
export async function POST(request: Request) { return api(async () => { sameOrigin(request); const user = await requireUser(); return startFocus(user.id, await body(request, focusStart)); }); }
export async function PATCH(request: Request) { return api(async () => { sameOrigin(request); const user = await requireUser(); return actFocus(user.id, await body(request, focusAction)); }); }
