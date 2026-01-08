import { X } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

const ChatHeader = () => {
  const { selectedUser, setSelectedUser, selectedGroup, setSelectedGroup } = useChatStore();
  const { onlineUsers } = useAuthStore();

  const chatEntity = selectedUser || selectedGroup;

  return (
    <div className="p-2.5 border-b border-base-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="avatar">
            <div className="size-10 rounded-full relative">
              <img src={chatEntity.profilePic || chatEntity.groupPic || "/avatar.png"} alt={chatEntity.fullName || chatEntity.name} />
            </div>
          </div>

          {/* User/Group info */}
          <div>
            <h3 className="font-medium">{chatEntity.fullName || chatEntity.name}</h3>
            <p className="text-sm text-base-content/70">
              {selectedUser ? (onlineUsers.includes(selectedUser._id) ? "Online" : "Offline") : `${chatEntity.members?.length || 0} members`}
            </p>
          </div>
        </div>

        {/* Close button */}
        <button onClick={() => {
          if (selectedUser) setSelectedUser(null);
          if (selectedGroup) setSelectedGroup(null);
        }}>
          <X />
        </button>
      </div>
    </div>
  );
};
export default ChatHeader;
