import { Server } from "socket.io";
import http from "http";
import express from "express";
import Message from "../models/message.model.js";
import Group from "../models/group.model.js";
import cloudinary from "./cloudinary.js";
import { v4 as uuidv4 } from "uuid";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:5176"],
  },
});

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

// used to store online users
const userSocketMap = {}; // {userId: socketId}

// Video call rooms
const videoRooms = {}; // {roomId: {users: [socketId], ...}}

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

  // Video call events
  socket.on("startVideoCall", async (data) => {
    console.log("startVideoCall received", data);
    try {
      const { groupId, userId } = data;
      const roomId = uuidv4();

      if (groupId) {
        // Group video call
        const group = await Group.findById(groupId);
        if (!group || !group.members.includes(userId)) {
          socket.emit("error", { message: "Not authorized to start video call in this group" });
          return;
        }

        videoRooms[roomId] = { users: [socket.id], groupId, peers: {} };

        const newMessage = new Message({
          senderId: userId,
          groupId,
          text: `Video call started: http://localhost:5176/video-call/${roomId}`,
        });

        await newMessage.save();
        await newMessage.populate("senderId", "fullName profilePic");
        console.log("Group video call message saved", newMessage._id, newMessage.text);

        io.to(groupId).emit("newGroupMessage", newMessage);
      } else if (userId) {
        // One-to-one video call
        const currentUserId = socket.handshake.query.userId;
        console.log("One-to-one video call initiated - sender:", currentUserId, "receiver:", userId);
        
        videoRooms[roomId] = { users: [socket.id], userId, peers: {} };

        const newMessage = new Message({
          senderId: currentUserId,
          receiverId: userId,
          text: `Video call started: http://localhost:5176/video-call/${roomId}`,
        });

        await newMessage.save();
        await newMessage.populate("senderId", "fullName profilePic");
        console.log("Message saved and populated:", JSON.stringify({
          _id: newMessage._id,
          text: newMessage.text,
          senderId: newMessage.senderId?._id || newMessage.senderId,
          receiverId: newMessage.receiverId
        }));

        // Send to sender first
        console.log("Attempting to emit to sender (socket.id):", socket.id);
        io.to(socket.id).emit("newMessage", newMessage);
        
        // Then to receiver if online
        const receiverSocketId = getReceiverSocketId(userId);
        console.log("Receiver socket ID lookup for userId", userId, "->", receiverSocketId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("newMessage", newMessage);
        }
      }
    } catch (error) {
      console.log("Error in startVideoCall:", error.message);
      socket.emit("error", { message: "Failed to start video call" });
    }
  });

  socket.on("joinVideoRoom", (roomId, peerId) => {
    if (videoRooms[roomId]) {
      videoRooms[roomId].users.push(socket.id);
      if (peerId) {
        videoRooms[roomId].peers[socket.id] = peerId;
        // Notify existing users about the new peer
        socket.to(roomId).emit("userJoined", { peerId, socketId: socket.id });
      }
      socket.join(roomId);
    }
  });

  // WebRTC signaling
  socket.on("videoOffer", (data) => {
    socket.to(data.to).emit("videoOffer", {
      offer: data.offer,
      from: socket.id
    });
  });

  socket.on("videoAnswer", (data) => {
    socket.to(data.to).emit("videoAnswer", {
      answer: data.answer,
      from: socket.id
    });
  });

  socket.on("iceCandidate", (data) => {
    socket.to(data.to).emit("iceCandidate", {
      candidate: data.candidate,
      from: socket.id
    });
  });

  socket.on("leaveVideoRoom", (roomId) => {
    if (videoRooms[roomId]) {
      videoRooms[roomId].users = videoRooms[roomId].users.filter(id => id !== socket.id);
      socket.to(roomId).emit("userLeft", videoRooms[roomId].peers[socket.id]);
      delete videoRooms[roomId].peers[socket.id];
      socket.leave(roomId);

      // Clean up empty rooms
      if (videoRooms[roomId].users.length === 0) {
        delete videoRooms[roomId];
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // Clean up video rooms
    Object.keys(videoRooms).forEach(roomId => {
      if (videoRooms[roomId].peers[socket.id]) {
        socket.to(roomId).emit("userLeft", videoRooms[roomId].peers[socket.id]);
        delete videoRooms[roomId].peers[socket.id];
      }
      videoRooms[roomId].users = videoRooms[roomId].users.filter(id => id !== socket.id);
      if (videoRooms[roomId].users.length === 0) {
        delete videoRooms[roomId];
      }
    });
  });
});

export { io, app, server };
