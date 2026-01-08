import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import cloudinary from "./cloudinary.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
  console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) userSocketMap[userId] = socket.id;

  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  // Join group room
  socket.on("joinGroup", (groupId) => {
    socket.join(groupId);
    console.log(`User ${userId} joined group ${groupId}`);
  });

  // Leave group room
  socket.on("leaveGroup", (groupId) => {
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

      // Emit to group room
      io.to(groupId).emit("newGroupMessage", newMessage);

    } catch (error) {
      console.log("Error in sendGroupMessage socket:", error.message);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
