import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Camera, Check, Mail, UserRound } from "lucide-react";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { authUser, isUpdatingProfile, updateProfile } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(null);
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Choose an image smaller than 5 MB");
    const reader = new FileReader();
    reader.onload = async () => { setSelectedImg(reader.result); await updateProfile({ profilePic: reader.result }); setSelectedImg(null); };
    reader.readAsDataURL(file);
    event.target.value = "";
  };
  return (
    <main className="page-enter mx-auto max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
      <p className="eyebrow mb-3">The person behind the hello</p><h1 className="text-3xl font-semibold tracking-tight">Your profile.</h1><p className="mt-3 text-sm text-base-content/60">A familiar face makes every conversation better.</p>
      <div className="surface mt-8 overflow-hidden">
        <div className="auth-panel dot-pattern h-32 bg-primary/5 sm:h-40" />
        <div className="px-5 pb-7 sm:px-9 sm:pb-9">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative w-fit"><img src={selectedImg || authUser.profilePic || "/avatar.png"} alt="Your profile" className="size-28 rounded-[2rem] border-[5px] border-base-100 bg-base-200 object-cover shadow-sm" /><label htmlFor="avatar-upload" className={`absolute -bottom-1 -right-1 flex size-9 cursor-pointer items-center justify-center rounded-xl border-[3px] border-base-100 bg-primary text-primary-content shadow-sm transition-colors hover:bg-primary/80 ${isUpdatingProfile ? "pointer-events-none" : ""}`}><span className="sr-only">Upload profile photo</span>{isUpdatingProfile ? <span className="loading loading-spinner loading-xs" /> : <Camera size={16} />}</label></div>
            <div className="flex flex-col items-start gap-1.5 sm:items-end"><label htmlFor="avatar-upload" className={`btn btn-sm btn-outline gap-2 ${isUpdatingProfile ? "btn-disabled" : ""}`}><Camera size={14} />{isUpdatingProfile ? "Uploading…" : "Change photo"}</label><p className="text-[11px] text-base-content/40">Image files, up to 5 MB</p></div>
            <input type="file" id="avatar-upload" className="sr-only" accept="image/*" onChange={handleImageUpload} disabled={isUpdatingProfile} />
          </div>
          <h2 className="mt-6 text-2xl font-semibold tracking-tight">{authUser.fullName}</h2><p className="mt-1 break-all text-sm text-base-content/50">{authUser.email}</p>
          <div className="mt-8 grid gap-5 border-t border-base-content/10 pt-7 sm:grid-cols-2">
            <div><p className="mb-2 flex items-center gap-2 text-xs font-medium text-base-content/50"><UserRound size={14} />Full name</p><p className="rounded-xl border border-base-content/10 bg-base-200/40 px-4 py-3 text-sm">{authUser.fullName}</p></div>
            <div><p className="mb-2 flex items-center gap-2 text-xs font-medium text-base-content/50"><Mail size={14} />Email address</p><p className="break-all rounded-xl border border-base-content/10 bg-base-200/40 px-4 py-3 text-sm">{authUser.email}</p></div>
          </div>
          <div className="mt-7 rounded-2xl bg-base-200/60 p-5"><h3 className="mb-4 text-sm font-semibold">Account details</h3><div className="flex items-center justify-between gap-4 text-xs"><span className="text-base-content/50">Member since</span><span>{authUser.createdAt ? new Date(authUser.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }) : "—"}</span></div><div className="mt-4 flex items-center justify-between border-t border-base-content/10 pt-4 text-xs"><span className="text-base-content/50">Account status</span><span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-success"><Check size={12} />Active</span></div></div>
        </div>
      </div>
    </main>
  );
};
export default ProfilePage;
