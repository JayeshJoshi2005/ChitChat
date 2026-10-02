import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import User from "../models/user.model.js";
import { registerTypingEvents } from "./typing.js";
import cloudinary from "./cloudinary.js";
import { createPresence } from "./presence.js";
import { createVideoCalls } from "./videoCalls.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
  },
});

const presence = createPresence(io);
export const getReceiverSocketId = presence.getReceiverSocketId;
const registerVideoCalls = createVideoCalls({
  io,
  userRoom: presence.userRoom,
  findGroup: (id) => Group.findById(id).select("members").lean(),
  findUser: (id) => User.findById(id).select("fullName profilePic").lean(),
  createMessage: (data) => Message.create(data),
  findCallMessage: (roomId) => Message.findOne({
    text: { $regex: "/video-call/" + roomId + "$" },
  }).select("senderId receiverId groupId").lean(),
});

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  presence.register(socket, userId);

  registerTypingEvents(socket, {
    userId,
    findUser: (id) => User.findById(id).select("fullName").lean(),
    findGroup: (id) => Group.findById(id).select("members").lean(),
    getReceiverSocketId,
    io,
  });

  // Join group room
  const requestedGroups = new Set();
  socket.on("joinGroup", async (groupId) => {
    if (typeof groupId !== "string" || !/^[a-f\d]{24}$/i.test(groupId)) return;
    requestedGroups.add(groupId);
    try {
      const group = await Group.findById(groupId).select("members");
      if (socket.connected && requestedGroups.has(groupId) && group?.members.some((member) => String(member) === userId)) {
        socket.join(groupId);
      }
    } catch (error) {
      console.log("Error joining group:", error.message);
    }
  });

  // Leave group room
  socket.on("leaveGroup", (groupId) => {
    requestedGroups.delete(groupId);
    socket.leave(groupId);
    console.log(`User ${userId} left group ${groupId}`);
  });

  // Send group message
  socket.on("sendGroupMessage", async (data) => {
    try {
      const { groupId, text, image } = data;

      // Check if user is member of the group
      const group = await Group.findById(groupId);
      if (!group || !group.members.includes(userId)) {
        socket.emit("error", { message: "Not authorized to send message to this group" });
        return;
      }

      let imageUrl;
      if (image) {
        const uploadResponse = await cloudinary.uploader.upload(image);
        imageUrl = uploadResponse.secure_url;
      }

      const newMessage = new Message({
        senderId: userId,
        groupId,
        text,
        image: imageUrl,
      });

      await newMessage.save();

      // Populate sender info
      await newMessage.populate("senderId", "fullName profilePic");

      // Notify all members, including those viewing a different conversation.
      io.to(group.members.map((memberId) => presence.userRoom(String(memberId))))
        .emit("newGroupMessage", newMessage);

    } catch (error) {
      console.log("Error in sendGroupMessage socket:", error.message);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  registerVideoCalls(socket, userId);
});

export { io, app, server };
