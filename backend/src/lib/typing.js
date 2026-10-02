const isId = (value) => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

// Typing is transient: never save it alongside messages.
export function registerTypingEvents(socket, { userId, findUser, findGroup, getReceiverSocketId, io }) {
  const active = new Map();
  let queue = Promise.resolve();
  let sender;

  const broadcast = (update, recipients) => {
    if (update.groupId) {
      // Deliver to member accounts, including all their tabs, without a room-join race.
      const targets = recipients.map(getReceiverSocketId).filter(Boolean);
      if (targets.length) io.to(targets).emit("typingUpdate", update);
    }
    else {
      const receiverSocketId = getReceiverSocketId(update.receiverId);
      if (receiverSocketId) io.to(receiverSocketId).emit("typingUpdate", update);
    }
  };
  const stop = (key) => {
    const entry = active.get(key);
    if (!entry) return;
    clearTimeout(entry.timer);
    active.delete(key);
    broadcast({ ...entry.update, isTyping: false }, entry.recipients);
  };

  socket.on("typing", (data) => {
    // Serialize async membership checks so a stop cannot overtake a start.
    queue = queue.then(async () => {
      if (!socket.connected || !isId(userId) || !data || typeof data.isTyping !== "boolean") return;
      const { receiverId, groupId, isTyping } = data;
      if (Boolean(receiverId) === Boolean(groupId)) return;
      if (groupId ? !isId(groupId) : !isId(receiverId) || receiverId === userId) return;
      const key = groupId ? `group:${groupId}` : `user:${receiverId}`;
      if (!isTyping) return stop(key);

      let recipients = [];
      if (groupId) {
        const group = await findGroup(groupId);
        if (!group?.members.some((member) => String(member) === userId)) return;
        recipients = group.members.map(String).filter((id) => id !== userId);
      }
      sender ??= await findUser(userId);
      if (!sender || !socket.connected) return;
      const update = {
        senderId: userId,
        senderName: sender.fullName,
        ...(groupId ? { groupId } : { receiverId }),
        isTyping: true,
      };
      clearTimeout(active.get(key)?.timer);
      active.set(key, { update, recipients, timer: setTimeout(() => stop(key), 4000) });
      broadcast(update, recipients);
    }).catch((error) => console.log("Error in typing socket:", error.message));
  });

  socket.on("leaveGroup", (groupId) => {
    queue = queue.then(() => stop(`group:${groupId}`));
  });
  socket.on("disconnect", () => {
    for (const key of active.keys()) stop(key);
  });
}
