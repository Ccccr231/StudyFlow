import { api, body, sameOrigin, rateLimit } from "@/lib/api";
import { requireUser } from "@/modules/identity/service";
import { addMaterial, listMaterials, materialInput } from "@/modules/knowledge/service";
export async function GET() { return api(async () => listMaterials((await requireUser()).id)); }
export async function POST(request: Request) { return api(async () => {
  sameOrigin(request); const user = await requireUser(); rateLimit(`materials:${user.id}`, 10);
  return addMaterial(user.id, await body(request, materialInput));
}); }
