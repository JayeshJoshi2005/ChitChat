import { Check, MessageCircle, Palette, Send, Video } from "lucide-react";
import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  return (
    <main className="page-enter mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-12">
      <p className="eyebrow mb-3">Make yourself at home</p><h1 className="text-3xl font-semibold tracking-tight">A little more you.</h1><p className="mt-3 text-sm text-base-content/60">Find the colors that feel right. Your choice is saved automatically.</p>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <section className="surface p-5 sm:p-7" aria-labelledby="theme-heading">
          <div className="mb-6 flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Palette size={20} /></span><div><h2 id="theme-heading" className="font-semibold">Choose your theme</h2><p className="mt-1 text-xs text-base-content/50">{THEMES.length} moods. One ChitChat.</p></div></div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 xl:grid-cols-5">
            {THEMES.map((name) => <button key={name} onClick={() => setTheme(name)} aria-pressed={theme === name} className={`group relative rounded-2xl border p-2.5 text-left transition-colors ${theme === name ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-base-content/10 hover:border-base-content/30"}`}>
              <div data-theme={name} className="mb-2 flex h-12 items-end gap-1 overflow-hidden rounded-lg bg-base-200 p-2"><span className="h-full flex-1 rounded bg-primary" /><span className="h-3/4 flex-1 rounded bg-secondary" /><span className="h-1/2 flex-1 rounded bg-accent" /><span className="h-3/4 flex-1 rounded bg-neutral" /></div>
              <span className="block truncate pr-4 text-[11px] font-medium capitalize">{name}</span>{theme === name && <Check size={13} className="absolute bottom-3 right-2.5 text-primary" />}
            </button>)}
          </div>
        </section>
        <aside className="surface overflow-hidden lg:sticky lg:top-24">
          <div className="border-b border-base-content/10 p-5"><p className="eyebrow">Live preview</p><p className="mt-2 text-xs text-base-content/50">A feel for your next conversation</p></div>
          <div className="flex items-center gap-3 border-b border-base-content/10 p-4"><span className="flex size-9 items-center justify-center rounded-xl bg-secondary/15 text-sm font-medium text-secondary">A</span><div className="flex-1"><p className="text-sm font-medium">Alex Morgan</p><p className="mt-0.5 text-[11px] text-success">Online now</p></div><Video size={18} className="text-primary" /></div>
          <div className="chat-texture space-y-5 bg-base-200/50 p-4 text-xs"><div className="chat chat-start"><div className="chat-bubble bg-base-100 text-base-content shadow-sm">This feels like me.<span className="mt-1 block text-[10px] opacity-40">10:42 AM</span></div></div><div className="chat chat-end"><div className="chat-bubble chat-bubble-primary">A fresh look for a fresh hello.<span className="mt-1 block text-[10px] opacity-60">10:43 AM</span></div></div></div>
          <div className="flex items-center gap-2 p-4"><div className="flex-1 rounded-xl bg-base-200 px-3 py-3 text-xs text-base-content/40">Type a message…</div><span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-content"><Send size={16} /></span></div>
          <div className="flex items-center gap-2 border-t border-base-content/10 p-4 text-[11px] text-base-content/50"><MessageCircle size={14} /><span className="capitalize">{theme}</span> is your current theme</div>
        </aside>
      </div>
    </main>
  );
};
export default SettingsPage;
