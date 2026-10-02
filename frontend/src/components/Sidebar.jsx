import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { MessageCircle, Plus, Search, Users, X } from "lucide-react";
import TypingDots from "./TypingDots";
import { formatTypingLabel } from "../lib/typing";

const Sidebar = () => {
  const { getUsers, users, selectedUser, setSelectedUser, isUsersLoading, getGroups, groups, selectedGroup, setSelectedGroup, isGroupsLoading, createGroup } = useChatStore();
  const { onlineUsers, socket, authUser } = useAuthStore();
  const userId = authUser?._id;
  const subscribeToConversationActivity = useChatStore((state) => state.subscribeToConversationActivity);
  const typingByConversation = useChatStore((state) => state.typingByConversation);
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("contacts");
  const [search, setSearch] = useState("");
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creating, setCreating] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    useChatStore.setState({ users: [], groups: [] });
    getUsers(); getGroups();
  }, [userId, getUsers, getGroups]);
  useEffect(() => subscribeToConversationActivity(socket), [socket, subscribeToConversationActivity]);
  const filteredUsers = users.filter((user) => (!showOnlineOnly || onlineUsers.includes(user._id)) && user.fullName.toLowerCase().includes(search.toLowerCase()));
  const filteredGroups = groups.filter((group) => group.name.toLowerCase().includes(search.toLowerCase()));
  const onlineCount = users.filter((user) => onlineUsers.includes(user._id)).length;

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    if (!groupName.trim() || !selectedMembers.length || creating) return;
    setCreating(true);
    try {
      const previousCount = useChatStore.getState().groups.length;
      await createGroup({ name: groupName.trim(), members: selectedMembers });
      if (useChatStore.getState().groups.length > previousCount) {
        setGroupName(""); setSelectedMembers([]); dialogRef.current?.close();
      }
    } finally { setCreating(false); }
  };

  const toggleMember = (userId) => setSelectedMembers((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);

  return (
    <>
      <aside className={`h-full w-full shrink-0 flex-col border-r border-base-content/10 bg-base-100 md:w-72 lg:w-80 ${selectedUser || selectedGroup ? "hidden md:flex" : "flex"}`} aria-label="Conversations">
        <div className="space-y-5 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div><h2 className="text-xl font-semibold tracking-tight">Messages<span className="text-primary">.</span></h2><p className="mt-1 text-xs text-base-content/50">A place for your people</p></div>
            <button className="btn btn-ghost btn-sm btn-square bg-primary/10 text-primary" onClick={() => dialogRef.current?.showModal()} aria-label="Create a group" title="Create a group"><Plus size={19} /></button>
          </div>
          <label className="input input-bordered flex h-10 items-center gap-2 border-base-content/10 bg-base-200/50">
            <Search size={16} className="shrink-0 text-base-content/40" />
            <input className="min-w-0 grow bg-transparent text-xs outline-none" type="search" placeholder={activeTab === "contacts" ? "Search people…" : "Search groups…"} aria-label="Search conversations" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
          <div className="flex rounded-xl bg-base-200 p-1" role="group" aria-label="Conversation type">
            {[{ id: "contacts", label: "People", icon: MessageCircle }, { id: "groups", label: "Groups", icon: Users }].map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setActiveTab(id); setSearch(""); }} aria-pressed={activeTab === id} className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-colors ${activeTab === id ? "bg-base-100 text-primary shadow-sm" : "text-base-content/50 hover:text-base-content"}`}><Icon size={15} />{label}</button>)}
          </div>
          {activeTab === "contacts" && <div className="flex items-center justify-between text-xs"><span className="flex items-center gap-1.5 text-base-content/50"><span className="size-1.5 rounded-full bg-success" />{onlineCount} online</span><label className="flex cursor-pointer items-center gap-2 text-base-content/60">Online only<input type="checkbox" className="toggle toggle-primary toggle-xs" checked={showOnlineOnly} onChange={(event) => setShowOnlineOnly(event.target.checked)} /></label></div>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {isUsersLoading || isGroupsLoading ? <SidebarSkeleton /> : activeTab === "contacts" ? <>
            {filteredUsers.map((user) => <button key={user._id} onClick={() => setSelectedUser(user)} aria-pressed={selectedUser?._id === user._id} className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${selectedUser?._id === user._id ? "bg-primary/10" : "hover:bg-base-200"}`}>
              <div className="relative shrink-0"><img src={user.profilePic || "/avatar.png"} alt="" className="size-11 rounded-2xl object-cover" />{onlineUsers.includes(user._id) && <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-base-100 bg-success" />}</div>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{user.fullName}</p><p className={`mt-1 flex h-4 items-center gap-2 text-xs ${typingByConversation[`user:${user._id}`]?.length ? "text-primary" : onlineUsers.includes(user._id) ? "text-success" : "text-base-content/40"}`} aria-live="polite">
                {typingByConversation[`user:${user._id}`]?.length ? <><TypingDots /><span>Typing…</span></> : onlineUsers.includes(user._id) ? "Available to chat" : "Offline"}
              </p></div>
            </button>)}
            {!filteredUsers.length && <div className="px-4 py-12 text-center"><Search className="mx-auto mb-3 size-7 text-base-content/20" /><p className="text-sm font-medium">No people found</p><p className="mt-2 text-xs text-base-content/50">{search || showOnlineOnly ? "Try a different search or filter." : "Your contacts will appear here."}</p></div>}
          </> : <>
            {filteredGroups.map((group) => <button key={group._id} onClick={() => setSelectedGroup(group)} aria-pressed={selectedGroup?._id === group._id} className={`mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors ${selectedGroup?._id === group._id ? "bg-primary/10" : "hover:bg-base-200"}`}>
              {group.groupPic ? <img src={group.groupPic} alt="" className="size-11 rounded-2xl object-cover" /> : <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-secondary/10 text-secondary"><Users size={21} /></span>}
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{group.name}</p><p className={`mt-1 flex h-4 items-center gap-2 text-xs ${typingByConversation[`group:${group._id}`]?.length ? "text-primary" : "text-base-content/40"}`} aria-live="polite">
                {typingByConversation[`group:${group._id}`]?.length ? <><TypingDots /><span className="truncate">{formatTypingLabel(typingByConversation[`group:${group._id}`])}</span></> : `${group.members.length} members`}
              </p></div>
            </button>)}
            {!filteredGroups.length && <div className="px-4 py-12 text-center"><Users className="mx-auto mb-3 size-7 text-base-content/20" /><p className="text-sm font-medium">{search ? "No groups found" : "Better together"}</p><p className="mt-2 text-xs text-base-content/50">{search ? "Try a different search." : "Create a group for your favorite people."}</p>{!search && <button className="btn btn-primary btn-sm mt-4" onClick={() => dialogRef.current?.showModal()}><Plus size={14} />Create a group</button>}</div>}
          </>}
        </div>
        <div className="flex items-center gap-2 border-t border-base-content/5 px-5 py-3 text-[11px] text-base-content/40"><MessageCircle size={13} /> A little hello goes a long way.</div>
      </aside>

      <dialog ref={dialogRef} className="modal" aria-labelledby="group-dialog-title">
        <div className="modal-box rounded-3xl border border-base-content/10">
          <div className="mb-6 flex items-center justify-between"><div><p className="eyebrow mb-2">Bring everyone together</p><h3 id="group-dialog-title" className="text-xl font-semibold">Create a group</h3></div><button type="button" className="btn btn-ghost btn-sm btn-square" onClick={() => dialogRef.current?.close()} aria-label="Close group dialog"><X size={19} /></button></div>
          <form onSubmit={handleCreateGroup} className="space-y-5">
            <div><label htmlFor="group-name" className="mb-2 block text-sm font-medium">Group name</label><input id="group-name" className="input input-bordered w-full" required maxLength={80} placeholder="e.g. The weekend crew" value={groupName} onChange={(event) => setGroupName(event.target.value)} /></div>
            <div><p className="mb-3 text-sm font-medium">Add people <span className="text-base-content/40">({selectedMembers.length} selected)</span></p><div className="max-h-60 space-y-1 overflow-y-auto">{users.map((user) => <label key={user._id} className="flex cursor-pointer items-center gap-3 rounded-xl p-2 hover:bg-base-200"><input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={selectedMembers.includes(user._id)} onChange={() => toggleMember(user._id)} /><img src={user.profilePic || "/avatar.png"} alt="" className="size-8 rounded-full object-cover" /><span className="text-sm">{user.fullName}</span></label>)}{!users.length && <p className="text-sm text-base-content/50">You need contacts to create a group.</p>}</div></div>
            <div className="flex justify-end gap-2 border-t border-base-content/10 pt-4"><button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()}>Cancel</button><button type="submit" className="btn btn-primary" disabled={!groupName.trim() || !selectedMembers.length || creating}>{creating ? <span className="loading loading-spinner loading-xs" /> : <Plus size={17} />}Create group</button></div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop"><button aria-label="Close group dialog">close</button></form>
      </dialog>
    </>
  );
};
export default Sidebar;
