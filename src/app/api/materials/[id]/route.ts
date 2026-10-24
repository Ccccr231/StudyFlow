import { api, sameOrigin } from "@/lib/api";
import { requireUser } from "@/modules/identity/service";
import { readMaterial, deleteMaterial } from "@/modules/knowledge/service";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) { return api(async () => readMaterial((await requireUser()).id, (await context.params).id)); }
export async function DELETE(request: Request, context: Context) { return api(async () => { sameOrigin(request); return deleteMaterial((await requireUser()).id, (await context.params).id); }); }
