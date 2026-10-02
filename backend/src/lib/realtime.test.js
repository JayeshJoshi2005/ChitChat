import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { Server } from "socket.io";
import { createPresence } from "./presence.js";
import { createVideoCalls } from "./videoCalls.js";
import { registerTypingEvents } from "./typing.js";

const requireFrontend = createRequire(new URL("../../../frontend/package.json", import.meta.url));
const { io: connect } = requireFrontend("socket.io-client");
const alex = "111111111111111111111111";
const sam = "222222222222222222222222";
const outsider = "444444444444444444444444";
const groupId = "333333333333333333333333";
const users = new Map([[alex, { fullName: "Alex" }], [sam, { fullName: "Sam" }], [outsider, { fullName: "Other" }]]);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const event = (socket, name) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off(name, handle); reject(new Error(`Missing ${name}`)); }, 2000);
  const handle = (data) => { clearTimeout(timer); resolve(data); };
  socket.once(name, handle);
});
const ack = (socket, name, data) => new Promise((resolve, reject) => {
  socket.timeout(2000).emit(name, data, (error, result) => error ? reject(error) : resolve(result));
});

async function setup(t, seed = []) {
  const http = createServer();
  const io = new Server(http);
  const presence = createPresence(io);
  const messages = [...seed];
  const findUser = async (id) => users.get(id);
  const findGroup = async (id) => id === groupId ? { members: [alex, sam] } : null;
  const registerCalls = createVideoCalls({
    io, findUser, findGroup, userRoom: presence.userRoom,
    createMessage: async (data) => {
      const raw = { _id: String(messages.length), ...data };
      messages.push(raw);
      return { ...raw, async populate() { this.senderId = { _id: data.senderId, ...users.get(data.senderId) }; } };
    },
    findCallMessage: async (id) => messages.find((message) => message.text.endsWith(`/video-call/${id}`)),
  });
  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    presence.register(socket, userId);
    registerTypingEvents(socket, { userId, findUser, findGroup, getReceiverSocketId: presence.getReceiverSocketId, io });
    registerCalls(socket, userId);
  });
  await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
  const clients = [];
  t.after(async () => {
    clients.forEach((client) => client.disconnect());
    await new Promise((resolve) => io.close(resolve));
  });
  const client = async (userId) => {
    const socket = connect(`http://127.0.0.1:${http.address().port}`, { query: { userId }, transports: ["websocket"], forceNew: true });
    clients.push(socket);
    await event(socket, "connect");
    return socket;
  };
  return { client, messages, presence };
}

test("direct typing reaches both recipient tabs and survives one tab closing", async (t) => {
  const { client, presence } = await setup(t);
  const a = await client(alex);
  const b = await client(sam);
  const secondTab = await client(sam);
  const firstTyping = event(b, "typingUpdate");
  const secondTyping = event(secondTab, "typingUpdate");
  a.emit("typing", { receiverId: sam, isTyping: true });
  assert.equal((await firstTyping).senderName, "Alex");
  assert.equal((await secondTyping).isTyping, true);
  secondTab.disconnect();
  await delay(50);
  assert.equal(presence.getReceiverSocketId(sam), presence.userRoom(sam));
  const stopped = event(b, "typingUpdate");
  a.emit("typing", { receiverId: sam, isTyping: false });
  assert.equal((await stopped).isTyping, false);
});

test("group typing works before a group-room join and stays within membership", async (t) => {
  const { client } = await setup(t);
  const a = await client(alex);
  const b = await client(sam);
  const c = await client(outsider);
  const foreign = [];
  c.on("typingUpdate", (data) => foreign.push(data));
  const typing = event(b, "typingUpdate");
  a.emit("typing", { groupId, isTyping: true });
  assert.equal((await typing).groupId, groupId);
  c.emit("typing", { groupId, isTyping: true });
  await delay(75);
  assert.equal(foreign.length, 0);
});

