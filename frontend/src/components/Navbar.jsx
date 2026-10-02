import { Link, NavLink } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { ArrowUpRight, LogOut, MessageCircle, Palette, UserRound } from "lucide-react";

const Navbar = () => {
  const { logout, authUser } = useAuthStore();
  const navClass = ({ isActive }) => `btn btn-ghost btn-sm gap-2 ${isActive ? "bg-primary/10 text-primary" : "text-base-content/60"}`;
  return (
    <header className="sticky top-0 z-40 h-[4.5rem] border-b border-base-content/10 bg-base-100/95 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="ChitChat home">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-content shadow-sm"><MessageCircle size={21} strokeWidth={2.3} /></span>
          <span className="text-lg font-semibold tracking-tight">ChitChat<span className="text-primary">.</span></span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
          <NavLink to="/settings" className={navClass} aria-label="Appearance"><Palette size={17} /><span className="hidden sm:inline">Appearance</span></NavLink>
          {authUser ? <>
            <NavLink to="/profile" className={navClass} aria-label="Your profile"><UserRound size={17} /><span className="hidden sm:inline">Profile</span></NavLink>
            <span className="mx-1 h-5 w-px bg-base-content/10" />
            <button className="btn btn-ghost btn-sm text-base-content/60" onClick={logout} aria-label="Sign out" title="Sign out"><LogOut size={17} /><span className="hidden md:inline">Sign out</span></button>
          </> : <Link to="/signup" className="btn btn-primary btn-sm gap-2"><span>Get started</span><ArrowUpRight size={16} /></Link>}
        </nav>
      </div>
    </header>
  );
};
export default Navbar;
