export function createPresence(io) {
  const socketsByUser = new Map();
  const userRoom = (userId) => `user:${userId}`;
  return {
    userRoom,
    getReceiverSocketId: (userId) => socketsByUser.has(String(userId)) ? userRoom(userId) : undefined,
    register(socket, userId) {
      if (typeof userId !== "string" || !/^[a-f\d]{24}$/i.test(userId)) return;
      const sockets = socketsByUser.get(userId) || new Set();
      sockets.add(socket.id);
      socketsByUser.set(userId, sockets);
      socket.join(userRoom(userId));
      io.emit("getOnlineUsers", [...socketsByUser.keys()]);
      socket.on("disconnect", () => {
        sockets.delete(socket.id);
        if (!sockets.size) socketsByUser.delete(userId);
        io.emit("getOnlineUsers", [...socketsByUser.keys()]);
      });
    },
  };
}