test("direct invitation uses a relative link and joining has no phantom participants", async (t) => {
  const { client, messages } = await setup(t);
  const a = await client(alex);
  const b = await client(sam);
  const invitation = event(b, "newMessage");
  const started = await ack(a, "startVideoCall", { userId: sam });
  assert.equal(started.ok, true);
  assert.equal((await invitation).senderId._id, alex);
  assert.equal(messages[0].text, `Video call started: /video-call/${started.roomId}`);
  const firstJoin = await ack(a, "joinVideoRoom", started.roomId);
  assert.deepEqual(firstJoin.participants, []);
  const joined = event(a, "userJoined");
  const secondJoin = await ack(b, "joinVideoRoom", started.roomId);
  assert.equal(secondJoin.participants[0].socketId, a.id);
  assert.equal((await joined).socketId, b.id);
  let notifications = 0;
  a.on("userJoined", () => notifications++);
  await ack(b, "joinVideoRoom", started.roomId);
  await delay(50);
  assert.equal(notifications, 0, "repeated joins must not renegotiate an existing peer");
});

test("group invitations derive their sender from the connection and reject nonmembers", async (t) => {
  const { client, messages } = await setup(t);
  const a = await client(alex);
  const b = await client(sam);
  const c = await client(outsider);
  const invitation = event(b, "newGroupMessage");
  const started = await ack(a, "startVideoCall", { groupId });
  assert.equal(started.ok, true);
  assert.equal((await invitation).senderId._id, alex);
  assert.equal(messages[0].senderId, alex);
  assert.equal((await ack(c, "startVideoCall", { groupId })).ok, false);
  assert.equal((await ack(c, "joinVideoRoom", started.roomId)).ok, false);
});

test("participants leave by socket ID and may rejoin an empty room", async (t) => {
  const { client } = await setup(t);
  const a = await client(alex);
  const b = await client(sam);
  const { roomId } = await ack(a, "startVideoCall", { userId: sam });
  await ack(a, "joinVideoRoom", roomId);
  await ack(b, "joinVideoRoom", roomId);
  const left = event(a, "userLeft");
  const previousId = b.id;
  b.disconnect();
  assert.deepEqual(await left, { roomId, socketId: previousId });
  a.emit("leaveVideoRoom", roomId);
  await delay(50);
  const newB = await client(sam);
  const rejoin = await ack(newB, "joinVideoRoom", roomId);
  assert.equal(rejoin.ok, true);
  assert.deepEqual(rejoin.participants, []);
});

test("persisted invitations restore rooms and missing links return an error", async (t) => {
  const roomId = "12345678-1234-1234-1234-123456789abc";
  const { client } = await setup(t, [{ senderId: alex, receiverId: sam, text: `Video call started: http://localhost:5176/video-call/${roomId}` }]);
  const a = await client(alex);
  assert.equal((await ack(a, "joinVideoRoom", roomId)).ok, true);
  assert.equal((await ack(a, "joinVideoRoom", "invalid")).ok, false);
  assert.equal((await ack(a, "joinVideoRoom", "12345678-1234-1234-1234-123456789abd")).ok, false);
});

test("signaling is forwarded only between participants in the specified room", async (t) => {
  const { client } = await setup(t);
  const a = await client(alex);
  const b = await client(sam);
  const c = await client(outsider);
  const { roomId } = await ack(a, "startVideoCall", { userId: sam });
  await ack(a, "joinVideoRoom", roomId);
  await ack(b, "joinVideoRoom", roomId);
  const received = [];
  b.on("videoOffer", (data) => received.push(data));
  c.emit("videoOffer", { roomId, to: b.id, offer: { type: "offer", sdp: "unauthorized" } });
  a.emit("videoOffer", { roomId: "other-room", to: b.id, offer: { type: "offer", sdp: "wrong-room" } });
  a.emit("videoOffer", { roomId, to: b.id, offer: { type: "offer", sdp: "valid" } });
  await delay(75);
  assert.deepEqual(received, [{ roomId, from: a.id, offer: { type: "offer", sdp: "valid" } }]);
});
