export type StoryMood = "neutral" | "blush" | "gentle";
type StoryBeat = {
  speaker: "连理" | "我" | "旁白";
  text: string;
  direction?: string;
  mood?: StoryMood;
  art?: "milk";
  alone?: boolean;
};

export const rainyStory = {
  title: "雨夜 · 自习室",
  subtitle: "她说，只是顺路。",
  storageKey: "studyflow.story.rainy-study.v1",
  music: {
    title: process.env.NEXT_PUBLIC_STORY_MUSIC_TITLE ?? "野牡丹の紫",
    src: process.env.NEXT_PUBLIC_STORY_MUSIC_URL ?? "/assets/stories/rainy-study/nobotan-no-murasaki.ogg",
  },
  background: "/assets/generated/rainy-study.webp",
  cg: "/assets/stories/rainy-study/milk-cg.webp",
  portraits: {
    neutral: "/assets/stories/rainy-study/lianli-neutral.webp",
    blush: "/assets/stories/rainy-study/lianli-blush.webp",
    gentle: "/assets/stories/rainy-study/lianli-gentle.webp",
  },
  beats: [
    { speaker: "旁白", text: "窗外雨声密集，自习室只剩最后两排灯。我正对着摊开的作业走神，门被轻轻推开。", alone: true },
    { speaker: "连理", direction: "收着伞，发梢挂着水珠，护目镜歪在脖子上，语气很平", text: "还没走？我还以为你早回去了。", mood: "neutral" },
    { speaker: "我", text: "学姐？你怎么来了……", mood: "neutral" },
    { speaker: "连理", direction: "把伞靠墙放好，走过来，把一个纸杯放到我桌上，动作很快", text: "路过。多买了一杯，放着也是浪费。", art: "milk", mood: "neutral" },
    { speaker: "旁白", text: "她的视线移向窗外，不看我。", art: "milk", mood: "neutral" },
    { speaker: "我", direction: "纸杯烫手，杯壁还贴着便利店的标签", text: "是热的……牛奶？", art: "milk", mood: "neutral" },
    { speaker: "连理", direction: "拉开旁边椅子坐下，翻开自己的笔记本", text: "嗯。别多想，我只是觉得你这个点还喝咖啡会睡不着。", mood: "neutral" },
    { speaker: "连理", direction: "笔尖顿了一下", text: "……而且雨这么大，你也没带伞吧。", mood: "neutral" },
    { speaker: "我", text: "学姐你怎么知道我没带——", mood: "neutral" },
    { speaker: "连理", direction: "迅速打断", text: "猜的。你这种人一看就是出门不看天气预报。", mood: "blush" },
    { speaker: "旁白", text: "她耳尖有点红，低头假装看笔记。", mood: "blush" },
    { speaker: "我", text: "谢谢学姐，特意跑一趟……", mood: "blush" },
    { speaker: "连理", direction: "抬头，呆毛弹了一下", text: "谁、谁特意了！我是来自习的，顺路！顺路懂吗？", mood: "blush" },
    { speaker: "旁白", text: "说完她自己也觉得底气不足，抿了下嘴，把笔记翻得哗啦响。", mood: "blush" },
    { speaker: "我", direction: "忍不住笑", text: "嗯，顺路。", mood: "gentle" },
    { speaker: "连理", direction: "沉默两秒，声音低下去", text: "快喝。凉了就不好喝了。", mood: "gentle" },
    { speaker: "连理", direction: "把笔记本往我这边推了推", text: "还有，这题你卡了半小时了吧。哪不会，指出来。", mood: "gentle" },
    { speaker: "旁白", text: "雨声还在下。她嘴上说着顺路，笔记却已经翻到了我卡住的那一页。", mood: "gentle" },
  ] as StoryBeat[],
};

export function savedStoryIndex(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) return 0;
  return Math.min(Number(value), rainyStory.beats.length - 1);
}
