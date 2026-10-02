import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

const messageTime = (value) => Date.parse(value) || 0;
const sortConversations = (items) => [...items].sort((a, b) =>
  messageTime(b.lastMessageAt) - messageTime(a.lastMessageAt)
  || (a.fullName || a.name).localeCompare(b.fullName || b.name)
  || a._id.localeCompare(b._id));

// Preserve socket updates that arrive while the list request is in flight.
const mergeConversations = (items, current) => {
  const activity = new Map(current.map((item) => [item._id, item.lastMessageAt]));
  return sortConversations(items.map((item) => ({
    ...item,
    lastMessageAt: messageTime(activity.get(item._id)) > messageTime(item.lastMessageAt)
      ? activity.get(item._id) : item.lastMessageAt,
  })));
};

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  selectedUser: null,
  selectedGroup: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isGroupsLoading: false,
  typingByConversation: {},

  updateConversationActivity: (message) => {
    const myId = useAuthStore.getState().authUser?._id;
    if (!myId || !messageTime(message.createdAt)) return;
    const senderId = message.senderId?._id || message.senderId;
    const receiverId = message.receiverId?._id || message.receiverId;
    const groupId = message.groupId?._id || message.groupId;
    if (!groupId && senderId !== myId && receiverId !== myId) return;
    const key = groupId ? "groups" : "users";
    const id = groupId || (senderId === myId ? receiverId : senderId);
    set((state) => ({
      [key]: sortConversations(state[key].map((item) => item._id === id
        && messageTime(message.createdAt) > messageTime(item.lastMessageAt)
        ? { ...item, lastMessageAt: message.createdAt } : item)),
    }));
  },

  subscribeToConversationActivity: (socket) => {
    if (!socket) return;
    const onMessage = (message) => get().updateConversationActivity(message);
    const refresh = () => { get().getUsers(); get().getGroups(); };
    socket.on("newMessage", onMessage);
    socket.on("newGroupMessage", onMessage);
    socket.on("connect", refresh);
    return () => {
      socket.off("newMessage", onMessage);
      socket.off("newGroupMessage", onMessage);
      socket.off("connect", refresh);
    };
  },

  emitTyping: (isTyping, destination, socket = useAuthStore.getState().socket) => {
    if (!socket?.connected || !destination) return;
    socket.emit("typing", { ...destination, isTyping });
  },

  subscribeToTyping: (socket) => {
    if (!socket) return;
    const timers = new Map();
    const clear = () => {
      timers.forEach(clearTimeout);
      timers.clear();
      set({ typingByConversation: {} });
    };
    const remove = (conversationKey, senderId) => {
      const timerKey = `${conversationKey}:${senderId}`;
      clearTimeout(timers.get(timerKey));
      timers.delete(timerKey);
      const current = get().typingByConversation;
      if (!current[conversationKey]?.some((user) => user.senderId === senderId)) return;
      const remaining = current[conversationKey].filter((user) => user.senderId !== senderId);
      const next = { ...current };
      if (remaining.length) next[conversationKey] = remaining;
      else delete next[conversationKey];
      set({ typingByConversation: next });
    };
    const onTyping = (data) => {
      const myId = useAuthStore.getState().authUser?._id;
      if (!data || !myId || typeof data.senderId !== "string" || typeof data.isTyping !== "boolean" || data.senderId === myId) return;
      if (!data.groupId && data.receiverId !== myId) return;
      const conversationKey = data.groupId ? `group:${data.groupId}` : `user:${data.senderId}`;
      const timerKey = `${conversationKey}:${data.senderId}`;
      if (!data.isTyping) return remove(conversationKey, data.senderId);
      clearTimeout(timers.get(timerKey));
      const participant = { senderId: data.senderId, senderName: data.senderName || "Someone" };
      const current = get().typingByConversation;
      const users = current[conversationKey] || [];
      const updated = users.some((user) => user.senderId === data.senderId)
        ? users.map((user) => user.senderId === data.senderId ? participant : user)
        : [...users, participant];
      set({ typingByConversation: { ...current, [conversationKey]: updated } });
      timers.set(timerKey, setTimeout(() => remove(conversationKey, data.senderId), 4000));
    };
    const onMessage = (message) => {
      const senderId = message.senderId?._id || message.senderId;
      if (senderId === useAuthStore.getState().authUser?._id) return;
      remove(message.groupId ? `group:${message.groupId}` : `user:${senderId}`, senderId);
    };
    clear();
    socket.on("typingUpdate", onTyping);
    socket.on("newMessage", onMessage);
    socket.on("newGroupMessage", onMessage);
    socket.on("disconnect", clear);
    socket.on("connect", clear);
    return () => {
      socket.off("typingUpdate", onTyping);
      socket.off("newMessage", onMessage);
      socket.off("newGroupMessage", onMessage);
      socket.off("disconnect", clear);
      socket.off("connect", clear);
      clear();
    };
  },

  getUsers: async () => {
    const userId = useAuthStore.getState().authUser?._id;
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      if (useAuthStore.getState().authUser?._id !== userId) return;
      set((state) => ({ users: mergeConversations(res.data, state.users) }));
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getGroups: async () => {
    const userId = useAuthStore.getState().authUser?._id;
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      if (useAuthStore.getState().authUser?._id !== userId) return;
      set((state) => ({ groups: mergeConversations(res.data, state.groups) }));
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isGroupsLoading: false });
    }
  },

  getMessages: async (userId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  getGroupMessages: async (groupId) => {
    set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/group/${groupId}`);
      set({ messages: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser, messages } = get();
    try {
      const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
      get().updateConversationActivity(res.data);
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },
  //TODO
  sendGroupMessage: (messageData) => {
    const { selectedGroup } = get();
    const socket = useAuthStore.getState().socket;

    socket.emit("sendGroupMessage", {
      groupId: selectedGroup._id,
      ...messageData,
    });
  },

  subscribeToMessages: (socket = useAuthStore.getState().socket) => {
    const { selectedUser } = get();
    if (!selectedUser || !socket) return;

    const onMessage = (newMessage) => {
      console.log("Received newMessage", newMessage, "selectedUser", selectedUser._id);
      
      // Handle ObjectId/string comparison
      const senderId = typeof newMessage.senderId === 'object' ? newMessage.senderId._id || newMessage.senderId : newMessage.senderId;
      const receiverId = newMessage.receiverId ? (typeof newMessage.receiverId === 'object' ? newMessage.receiverId._id || newMessage.receiverId : newMessage.receiverId) : null;
      const selectedUserId = selectedUser._id;
      
      const isMessageForSelectedUser = senderId?.toString() === selectedUserId?.toString() || receiverId?.toString() === selectedUserId?.toString();
      console.log("Message match:", { senderId, receiverId, selectedUserId, isMessageForSelectedUser });
      if (!isMessageForSelectedUser) return;

      set({
        messages: [...get().messages, newMessage],
      });
    };
    socket.on("newMessage", onMessage);
    return () => socket.off("newMessage", onMessage);
  },

  subscribeToGroupMessages: (socket = useAuthStore.getState().socket) => {
    const { selectedGroup } = get();
    if (!selectedGroup || !socket) return;

    const onMessage = (newMessage) => {
      console.log("Received newGroupMessage", newMessage);
      if (newMessage.groupId !== selectedGroup._id) return;

      set({
        messages: [...get().messages, newMessage],
      });
    };
    socket.on("newGroupMessage", onMessage);
    return () => socket.off("newGroupMessage", onMessage);
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser, selectedGroup: null });
  },

  setSelectedGroup: (selectedGroup) => {
    set({ selectedGroup, selectedUser: null });
  },

  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/groups", groupData);
      set((state) => ({ groups: sortConversations([...state.groups, res.data]) }));
      toast.success("Group created successfully");
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },
}));
