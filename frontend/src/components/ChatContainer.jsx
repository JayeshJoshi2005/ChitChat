import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle, Video } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatMessageTime } from "../lib/utils";
import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import TypingIndicator from "./TypingIndicator";
import MessageSkeleton from "./skeletons/MessageSkeleton";

const ChatContainer = () => {
  const { messages, getMessages, getGroupMessages, isMessagesLoading, selectedUser, selectedGroup, subscribeToMessages, subscribeToGroupMessages } = useChatStore();
  const { authUser, socket } = useAuthStore();
  const groupId = selectedGroup?._id;
  useEffect(() => {
    if (!socket || !groupId) return;
    const join = () => socket.emit("joinGroup", groupId);
    socket.on("connect", join);
    if (socket.connected) join();
    return () => {
      socket.off("connect", join);
      if (socket.connected) socket.emit("leaveGroup", groupId);
    };
  }, [socket, groupId]);
  const messageEndRef = useRef(null);
  useEffect(() => {
    if (selectedUser) { getMessages(selectedUser._id); return subscribeToMessages(socket); }
    if (selectedGroup) { getGroupMessages(selectedGroup._id); return subscribeToGroupMessages(socket); }
  }, [socket, selectedUser, selectedGroup, getMessages, getGroupMessages, subscribeToMessages, subscribeToGroupMessages]);
  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" aria-label="Chat">
      <ChatHeader />
      {isMessagesLoading ? <MessageSkeleton /> : <div className="chat-texture min-h-0 flex-1 overflow-y-auto bg-base-200/40 p-4 sm:p-6" role="log" aria-label="Messages" aria-live="polite">
        <div className="mx-auto max-w-4xl space-y-4">
          {messages.length > 0 && <div className="flex items-center justify-center gap-2 pb-4 text-[10px] text-base-content/40"><MessageCircle size={12} /> This is the start of your conversation</div>}
          {!messages.length && <div className="flex min-h-64 flex-col items-center justify-center text-center"><span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MessageCircle size={25} strokeWidth={1.5} /></span><h3 className="text-lg font-semibold">Every conversation starts somewhere.</h3><p className="mt-2 text-xs text-base-content/50">Send a message and break the ice.</p></div>}
          {messages.map((message) => {
            const senderId = message.senderId?._id || message.senderId;
            const own = senderId === authUser._id;
            const callPath = message.text?.includes("Video call started:") ? message.text.match(/\/video-call\/[a-zA-Z0-9-]+/)?.[0] : null;
            return <div key={message._id} className={`chat ${own ? "chat-end" : "chat-start"}`}>
              <div className="chat-image avatar"><div className="size-8 rounded-xl"><img src={own ? authUser.profilePic || "/avatar.png" : (selectedUser?.profilePic || message.senderId?.profilePic || "/avatar.png")} alt="" /></div></div>
              <div className="chat-header mb-1 flex items-center gap-2 text-[10px] text-base-content/40">{selectedGroup && !own && <span className="font-medium text-base-content/60">{message.senderId?.fullName}</span>}<time dateTime={message.createdAt}>{formatMessageTime(message.createdAt)}</time></div>
              <div className={`chat-bubble max-w-[85%] break-words text-sm leading-relaxed shadow-sm sm:max-w-[75%] ${own ? "chat-bubble-primary" : "bg-base-100 text-base-content"}`}>
                {message.image && <a href={message.image} target="_blank" rel="noopener noreferrer" aria-label="Open attached image"><img src={message.image} alt="Shared image" className={`max-h-72 w-full max-w-xs rounded-xl object-contain ${message.text ? "mb-2" : ""}`} /></a>}
                {callPath ? <div className="min-w-0 space-y-3 sm:min-w-56"><div className="flex items-center gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${own ? "bg-primary-content/15" : "bg-primary/10 text-primary"}`}><Video size={20} /></span><div><p className="font-semibold">Let’s catch up.</p><p className="text-xs opacity-60">You’re invited to a video call</p></div></div><Link to={callPath} className={`btn btn-sm w-full ${own ? "border-primary-content/20 bg-primary-content/15 text-primary-content hover:bg-primary-content/25" : "btn-primary"}`}>Join video call<ArrowUpRight size={15} /></Link></div> : message.text && <p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{message.text}</p>}
              </div>
            </div>;
          })}
          <div ref={messageEndRef} />
        </div>
      </div>}
      <TypingIndicator />
      <MessageInput key={selectedUser?._id || selectedGroup?._id} />
    </section>
  );
};
export default ChatContainer;
