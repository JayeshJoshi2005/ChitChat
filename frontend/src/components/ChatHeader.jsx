import { ArrowLeft, Users, Video, X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const ChatHeader = () => {
  const navigate = useNavigate();
  const [startingCall, setStartingCall] = useState(false);
  const { selectedUser, selectedGroup, setSelectedUser } = useChatStore();
  const { onlineUsers, socket } = useAuthStore();
  const entity = selectedUser || selectedGroup;
  const online = selectedUser && onlineUsers.includes(selectedUser._id);
  const startCall = () => {
    if (startingCall) return;
    if (!socket?.connected) return toast.error("Connect to the server to start a call");
    setStartingCall(true);
    socket.timeout(10000).emit("startVideoCall", selectedGroup ? { groupId: selectedGroup._id } : { userId: selectedUser._id }, (error, response) => {
      setStartingCall(false);
      if (error || !response?.ok) return toast.error(response?.error || "The call server did not respond. Please try again.");
      toast.success("Invitation sent");
      navigate(`/video-call/${response.roomId}`);
    });
  };
  return (
    <header className="flex shrink-0 items-center justify-between gap-2 border-b border-base-content/10 bg-base-100 px-3 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button className="btn btn-ghost btn-sm btn-square md:hidden" onClick={() => setSelectedUser(null)} aria-label="Back to conversations"><ArrowLeft size={19} /></button>
        {selectedGroup && !entity.groupPic ? <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary"><Users size={20} /></span> : <img src={entity.profilePic || entity.groupPic || "/avatar.png"} alt="" className="size-10 rounded-2xl object-cover" />}
        <div className="min-w-0"><h2 className="truncate text-sm font-semibold">{entity.fullName || entity.name}</h2><p className="mt-1 flex items-center gap-1.5 text-xs text-base-content/50">{selectedUser ? <><span className={`size-1.5 rounded-full ${online ? "bg-success" : "bg-base-content/30"}`} />{online ? "Online now" : "Offline"}</> : `${entity.members?.length || 0} members`}</p></div>
      </div>
      <div className="flex shrink-0 items-center gap-1"><button className="btn btn-ghost btn-sm gap-2 text-primary" onClick={startCall} disabled={startingCall} aria-label="Start video call" title="Start video call"><Video size={19} /><span className="hidden lg:inline">Video call</span></button><button className="btn btn-ghost btn-sm btn-square hidden text-base-content/40 md:flex" onClick={() => setSelectedUser(null)} aria-label="Close conversation"><X size={18} /></button></div>
    </header>
  );
};
export default ChatHeader;
