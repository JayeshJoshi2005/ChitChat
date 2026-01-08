import { useEffect, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Users, MessageCircle, Plus, X } from "lucide-react";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, getGroups, groups, selectedGroup, setSelectedGroup, isGroupsLoading, createGroup } = useChatStore();
  const { onlineUsers } = useAuthStore();
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("contacts");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    getUsers();
    getGroups();
  }, [getUsers, getGroups]);

  const filteredUsers = showOnlineOnly
    ? users.filter((user) => onlineUsers.includes(user._id))
    : users;

  if (isUsersLoading || isGroupsLoading) return <SidebarSkeleton />;

  const handleCreateGroup = () => {
    if (groupName.trim() && selectedMembers.length > 0) {
      createGroup({ name: groupName.trim(), members: selectedMembers });
      setGroupName("");
      setSelectedMembers([]);
      setShowCreateGroup(false);
    }
  };

  const toggleMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <>
      <aside className="h-full w-20 lg:w-72 border-r border-base-300 bg-base-100 flex flex-col transition-all duration-200">
        <div className="border-b border-base-300 w-full p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {activeTab === "contacts" ? (
                <Users className="size-6 text-primary" />
              ) : (
                <MessageCircle className="size-6 text-primary" />
              )}
              <span className="font-semibold hidden lg:block text-lg">
                {activeTab === "contacts" ? "Contacts" : "Groups"}
              </span>
            </div>
            {activeTab === "groups" && (
              <button
                className="btn btn-sm btn-primary"
                onClick={() => setShowCreateGroup(true)}
              >
                <Plus className="size-4" />
                <span className="hidden lg:inline">Create</span>
              </button>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className={`btn btn-sm ${activeTab === "contacts" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("contacts")}
            >
              Contacts
            </button>
            <button
              className={`btn btn-sm ${activeTab === "groups" ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab("groups")}
            >
              Groups
            </button>
          </div>

          {activeTab === "contacts" && (
            <div className="mt-4 hidden lg:flex items-center justify-between text-sm">
              <label className="cursor-pointer flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showOnlineOnly}
                  onChange={(e) => setShowOnlineOnly(e.target.checked)}
                  className="checkbox checkbox-sm"
                  aria-label="Show only online users"
                />
                <span>Online only</span>
              </label>
              <span className="text-xs text-zinc-500">{onlineUsers.length - 1} online</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto w-full py-3 px-2 space-y-1">
          {activeTab === "contacts" ? (
            <>
              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition
                    ${selectedUser?._id === user._id ? "bg-base-300 ring-1 ring-primary" : "hover:bg-base-200"}
                  `}
                >
                  <div className="relative mx-auto lg:mx-0">
                    <img
                      src={user.profilePic || "/avatar.png"}
                      alt={user.fullName}
                      className="size-11 rounded-full object-cover border border-base-300"
                    />
                    {onlineUsers.includes(user._id) && (
                      <span className="absolute bottom-0 right-0 size-3 bg-green-500 rounded-full ring-2 ring-base-100" />
                    )}
                  </div>

                  <div className="hidden lg:block text-left min-w-0">
                    <div className="font-medium truncate">{user.fullName}</div>
                    <div
                      className={`text-xs ${
                        onlineUsers.includes(user._id) ? "text-green-500" : "text-zinc-400"
                      }`}
                    >
                      {onlineUsers.includes(user._id) ? "Online" : "Offline"}
                    </div>
                  </div>
                </button>
              ))}

              {filteredUsers.length === 0 && (
                <div className="text-center text-zinc-500 py-4 text-sm">No users to show</div>
              )}
            </>
          ) : (
            <>
              {groups.map((group) => (
                <button
                  key={group._id}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition
                    ${selectedGroup?._id === group._id ? "bg-base-300 ring-1 ring-primary" : "hover:bg-base-200"}
                  `}
                >
                  <div className="relative mx-auto lg:mx-0">
                    <img
                      src={group.groupPic || "/group.png"}
                      alt={group.name}
                      className="size-11 rounded-full object-cover border border-base-300"
                    />
                  </div>

                  <div className="hidden lg:block text-left min-w-0">
                    <div className="font-medium truncate">{group.name}</div>
                    <div className="text-xs text-zinc-400">
                      {group.members.length} members
                    </div>
                  </div>
                </button>
              ))}

              {groups.length === 0 && (
                <div className="text-center text-zinc-500 py-4 text-sm">No groups to show</div>
              )}
            </>
          )}
        </div>
      </aside>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-base-100 p-6 rounded-lg w-96 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create Group</h3>
              <button onClick={() => setShowCreateGroup(false)}>
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Group Name</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Enter group name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Select Members</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {users.map((user) => (
                    <label key={user._id} className="flex items-center gap-3 p-2 hover:bg-base-200 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user._id)}
                        onChange={() => toggleMember(user._id)}
                        className="checkbox checkbox-sm"
                      />
                      <img
                        src={user.profilePic || "/avatar.png"}
                        alt={user.fullName}
                        className="size-8 rounded-full"
                      />
                      <span>{user.fullName}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={handleCreateGroup}
                  className="btn btn-primary flex-1"
                  disabled={!groupName.trim() || selectedMembers.length === 0}
                >
                  Create Group
                </button>
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="btn btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
