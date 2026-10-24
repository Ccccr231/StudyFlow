// 静态场景均由本地提供；后续天气联动可在此扩展。
export const scene = {
  name: "林连理",
  romanizedName: "LIN LIANLI",
  character: "/assets/generated/lianli-hd.png",
  companion: "/assets/generated/lianli-chibi-hd.png",
  greeting: "准备好今天的学习了吗？",
  aside: "别误会，我才不是特意等你。只是……顺路陪你走一段而已。",
  location: "大连理工大学 · 凌水校区",
  gate: "/assets/generated/dlut-gate-summer-v2.webp",
  avenue: "/assets/generated/sycamore-avenue.webp"
};

export const studyScenes = [
  { id: "avenue", label: "梧桐树下", caption: "风穿过树叶，今天也慢慢向前。", image: scene.avenue },
  { id: "library", label: "午后自习室", caption: "阳光落在书页上，留一段时间给自己。", image: "/assets/generated/library-afternoon.webp" },
  { id: "rain", label: "雨夜自习室", caption: "窗外有雨，桌边有光。", image: "/assets/generated/rainy-study.webp" }
] as const;
export type StudySceneId = typeof studyScenes[number]["id"];

// 本地角色台词，与模型服务无关。后续 LearnBuddy 对接另行实现。
export const characterLines = {
  hello: "计划本我放这里了。别误会，我才不是特意帮你……先选一件小事，好好做完。",
  focused: "别东张西望，先把眼前这件事做好。……我就在这里，不会打扰你。",
  happy: "今天的任务都完成了？还、还不错嘛。热牛奶放桌上了，记得趁热喝。",
  praise: "谁、谁要你夸了！我只是刚好会而已。……下次遇到问题，也可以来找我。",
  rest: "累了就休息，逞什么强。去伸个懒腰，喝点水……回来我还在。"
};
