import { test } from "node:test";
import assert from "node:assert/strict";
import { rainyStory, savedStoryIndex } from "../src/components/rainy-story";

test("故事进度拒绝损坏记录，恢复已读位置，旧进度不越过结尾", () => {
  for (const value of [null, "", "-1", "1.5", "NaN", "Infinity", "[]", "1x"]) assert.equal(savedStoryIndex(value), 0);
  assert.equal(savedStoryIndex("9"), 9);
  assert.equal(savedStoryIndex("9999"), rainyStory.beats.length - 1);
});

test("分镜保留用户提供的全部对白及顺序", () => {
  assert.deepEqual(rainyStory.beats.filter(beat => beat.speaker !== "旁白").map(beat => beat.text), [
    "还没走？我还以为你早回去了。",
    "学姐？你怎么来了……",
    "路过。多买了一杯，放着也是浪费。",
    "是热的……牛奶？",
    "嗯。别多想，我只是觉得你这个点还喝咖啡会睡不着。",
    "……而且雨这么大，你也没带伞吧。",
    "学姐你怎么知道我没带——",
    "猜的。你这种人一看就是出门不看天气预报。",
    "谢谢学姐，特意跑一趟……",
    "谁、谁特意了！我是来自习的，顺路！顺路懂吗？",
    "嗯，顺路。",
    "快喝。凉了就不好喝了。",
    "还有，这题你卡了半小时了吧。哪不会，指出来。",
  ]);
});
