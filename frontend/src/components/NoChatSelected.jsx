import { ArrowLeft, MessageCircle, Users, Video } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
const NoChatSelected = () => {
  const { authUser } = useAuthStore();
  return (
    <section className="auth-panel hidden min-w-0 flex-1 flex-col items-center justify-center p-5 md:flex sm:p-12">
      <div className="page-enter max-w-md text-center">
        <div className="relative mx-auto mb-8 flex size-24 items-center justify-center rounded-[2rem] border border-primary/15 bg-primary/10 text-primary">
          <MessageCircle size={42} strokeWidth={1.5} />
          <span className="absolute -right-2 -top-2 flex size-9 items-center justify-center rounded-xl border border-base-content/10 bg-base-100 text-success shadow-sm"><Video size={17} /></span>
        </div>
        <p className="eyebrow mb-3">Your everyday connection</p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Hey, {authUser?.fullName?.split(" ")[0] || "there"}.</h1>
        <p className="mt-3 text-sm leading-relaxed text-base-content/60">A quick hello can go a long way. Choose a person or a group and get the conversation going.</p>
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-base-content/50"><ArrowLeft size={15} /> Pick a conversation to get started</div>
        <div className="mt-10 hidden grid-cols-3 gap-3 border-t border-base-content/10 pt-6 sm:grid">
          {[{ icon: MessageCircle, label: "Say hello" }, { icon: Users, label: "Bring your people" }, { icon: Video, label: "Meet face to face" }].map(({ icon: Icon, label }) => <div key={label} className="flex flex-col items-center gap-2 text-xs text-base-content/50"><Icon size={19} strokeWidth={1.5} />{label}</div>)}
        </div>
      </div>
    </section>
  );
};
export default NoChatSelected;
