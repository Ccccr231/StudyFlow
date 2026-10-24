import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { db } from "../src/lib/db";
const path = "test-results/student-agent/qa-account.json";
async function main() {
  try {
    if (!existsSync(path)) return;
    const account = JSON.parse(readFileSync(path, "utf8"));
    if (typeof account.username !== "string" || !/^sa_qa_a_[a-z0-9]+$/.test(account.username) || typeof account.userId !== "string") throw new Error("不是本轮专用验收账号，拒绝清理");
    const deleted = await db.user.deleteMany({ where: { id: account.userId, username: account.username } });
    unlinkSync(path);
    console.log(`Removed ${deleted.count} exact QA account; temporary credentials deleted.`);
  } finally { await db.$disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Cleanup failed"); process.exitCode = 1; });
