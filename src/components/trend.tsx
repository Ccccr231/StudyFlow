"use client";
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { Dashboard } from "./types";
export function Trend({ stats }: { stats: Dashboard["stats"] }) {
  return <div className="trend-chart" role="img" aria-label={`本周已专注 ${Math.round(stats.weekSeconds / 60)} 分钟。${stats.week.map(d => `${d.label} ${d.minutes} 分钟`).join("，")}`}><ResponsiveContainer width="100%" height={160}><BarChart data={stats.week} margin={{ top: 15, right: 6, bottom: 0, left: 6 }}><CartesianGrid vertical={false} stroke="#e8edf4" strokeDasharray="3 4" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#65758a", fontSize: 11 }} dy={7} /><Tooltip cursor={{ fill: "#f2f6fc" }} formatter={value => [`${value} 分钟`, "专注"]} contentStyle={{ border: "1px solid #e4ebf5", borderRadius: 12, fontSize: 12 }} /><Bar dataKey="minutes" radius={[5, 5, 0, 0]} maxBarSize={28}>{stats.week.map(d => <Cell key={d.date} fill={d.date === stats.today ? "#245bbb" : "#c2d6ef"} />)}</Bar></BarChart></ResponsiveContainer></div>;
}
