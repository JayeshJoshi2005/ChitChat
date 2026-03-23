import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  groups: [],
  selectedUser: null,
  selectedGroup: null,
  isUsersLoading: false,
  isMessagesLoading: false,
  isGroupsLoading: false,

  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/users");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response.data.message);
    } finally {
      set({ isUsersLoading: false });
    }
  },

  getGroups: async () => {
    set({ isGroupsLoading: true });
    try {
      const res = await axiosInstance.get("/groups");
      set({ groups: res.data });
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
      set({ messages: [...messages, res.data] });
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },

  sendGroupMessage: (messageData) => {
    const { selectedGroup } = get();
    const socket = useAuthStore.getState().socket;

    socket.emit("sendGroupMessage", {
      groupId: selectedGroup._id,
      ...messageData,
    });
  },

  subscribeToMessages: () => {
    const { selectedUser } = get();
    if (!selectedUser) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newMessage", (newMessage) => {
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
    });
  },

  subscribeToGroupMessages: () => {
    const { selectedGroup } = get();
    if (!selectedGroup) return;

    const socket = useAuthStore.getState().socket;

    socket.on("newGroupMessage", (newMessage) => {
      console.log("Received newGroupMessage", newMessage);
      if (newMessage.groupId !== selectedGroup._id) return;

      set({
        messages: [...get().messages, newMessage],
      });
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newMessage");
  },

  unsubscribeFromGroupMessages: () => {
    const socket = useAuthStore.getState().socket;
    socket.off("newGroupMessage");
  },

  setSelectedUser: (selectedUser) => {
    const { selectedGroup } = get();
    const socket = useAuthStore.getState().socket;

    if (selectedGroup) {
      socket.emit("leaveGroup", selectedGroup._id);
    }

    set({ selectedUser, selectedGroup: null });
  },

  setSelectedGroup: (selectedGroup) => {
    const socket = useAuthStore.getState().socket;

    socket.emit("joinGroup", selectedGroup._id);

    set({ selectedGroup, selectedUser: null });
  },

  createGroup: async (groupData) => {
    try {
      const res = await axiosInstance.post("/groups", groupData);
      set((state) => ({ groups: [...state.groups, res.data] }));
      toast.success("Group created successfully");
    } catch (error) {
      toast.error(error.response.data.message);
    }
  },
}));
