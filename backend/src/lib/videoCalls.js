import { randomUUID } from "node:crypto";

const isId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
const isRoomId = (id) => typeof id === "string" && /^[a-f\d-]{36}$/i.test(id);

export function createVideoCalls({ io, findGroup, findUser, createMessage, findCallMessage, userRoom }) {
  const rooms = new Map();
  const videoRoom = (id) => `call:${id}`;
  const authorized = async (room, userId) => {
    if (!isId(userId)) return false;
    if (room.groupId) {
      const group = await findGroup(room.groupId);
      return Boolean(group?.members.some((id) => String(id) === userId));
    }
    return room.allowedUsers.includes(userId);
  };
  const restoreRoom = async (roomId) => {
    const now = Date.now();
    for (const [id, room] of rooms) {
      if (!room.participants.size && now - room.lastUsed > 3600000) rooms.delete(id);
    }
    if (rooms.has(roomId)) {
      rooms.get(roomId).lastUsed = now;
      return rooms.get(roomId);
    }
    const invitation = await findCallMessage(roomId);
    if (!invitation) return null;
    // Reconstruct invitations after a server restart without a schema migration.
    const room = {
      groupId: invitation.groupId ? String(invitation.groupId) : null,
      allowedUsers: [String(invitation.senderId), String(invitation.receiverId)],
      participants: new Map(),
      lastUsed: now,
    };
    if (!rooms.has(roomId)) rooms.set(roomId, room);
    return rooms.get(roomId);
  };

  return (socket, userId) => {
    let requestedRoom = null;
    let joinVersion = 0;
    const respond = (ack, result) => {
      if (typeof ack === "function") ack(result);
      else if (!result.ok) socket.emit("error", { message: result.error });
    };
    const leave = (roomId) => {
      const room = rooms.get(roomId);
      if (!room?.participants.delete(socket.id)) return;
      socket.to(videoRoom(roomId)).emit("userLeft", { roomId, socketId: socket.id });
      socket.leave(videoRoom(roomId));
      // Keep an empty room during pending joins; idle rooms are evicted on the next join.
      room.lastUsed = Date.now();
    };

    socket.on("startVideoCall", async (data, ack) => {
      try {
        if (!data || !isId(userId) || Boolean(data.groupId) === Boolean(data.userId)) {
          return respond(ack, { ok: false, error: "Choose a conversation to start a call." });
        }
        const groupId = data.groupId;
        const receiverId = data.userId;
        let group;
        if (groupId) {
          if (!isId(groupId)) return respond(ack, { ok: false, error: "Invalid group." });
          group = await findGroup(groupId);
          if (!group?.members.some((id) => String(id) === userId)) {
            return respond(ack, { ok: false, error: "You are not a member of this group." });
          }
        } else if (!isId(receiverId) || receiverId === userId || !await findUser(receiverId)) {
          return respond(ack, { ok: false, error: "This person is unavailable." });
        }
        const roomId = randomUUID();
        const message = await createMessage({
          senderId: userId,
          ...(groupId ? { groupId } : { receiverId }),
          text: `Video call started: /video-call/${roomId}`,
        });
        await message.populate("senderId", "fullName profilePic");
        // Participants join only after their camera is ready; the creator is not a ghost peer.
        if (group) io.to(group.members.map((id) => userRoom(String(id)))).emit("newGroupMessage", message);
        else io.to([userRoom(userId), userRoom(receiverId)]).emit("newMessage", message);
        respond(ack, { ok: true, roomId });
      } catch (error) {
        console.log("Error starting video call:", error.message);
        respond(ack, { ok: false, error: "Could not send the call invitation. Please try again." });
      }
    });

    socket.on("joinVideoRoom", async (roomId, ack) => {
      const version = ++joinVersion;
      requestedRoom = roomId;
      try {
        if (!isRoomId(roomId)) return respond(ack, { ok: false, error: "Invalid call link." });
        const room = await restoreRoom(roomId);
        if (!room) return respond(ack, { ok: false, error: "This call could not be found. Start a new call from your chat." });
        if (!await authorized(room, userId)) return respond(ack, { ok: false, error: "You are not invited to this call." });
        const user = await findUser(userId);
        if (!user) return respond(ack, { ok: false, error: "Your account could not be found." });
        if (!socket.connected || version !== joinVersion || requestedRoom !== roomId) return;
        for (const [id, existing] of rooms) {
          if (id !== roomId && existing.participants.has(socket.id)) leave(id);
        }
        const participants = [...room.participants.values()].filter((peer) => peer.socketId !== socket.id);
        const participant = { socketId: socket.id, fullName: user.fullName, profilePic: user.profilePic };
        const alreadyJoined = room.participants.has(socket.id);
        await socket.join(videoRoom(roomId));
        if (!socket.connected || version !== joinVersion) {
          if (!room.participants.has(socket.id)) socket.leave(videoRoom(roomId));
          return;
        }
        room.participants.set(socket.id, participant);
        respond(ack, { ok: true, participants });
        if (!alreadyJoined) socket.to(videoRoom(roomId)).emit("userJoined", { roomId, ...participant });
      } catch (error) {
        console.log("Error joining video call:", error.message);
        respond(ack, { ok: false, error: "Could not join the call. Please try again." });
      }
    });

    for (const [event, field] of [["videoOffer", "offer"], ["videoAnswer", "answer"], ["iceCandidate", "candidate"]]) {
      socket.on(event, (data) => {
        const room = data && rooms.get(data.roomId);
        if (!room?.participants.has(socket.id) || !room.participants.has(data.to) || !data[field]) return;
        socket.to(data.to).emit(event, { roomId: data.roomId, from: socket.id, [field]: data[field] });
      });
    }

    socket.on("leaveVideoRoom", (roomId) => {
      if (requestedRoom === roomId) { requestedRoom = null; joinVersion++; }
      leave(roomId);
    });
    socket.on("disconnect", () => {
      requestedRoom = null; joinVersion++;
      for (const roomId of rooms.keys()) leave(roomId);
    });
  };
}
