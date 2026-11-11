import type { Metadata } from "next";
import "./globals.css";
import "./visual-novel.css";
import "./campus-scenes.css";
import "./story-reader.css";
import "./student-agent.css";
import "./liquid-glass.css";
export const metadata: Metadata = { title: "StudyFlow · 每一小步，都算数", description: "你的内网 AI 伴学空间。规划、专注、记录，让成长有迹可循。" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="zh-CN"><body>{children}</body></html>; }
