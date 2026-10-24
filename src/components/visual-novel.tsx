"use client";

import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Eye, EyeOff, History, Pause, Play, RotateCcw, X, CloudRain, Music2, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { rainyStory, savedStoryIndex, type StoryMood } from "./rainy-story";

export function VisualNovel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [history, setHistory] = useState(false);
  useEffect(() => { if (!open) setHistory(false); }, [open]);
  return <Dialog open={open} onOpenChange={value => { if (!value) onClose(); }}>
    <DialogContent className="story-dialog" showCloseButton={false} aria-describedby="story-description" onEscapeKeyDown={event => {
      if (history) { event.preventDefault(); setHistory(false); }
    }}>
      <DialogTitle className="sr-only">羁遇故事：{rainyStory.title}</DialogTitle>
      <DialogDescription id="story-description" className="sr-only">点击画面或按空格、右方向键推进对白，左方向键回看。Escape 返回学习空间。阅读进度保存在此浏览器。</DialogDescription>
      {open && <StoryReader onClose={onClose} history={history} setHistory={setHistory} />}
    </DialogContent>
  </Dialog>;
}

function StoryReader({ onClose, history, setHistory }: { onClose: () => void; history: boolean; setHistory: (value: boolean) => void }) {
  const [index, setIndex] = useState(() => {
    try { return savedStoryIndex(localStorage.getItem(rainyStory.storageKey)); } catch { return 0; }
  });
  const [revealed, setRevealed] = useState(0);
  const [auto, setAuto] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const [audioError, setAudioError] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const stage = useRef<HTMLElement>(null);
  const historyButton = useRef<HTMLButtonElement>(null);
  const historyPanel = useRef<HTMLElement>(null);
  const beat = rainyStory.beats[index];
  const mood: StoryMood = beat.mood ?? "neutral";
  const text = beat.speaker === "旁白" ? beat.text : `“${beat.text}”`;
  const complete = revealed >= text.length;
  const last = index === rainyStory.beats.length - 1;

  useEffect(() => {
    for (const src of [rainyStory.background, rainyStory.cg, ...Object.values(rainyStory.portraits)]) {
      const image = new Image(); image.src = src;
    }
    stage.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    player.volume = 0.3;
    void player.play().catch(() => setMusicPlaying(false));
    return () => { player.pause(); };
  }, []);

  function toggleMusic() {
    if (!audio.current) return;
    if (audio.current.paused) void audio.current.play().catch(() => setAudioError(true));
    else audio.current.pause();
  }

  useEffect(() => {
    try { localStorage.setItem(rainyStory.storageKey, String(index)); } catch { setStorageAvailable(false); }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setRevealed(text.length); return; }
    setRevealed(0);
    const started = Date.now();
    const id = setInterval(() => {
      const count = Math.min(text.length, Math.floor((Date.now() - started) / 30));
      setRevealed(previous => Math.max(previous, count));
      if (count >= text.length) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [index, text]);

  useEffect(() => {
    if (last) { setAuto(false); return; }
    if (!auto || !complete || hidden || history) return;
    const id = setTimeout(() => {
      if (document.visibilityState === "visible") { setRevealed(0); setIndex(value => Math.min(value + 1, rainyStory.beats.length - 1)); }
      else setAuto(false);
    }, Math.max(2400, text.length * 95));
    return () => clearTimeout(id);
  }, [auto, complete, hidden, history, index, last, text.length]);

  useEffect(() => {
    const pause = () => { if (document.hidden) setAuto(false); };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);

  useEffect(() => { if (history) historyPanel.current?.focus(); else if (historyButton.current) stage.current?.focus({ preventScroll: true }); }, [history]);
  useEffect(() => { stage.current?.focus({ preventScroll: true }); }, [hidden]);

  function advance() {
    if (history) return;
    if (hidden) { setHidden(false); return; }
    if (!complete) { setRevealed(text.length); return; }
    if (!last) { setRevealed(0); setIndex(value => value + 1); }
  }
  function previous() { setAuto(false); setRevealed(0); setIndex(value => Math.max(0, value - 1)); }
  function closeHistory() { setHistory(false); requestAnimationFrame(() => historyButton.current?.focus()); }

  return <section ref={stage} tabIndex={-1} className={`story-reader ${hidden ? "story-ui-hidden" : ""} ${beat.art ? "story-cg-active" : ""}`} aria-label="雨夜自习室故事阅读器" onKeyDown={event => {
    if (history) { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeHistory(); } return; }
    if ((event.target as HTMLElement).closest("input,textarea,select")) return;
    if ((event.target as HTMLElement).closest("button") && (event.key === " " || event.key === "Enter")) return;
    if (event.key === " " || event.key === "Enter" || event.key === "ArrowRight") { event.preventDefault(); advance(); }
    if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
  }}>
    {rainyStory.music.src && <audio ref={audio} src={rainyStory.music.src} loop preload="auto" onPlay={() => { setMusicPlaying(true); setAudioError(false); }} onPause={() => setMusicPlaying(false)} onError={() => { setMusicPlaying(false); setAudioError(true); }} />}
    <div className="story-main" inert={history}>
      <div className="story-backdrop" style={{ backgroundImage: `url('${rainyStory.background}')` }} role="img" aria-label="窗外落着雨，大学自习室亮着最后几盏暖灯" />
      <div className={`story-cg ${beat.art ? "is-visible" : ""}`} style={{ backgroundImage: `url('${rainyStory.cg}')` }} role={beat.art ? "img" : undefined} aria-label={beat.art ? "连理把热牛奶轻轻放在桌上，目光悄悄移向窗外" : undefined} aria-hidden={!beat.art} />
      {!beat.alone && !beat.art && <img key={mood} className="story-character" src={rainyStory.portraits[mood]} alt={`连理${mood === "blush" ? "害羞地红了脸" : mood === "gentle" ? "目光柔和，拿着笔记本" : "收起伞后平静地望过来"}`} width={1024} height={1536} />}
      <div className="story-shade" aria-hidden="true" />
      <button className="story-advance-area" tabIndex={-1} aria-label={hidden ? "显示对话" : complete ? "下一句" : "显示完整对白"} onClick={advance} />

      <header className="story-header">
        <div className="story-chapter"><span><CloudRain size={15} />羁遇故事 <i /> CHAPTER 01</span><h2>{rainyStory.title}</h2></div>
        <div className="story-header-actions">{rainyStory.music.src && <div className="story-music"><button onClick={toggleMusic} aria-label={`${musicPlaying ? "暂停" : "播放"}背景音乐：${rainyStory.music.title}`} aria-pressed={musicPlaying}><Music2 size={14} /><span>{rainyStory.music.title}</span>{musicPlaying ? <Pause size={13} /> : <Play size={13} />}</button><label><Volume2 size={13} /><input type="range" min="0" max="1" step="0.01" value={volume} aria-label="背景音乐音量" onChange={event => { const value = Number(event.target.value); setVolume(value); if (audio.current) audio.current.volume = value; }} /></label>{audioError && <small role="status">音乐暂时无法播放，点击重试</small>}</div>}<button className="story-return" onClick={onClose}><X size={17} /><span>返回学习空间</span></button></div>
      </header>
      {index === 0 && <div className="story-opening" aria-hidden="true"><span>与你相遇的每一天</span><p>{rainyStory.subtitle}</p><i /></div>}

      <div className="story-bottom">
        <div className={`story-dialogue ${beat.speaker === "旁白" ? "is-narration" : ""}`}>
          {beat.speaker !== "旁白" && <div className="story-speaker"><span>{beat.speaker === "连理" ? "林 连 理" : "我"}</span><small>{beat.speaker === "连理" ? "LIN LIANLI" : "YOU"}</small><i /></div>}
          {beat.direction && <p className="story-direction">（{beat.direction}）</p>}
          <p className="story-line" aria-hidden="true">{text.slice(0, revealed)}<span className={complete ? "story-caret is-ready" : "story-caret"}>◆</span></p>
          <p className="sr-only" aria-live="polite" aria-atomic="true">{beat.speaker}：{beat.direction ? `（${beat.direction}）` : ""}{text}</p>
          {last && complete && <div className="story-ending"><span>这一夜，连雨声也温柔了一点。</span><button onClick={onClose}>带着这份温暖，继续学习 <ChevronRight size={15} /></button></div>}
        </div>
        <footer className="story-toolbar">
          <span className="story-position">{String(index + 1).padStart(2, "0")}<i />{String(rainyStory.beats.length).padStart(2, "0")}<small>{storageAvailable ? "进度已记住" : "本次阅读"}</small></span>
          <div className="story-tools">
            <button onClick={previous} disabled={index === 0} aria-label="上一句"><ChevronLeft size={17} /><span>回退</span></button>
            <button ref={historyButton} onClick={() => { setAuto(false); setHistory(true); }} aria-expanded={history} aria-controls="story-history"><History size={16} /><span>回看</span></button>
            <button onClick={() => setAuto(value => !value)} aria-pressed={auto} disabled={last}>{auto ? <Pause size={15} /> : <Play size={15} />}<span>{auto ? "暂停" : "自动"}</span></button>
            <button onClick={() => { setAuto(false); setHidden(true); }} aria-label="隐藏对话，欣赏画面"><EyeOff size={16} /><span>画面</span></button>
            <button onClick={() => { setAuto(false); if (index === 0) setRevealed(text.length); else { setRevealed(0); setIndex(0); } }} aria-label="从头阅读"><RotateCcw size={15} /><span>重读</span></button>
            <button className="story-next" onClick={last && complete ? onClose : advance}><span>{last && complete ? "结束" : "继续"}</span><ChevronRight size={19} /></button>
          </div>
        </footer>
        <span className="story-keyboard-hint">点击画面 / 空格继续 · ← 回退 · Esc 返回</span>
      </div>
      {hidden && <button className="story-show-ui" onClick={() => setHidden(false)}><Eye size={17} />显示对话</button>}
    </div>

    {history && <aside ref={historyPanel} id="story-history" tabIndex={-1} className="story-history" aria-label="已读对白回看" onKeyDown={event => {
      if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closeHistory(); }
    }}>
      <div className="story-history-heading"><div><BookOpen size={18} /><h3>雨声里的对白</h3></div><button onClick={closeHistory} aria-label="关闭对白回看"><X size={20} /></button></div>
      <p>只收藏，已经一起读过的这一段。</p>
      <ol>{rainyStory.beats.slice(0, index + 1).map((item, position) => <li key={position}><span>{item.speaker}</span><button onClick={() => { if (position === index) setRevealed(text.length); else { setIndex(position); setRevealed(0); } closeHistory(); }} aria-label={`回到第 ${position + 1} 句：${item.text}`}><small>{item.direction}</small>{item.text}</button></li>)}</ol>
    </aside>}
  </section>;
}
