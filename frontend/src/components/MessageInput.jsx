import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

const MessageInput = () => {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef(null);
  const { sendMessage, sendGroupMessage, selectedUser, selectedGroup, emitTyping } = useChatStore();
  const socket = useAuthStore((state) => state.socket);
  const receiverId = selectedUser?._id;
  const groupId = selectedGroup?._id;
  const typingRef = useRef({ active: false, lastSent: 0, timer: null });
  const stopTyping = useCallback(() => {
    const typing = typingRef.current;
    clearTimeout(typing.timer);
    if (typing.active) emitTyping(false, groupId ? { groupId } : { receiverId }, socket);
    typing.active = false;
    typing.lastSent = 0;
  }, [emitTyping, groupId, receiverId, socket]);
  useEffect(() => {
    const onDisconnect = () => {
      clearTimeout(typingRef.current.timer);
      typingRef.current.active = false;
      typingRef.current.lastSent = 0;
    };
    socket?.on("disconnect", onDisconnect);
    return () => {
      stopTyping();
      socket?.off("disconnect", onDisconnect);
    };
  }, [socket, stopTyping]);
  const handleTextChange = (event) => {
    const value = event.target.value;
    setText(value);
    if (!value.trim()) return stopTyping();
    if (!socket?.connected) return;
    const typing = typingRef.current;
    const now = Date.now();
    if (!typing.active || now - typing.lastSent >= 1000) {
      emitTyping(true, groupId ? { groupId } : { receiverId }, socket);
      typing.active = true;
      typing.lastSent = now;
    }
    clearTimeout(typing.timer);
    typing.timer = setTimeout(stopTyping, 2000);
  };
  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please select an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Choose an image smaller than 5 MB");
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };
  const removeImage = () => { setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const handleSendMessage = async (event) => {
    event.preventDefault();
    if (sending || (!text.trim() && !imagePreview)) return;
    stopTyping();
    setSending(true);
    try { await (selectedUser ? sendMessage : sendGroupMessage)({ text: text.trim(), image: imagePreview }); setText(""); removeImage(); }
    finally { setSending(false); }
  };
  return (
    <div className="shrink-0 border-t border-base-content/10 bg-base-100 p-3 sm:px-6 sm:py-4">
      {imagePreview && <div className="mb-3 flex items-center gap-3 rounded-xl bg-base-200/60 p-2"><div className="relative"><img src={imagePreview} alt="Image ready to send" className="size-16 rounded-lg object-cover" /><button type="button" onClick={removeImage} className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-base-content text-base-100" aria-label="Remove attachment" disabled={sending}><X size={13} /></button></div><div><p className="text-xs font-medium">Image attached</p><p className="mt-1 text-[11px] text-base-content/50">Add a message or send it as it is.</p></div></div>}
      <form onSubmit={handleSendMessage} className="flex items-center gap-2 rounded-2xl border border-base-content/10 bg-base-200/40 p-1.5 focus-within:border-primary/40">
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
        <button type="button" className={`btn btn-ghost btn-square btn-sm shrink-0 ${imagePreview ? "text-primary" : "text-base-content/40"}`} onClick={() => fileInputRef.current?.click()} aria-label="Attach an image" title="Attach an image" disabled={sending}><ImagePlus size={19} /></button>
        <input type="text" className="h-10 min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" placeholder="Write a little hello…" aria-label="Message" value={text} onChange={handleTextChange} onBlur={stopTyping} disabled={sending} />
        <button type="submit" className="btn btn-primary btn-square h-10 min-h-10 w-10 shrink-0" aria-label="Send message" title="Send message" disabled={sending || (!text.trim() && !imagePreview)}>{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button>
      </form>
      <p className="mt-2 hidden text-center text-[10px] text-base-content/35 sm:block">Press Enter to send · Make someone’s day</p>
    </div>
  );
};
export default MessageInput;
