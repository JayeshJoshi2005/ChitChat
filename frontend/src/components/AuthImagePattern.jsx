import { ArrowUpRight, CheckCheck, MessageCircle, Mic, Smile, Video } from "lucide-react";

// eslint-disable-next-line react/prop-types
const AuthImagePattern = ({ title, subtitle }) => (
  <aside className="auth-panel relative hidden flex-col justify-between overflow-hidden rounded-[2rem] border border-base-content/5 bg-base-200 p-10 lg:flex xl:p-14">
    <div className="dot-pattern pointer-events-none absolute inset-0 opacity-40" />
    <div className="relative flex items-center gap-2 text-sm font-medium text-base-content/70">
      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"><Smile size={17} /></span>
      A little closer, every day.
    </div>
    <div className="relative mx-auto my-10 w-full max-w-sm" aria-hidden="true">
      <div className="absolute -inset-8 rounded-full border border-primary/10" />
      <div className="absolute -inset-16 rounded-full border border-primary/5" />
      <div className="relative rounded-2xl border border-base-content/10 bg-base-100 p-5 shadow-xl shadow-base-content/5">
        <div className="mb-5 flex items-center gap-3 border-b border-base-content/5 pb-4">
          <div className="relative flex size-10 items-center justify-center rounded-full bg-secondary/15 text-sm font-semibold text-secondary">A<span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-base-100 bg-success" /></div>
          <div className="flex-1"><p className="text-sm font-semibold">Alex Morgan</p><p className="mt-0.5 text-xs text-base-content/50">Online now</p></div>
          <Video size={18} className="text-primary" />
        </div>
        <div className="space-y-3 text-sm">
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-base-200 px-4 py-3">Hey! It’s been a while. How are you?</div>
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-primary-content">So good to hear from you! Up for a catch-up?<CheckCheck size={14} className="ml-auto mt-1 opacity-70" /></div>
          <div className="flex w-fit items-center gap-2 rounded-2xl rounded-tl-sm bg-base-200 px-4 py-3"><span className="size-1.5 rounded-full bg-base-content/30" /><span className="size-1.5 rounded-full bg-base-content/30" /><span className="size-1.5 rounded-full bg-base-content/30" /></div>
        </div>
      </div>
      <div className="relative -mt-2 ml-auto mr-[-16px] flex w-fit items-center gap-3 rounded-2xl border border-base-content/10 bg-base-100 px-4 py-3 shadow-lg">
        <div className="flex size-10 items-center justify-center rounded-xl bg-success/10 text-success"><Video size={20} /></div>
        <div><p className="text-sm font-semibold">More than a message.</p><p className="text-xs text-base-content/50">Make time for face time.</p></div>
        <ArrowUpRight size={17} className="text-base-content/40" />
      </div>
    </div>
    <div className="relative">
      <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">{title}</h2>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-base-content/60">{subtitle}</p>
      <div className="mt-7 flex flex-wrap gap-3 text-xs text-base-content/70">
        <span className="flex items-center gap-1.5 rounded-full border border-base-content/10 px-3 py-2"><MessageCircle size={14} /> Real-time chats</span>
        <span className="flex items-center gap-1.5 rounded-full border border-base-content/10 px-3 py-2"><Mic size={14} /> Video calls</span>
      </div>
    </div>
  </aside>
);
export default AuthImagePattern;
