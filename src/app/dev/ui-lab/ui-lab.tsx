"use client";
import { useEffect, useMemo, useState } from "react";
import { StudyFlow } from "@/components/studyflow";
import { datasets, fixture, type Dataset } from "./fixtures";
export function UiLab() {
  const [kind, setKind] = useState<Dataset>("demo");
  useEffect(() => { const value = new URLSearchParams(location.search).get("data"); if (datasets.includes(value as Dataset)) setKind(value as Dataset); }, []);
  const data = useMemo(() => fixture(kind), [kind]);
  const labels = ["Demo data", "Worst case", "Empty", "One", "1,000 rows"];
  return <><div className="ui-lab-label">开发预览 · 独立测试数据 · 不写入学习记录</div><div className="ui-lab-content"><StudyFlow previewData={data} /></div><div className="ui-lab-toggle" role="group" aria-label="UI 压力测试数据">{datasets.map((value, index) => <button key={value} aria-pressed={kind === value} onClick={() => { setKind(value); const url = new URL(location.href); url.searchParams.set("data", value); history.replaceState(null, "", url); }}>{labels[index]}</button>)}</div></>;
}
