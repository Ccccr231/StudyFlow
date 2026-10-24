import type { Dashboard, Task } from "@/components/types";
import { aggregate, localDate } from "@/modules/analytics/service";
export const datasets = ["demo", "worst", "empty", "one", "thousand"] as const;
export type Dataset = typeof datasets[number];
export function fixture(kind: Dataset): Dashboard {
  const today = localDate();
  const task = (id: number, title = "完成 Stolz 定理的三道练习"): Task => ({ id: `fixture-task-${id}`, title, subject: "高等数学", planId: "fixture-plan", scheduledDate: today, estimatedMinutes: 25, completed: false });
  const worstTitles = [
    "完成高等数学极限章节的错题归纳、证明步骤复核与三种解法对照，并整理给下周讨论班的提问清单和参考例题",
    "https://example.com/learning/control-systems/frequency-response-and-closed-loop-stability-reference-notes-2026",
    "复核 Đặng Thị Ngọc Hân 提交的实验数据与误差分析",
    "<script>alert('仅为显示测试')</script> &amp; **学习笔记标题**",
    "复习",
    "整理实验台记录\n补全测量单位与有效数字",
    "Benachrichtigungseinstellungen und Lernfortschrittsanalyse",
    "复核传感器标定步骤及环境系统控制实验报告（讨论稿·第二次修订·补充原始数据记录与不确定度说明）",
    "完成高等数学极限章节的错题归纳、证明步骤复核与三种解法对照，并整理给下周讨论班的提问清单和参考例题"
  ];
  const tasks = kind === "empty" ? [] : kind === "one" ? [task(1, "J 的第一段专注")] : kind === "thousand" ? Array.from({ length: 1000 }, (_, i) => ({ ...task(i, `第 ${i + 1} 次课程笔记与习题复核`), completed: i % 4 === 0 })) : kind === "worst" ? worstTitles.map((title, i) => ({ ...task(i, title), subject: ["环境系统工程与智能控制基础研究方法", "自主学习", "اختبار التعلّم", "数学"][i % 4], estimatedMinutes: [480, 1, 25][i % 3], completed: i % 3 === 0 })) : [task(1), { ...task(2, "整理控制系统的基础概念"), subject: "自动控制", completed: true }, { ...task(3, "阅读实验记录，复核有效数字"), subject: "环境工程" }];
  const stats = aggregate([], tasks, today);
  if (kind !== "empty") { stats.sessions = kind === "worst" ? 1284 : kind === "one" ? 1 : 3; stats.todaySeconds = kind === "worst" ? 25260 : 1500; stats.weekSeconds = kind === "worst" ? 128400 : 4500; stats.week = stats.week.map((day, i) => ({ ...day, minutes: kind === "worst" ? [360, 220, 0, 480, 315, 150, 615][i] : [25, 0, 45, 0, 0, 5, 0][i] })); }
  return {
    user: { id: "fixture-user", name: kind === "worst" ? "👩🏽‍💻 实验室伙伴·环境系统与智能控制" : kind === "one" ? "J" : "小理同学", username: kind === "worst" ? "environment_control_research_lab" : "ui_fixture" },
    tasks, plans: kind === "empty" ? [] : [{ id: "fixture-plan", title: kind === "worst" ? "环境系统与智能控制跨学科学习路线：从高等数学、线性代数和概率统计到传感器标定与闭环控制实验" : "从极限出发，走向更清楚的数学", goal: kind === "worst" ? "建立可以复核的学习记录，完成阶段练习并整理实验验证结果。".repeat(12) : "让每次练习，都成为下一步的底气。" }],
    focus: [], activeFocus: null, agentRuns: [], stats,
    model: { configured: false, name: kind === "worst" ? "laboratory-model-pool/local-qwen-tool-calling-2026-autumn-internal" : "暂未连接模型", kind: "开发预览" },
    serverNow: new Date().toISOString()
  };
}
