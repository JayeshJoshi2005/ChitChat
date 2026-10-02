import test from "node:test";
import assert from "node:assert/strict";
import { registerTypingEvents } from "./typing.js";

const userId = "111111111111111111111111";
const receiverId = "222222222222222222222222";
const groupId = "333333333333333333333333";
const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(t, overrides = {}) {
  const listeners = new Map();
  const events = [];
  const socket = {
    connected: true,
    on(event, handler) {
      listeners.set(event, [...(listeners.get(event) || []), handler]);
    },
    to(room) {
      return { emit: (event, data) => events.push({ room, event, data }) };
    },
  };
  registerTypingEvents(socket, {
    userId,
    findUser: async () => ({ fullName: "Alex" }),
    findGroup: async () => ({ members: [userId, receiverId] }),
    getReceiverSocketId: (id) => id === receiverId ? "recipient-socket" : undefined,
    io: { to: socket.to },
    ...overrides,
  });
  const dispatch = (event, data) => listeners.get(event)?.forEach((handler) => handler(data));
  t.after(() => { socket.connected = false; dispatch("disconnect"); });
  return { socket, events, dispatch };
}

test("direct typing targets only the recipient and derives the sender name", async (t) => {
  const { dispatch, events } = setup(t);
  dispatch("typing", { receiverId, isTyping: true, senderName: "Forged" });
  await flush();
  assert.deepEqual(events, [{ room: "recipient-socket", event: "typingUpdate", data: {
    senderId: userId, senderName: "Alex", receiverId, isTyping: true,
  } }]);
  dispatch("typing", { receiverId, isTyping: false });
  await flush();
  assert.equal(events.at(-1).data.isTyping, false);
});

test("group typing goes to other member accounts and rejects nonmembers", async (t) => {
  const allowed = setup(t);
  allowed.dispatch("typing", { groupId, isTyping: true });
  await flush();
  assert.deepEqual(allowed.events[0].room, ["recipient-socket"]);
  assert.equal(allowed.events[0].data.groupId, groupId);
  const denied = setup(t, { findGroup: async () => ({ members: [receiverId] }) });
  denied.dispatch("typing", { groupId, isTyping: true });
  await flush();
  assert.equal(denied.events.length, 0);
});

test("malformed, ambiguous, self-directed and offline-recipient events are ignored", async (t) => {
  const { dispatch, events } = setup(t);
  for (const data of [null, {}, { receiverId, isTyping: "true" },
    { receiverId: "invalid", isTyping: true }, { receiverId: userId, isTyping: true },
    { receiverId, groupId, isTyping: true },
    { receiverId: "444444444444444444444444", isTyping: true }]) {
    dispatch("typing", data);
  }
  await flush();
  assert.equal(events.length, 0);
});

test("a stop stays ordered behind an asynchronous start", async (t) => {
  let resolveGroup;
  const { dispatch, events } = setup(t, {
    findGroup: () => new Promise((resolve) => { resolveGroup = resolve; }),
  });
  dispatch("typing", { groupId, isTyping: true });
  dispatch("typing", { groupId, isTyping: false });
  await flush();
  resolveGroup({ members: [userId, receiverId] });
  await flush();
  assert.deepEqual(events.map(({ data }) => data.isTyping), [true, false]);
});

test("leaving a group and disconnecting clear active typing", async (t) => {
  const { dispatch, events, socket } = setup(t);
  dispatch("typing", { groupId, isTyping: true });
  dispatch("typing", { receiverId, isTyping: true });
  await flush();
  dispatch("leaveGroup", groupId);
  await flush();
  assert.equal(events.at(-1).data.groupId, groupId);
  assert.equal(events.at(-1).data.isTyping, false);
  socket.connected = false;
  dispatch("disconnect");
  assert.equal(events.at(-1).data.receiverId, receiverId);
  assert.equal(events.at(-1).data.isTyping, false);
});

test("disconnect during a membership check cannot broadcast a late start", async (t) => {
  let resolveGroup;
  const { dispatch, events, socket } = setup(t, {
    findGroup: () => new Promise((resolve) => { resolveGroup = resolve; }),
  });
  dispatch("typing", { groupId, isTyping: true });
  await flush();
  socket.connected = false;
  dispatch("disconnect");
  resolveGroup({ members: [userId] });
  await flush();
  assert.equal(events.length, 0);
});

test("typing expires after four seconds and heartbeats extend the timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const { dispatch, events } = setup(t);
  dispatch("typing", { receiverId, isTyping: true });
  await flush();
  t.mock.timers.tick(3000);
  dispatch("typing", { receiverId, isTyping: true });
  await flush();
  t.mock.timers.tick(3000);
  assert.deepEqual(events.map(({ data }) => data.isTyping), [true, true]);
  t.mock.timers.tick(1000);
  assert.equal(events.at(-1).data.isTyping, false);
});
