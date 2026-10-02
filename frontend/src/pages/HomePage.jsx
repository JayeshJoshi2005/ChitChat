import { useChatStore } from "../store/useChatStore";
import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
const HomePage = () => {
  const { selectedUser, selectedGroup } = useChatStore();
  const subscribeToTyping = useChatStore((state) => state.subscribeToTyping);
  const socket = useAuthStore((state) => state.socket);
  useEffect(() => subscribeToTyping(socket), [socket, subscribeToTyping]);
  return (
    <main className="mx-auto h-[calc(100dvh-4.5rem)] max-w-[1440px] p-2 sm:p-5 lg:p-6">
      <div className="surface flex h-full min-h-0 overflow-hidden rounded-2xl sm:rounded-3xl">
        <Sidebar />
        {!selectedUser && !selectedGroup ? <NoChatSelected /> : <ChatContainer />}
      </div>
    </main>
  );
};
export default HomePage;
