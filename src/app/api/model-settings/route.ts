import { api, body, rateLimit, sameOrigin, assert } from "@/lib/api";
import { requireUser } from "@/modules/identity/service";
import { modelSettingsInput, userModelStatus, saveModelSettings, removeModelSettings } from "@/modules/agent/settings";

export async function GET() { return api(async () => userModelStatus((await requireUser()).id)); }
export async function PUT(request: Request) {
  return api(async () => {
    sameOrigin(request);
    const origin = new URL(process.env.APP_ORIGIN || "http://localhost:3000");
    assert(origin.protocol === "https:" || ["localhost", "127.0.0.1"].includes(origin.hostname), 503, "请使用 HTTPS 访问后再保存 API Key");
    const user = await requireUser();
    rateLimit(`model-settings:${user.id}`, 10);
    return saveModelSettings(user.id, await body(request, modelSettingsInput));
  });
}
export async function DELETE(request: Request) { return api(async () => { sameOrigin(request); return removeModelSettings((await requireUser()).id); }); }
