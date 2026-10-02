// Run against an isolated Chrome launched with fake camera/microphone devices.
// Uses the built UI and actual socket handlers, with in-memory account/message fixtures.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { createPresence } from "../../backend/src/lib/presence.js";
import { createVideoCalls } from "../../backend/src/lib/videoCalls.js";
import { registerTypingEvents } from "../../backend/src/lib/typing.js";

const requireBackend = createRequire(new URL("../../backend/package.json", import.meta.url));
const { Server } = requireBackend("socket.io");
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
process.chdir(path.dirname(dist));
const alex = "111111111111111111111111";
const sam = "222222222222222222222222";
const groupId = "333333333333333333333333";
const users = new Map([[alex, { _id: alex, fullName: "Alex", profilePic: "" }], [sam, { _id: sam, fullName: "Sam", profilePic: "" }]]);
const group = { _id: groupId, name: "Test group", members: [alex, sam], groupPic: "" };
const messages = [];
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const vite = process.env.UI_CHECK_DEV === "1"
  ? await import("vite").then(({ createServer }) => createServer({ root: path.dirname(dist), server: { middlewareMode: true }, appType: "spa" }))
  : null;
let io;
const http = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const account = req.headers.cookie?.match(/testAccount=([^;]+)/)?.[1];
  const json = (data) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(data)); };
  if (pathname === "/api/auth/check") return json(users.get(account));
  if (pathname === "/api/messages/users") return json([...users.values()].filter((user) => user._id !== account));
  if (pathname === "/api/groups") return json([group]);
  if (pathname.startsWith("/api/messages/group/")) return json(messages.filter((message) => message.groupId === groupId));
  if (pathname.startsWith("/api/messages/send/")) {
    let body = "";
    for await (const chunk of req) body += chunk;
    const receiverId = pathname.split("/").at(-1);
    const message = { _id: String(messages.length), senderId: account, receiverId, ...JSON.parse(body), createdAt: new Date().toISOString() };
    messages.push(message);
    io.to(`user:${receiverId}`).emit("newMessage", message);
    return json(message);
  }
  if (pathname.startsWith("/api/messages/")) {
    const other = pathname.split("/").at(-1);
    return json(messages.filter((message) => !message.groupId &&
      ((message.senderId === account && message.receiverId === other) || (message.senderId === other && message.receiverId === account))));
  }
  if (vite) return vite.middlewares(req, res, () => { res.statusCode = 404; res.end(); });
  const requested = path.resolve(dist, `.${decodeURIComponent(pathname)}`);
  const filename = requested.startsWith(dist) && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(dist, "index.html");
  const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
  res.setHeader("Content-Type", mime[path.extname(filename)] || "application/octet-stream");
  res.end(fs.readFileSync(filename));
});
io = new Server(http);
const presence = createPresence(io);
const findUser = async (id) => users.get(id);
const findGroup = async (id) => id === groupId ? group : null;
const registerCalls = createVideoCalls({
  io, findUser, findGroup, userRoom: presence.userRoom,
  createMessage: async (data) => {
    const message = { _id: String(messages.length), ...data, createdAt: new Date().toISOString() };
    messages.push(message);
    return { ...message, async populate() { this.senderId = users.get(data.senderId); } };
  },
  findCallMessage: async (id) => messages.find((message) => message.text?.endsWith(`/video-call/${id}`)),
});
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  presence.register(socket, userId);
  registerTypingEvents(socket, { userId, findUser, findGroup, getReceiverSocketId: presence.getReceiverSocketId, io });
  registerCalls(socket, userId);
  socket.on("joinGroup", (id) => { if (id === groupId) socket.join(id); });
  socket.on("leaveGroup", (id) => socket.leave(id));
});
await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${http.address().port}`;
let ws;
const pending = new Map();
const errors = [];
let commandId = 0;
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++commandId;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
  });
}
const evaluate = async (page, expression) => {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, page.sessionId);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const waitFor = async (page, expression, label, timeout = 10000) => {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    if (await evaluate(page, expression)) return;
    await pause(100);
  }
  throw new Error(`Timed out: ${label}. Page: ${await evaluate(page, 'document.body.innerText')}`);
};
const click = (page, selector) => evaluate(page, `document.querySelector(${JSON.stringify(selector)}).click()`);
const openPage = async (account) => {
  const { browserContextId } = await send("Target.createBrowserContext");
  const { targetId } = await send("Target.createTarget", { url: "about:blank", browserContextId });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const page = { targetId, sessionId };
  await send("Runtime.enable", {}, sessionId);
  await send("Page.enable", {}, sessionId);
  await send("Network.enable", {}, sessionId);
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
  await send("Network.setCookie", { name: "testAccount", value: account, url: base }, sessionId);
  await send("Page.navigate", { url: base }, sessionId);
  await waitFor(page, '!!document.querySelector("aside[aria-label=Conversations]")', "chat loaded");
  return page;
};
const selectPerson = async (page, name) => {
  await evaluate(page, `[...document.querySelectorAll('aside button')].find((button) => button.querySelector('p')?.textContent === ${JSON.stringify(name)}).click()`);
  await waitFor(page, '!!document.querySelector("input[aria-label=Message]")', "composer visible");
};
const type = async (page, text) => {
  await evaluate(page, 'document.querySelector("input[aria-label=Message]").focus()');
  await send("Input.insertText", { text }, page.sessionId);
};
const typingText = 'document.querySelector("section[aria-label=Chat] [role=status]")?.textContent || ""';
const sidebarStatus = (name) => `[...document.querySelectorAll('aside[aria-label=Conversations] button')].find((button) => button.querySelector('p')?.textContent === ${JSON.stringify(name)})?.querySelectorAll('p')[1]?.textContent || ''`;
const selectGroup = async (page) => {
  await evaluate(page, "[...document.querySelectorAll('aside button')].find((button) => button.textContent === 'Groups').click()");
  await evaluate(page, "[...document.querySelectorAll('aside button')].find((button) => button.querySelector('p')?.textContent === 'Test group').click()");
  await waitFor(page, '!!document.querySelector("input[aria-label=Message]")', "group composer");
};

try {
  const debuggerInfo = await fetch(`http://127.0.0.1:${process.env.CHROME_DEBUG_PORT || 19223}/json/version`).then((response) => response.json());
  ws = new WebSocket(debuggerInfo.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
  ws.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const callback = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callback.reject(new Error(message.error.message));
      else callback.resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
  });
  const a = await openPage(alex);
  const b = await openPage(sam);
  const secondB = await openPage(sam);
  await pause(100);
  assert.equal(io.engine.clientsCount, 3, "each page must create exactly one socket, including in React StrictMode");
  await selectPerson(a, "Sam");
  await type(a, "Hello");
  await waitFor(b, `(${sidebarStatus("Alex")}).includes('Typing')`, "sidebar typing without a selected chat");
  await waitFor(secondB, `(${sidebarStatus("Alex")}).includes('Typing')`, "sidebar typing in another recipient tab");
  assert.equal(await evaluate(b, 'document.querySelector("section[aria-label=Chat]") === null'), true);
  await selectPerson(b, "Alex");
  await selectPerson(secondB, "Alex");
  await waitFor(b, `(${typingText}).includes('Alex is typing')`, "direct typing in first recipient tab");
  await waitFor(secondB, `(${typingText}).includes('Alex is typing')`, "direct typing in second recipient tab");
  await waitFor(b, `(${typingText}) === ''`, "typing clears after inactivity", 6000);
  await waitFor(b, `(${sidebarStatus("Alex")}).includes('Available to chat')`, "sidebar restores online status after inactivity");
  await send("Target.closeTarget", { targetId: secondB.targetId });
  await type(a, " again");
  await waitFor(b, `(${typingText}).includes('Alex is typing')`, "typing survives recipient tab closing");
  await selectGroup(b);
  await evaluate(b, "[...document.querySelectorAll('aside button')].find((button) => button.textContent === 'People').click()");
  await waitFor(b, `(${sidebarStatus("Alex")}).includes('Typing')`, "direct sidebar typing while viewing a group");
  assert.equal(await evaluate(b, `(${typingText}) === ''`), true, "direct typing must not appear in a group composer");
  await selectPerson(b, "Alex");
  await waitFor(b, `(${typingText}).includes('Alex is typing')`, "typing survives changing the selected conversation");
  console.log("PASS: direct typing, both recipient tabs, idle clearing, and closing one tab");
  await selectGroup(a);
  await evaluate(b, "[...document.querySelectorAll('aside button')].find((button) => button.textContent === 'Groups').click()");
  await type(a, "Group hello");
  await waitFor(b, `(${sidebarStatus("Test group")}).includes('Alex is typing')`, "group sidebar typing while viewing a direct chat");
  assert.equal(await evaluate(b, `(${typingText}) === ''`), true, "group typing must not appear in a direct composer");
  await selectGroup(b);
  await waitFor(b, `(${typingText}).includes('Alex is typing')`, "group typing");
  console.log("PASS: sidebar typing without a selected chat, in inactive direct/group chats, and status restoration");
  // Start from the group: this reproduces the old undefined sender bug.
  await click(a, 'button[aria-label="Start video call"]');
  await waitFor(a, "location.pathname.startsWith('/video-call/')", "caller enters the room");
  await waitFor(b, "!!document.querySelector('a[href^=\"/video-call/\"]')", "group invitation visible");
  await click(b, 'a[href^="/video-call/"]');
  const remoteReady = "[...document.querySelectorAll('video')].some((video) => !video.muted && video.videoWidth > 0 && video.readyState >= 2 && video.srcObject?.getAudioTracks().length > 0)";
  await waitFor(a, remoteReady, "caller receives remote audio and video", 20000);
  await waitFor(b, remoteReady, "recipient receives remote audio and video", 20000);
  assert.equal(await evaluate(a, "document.querySelectorAll('video').length"), 2);
  console.log("PASS: group call joins with two participants and real WebRTC audio/video tracks");
  await click(a, 'button[aria-label="Mute microphone"]');
  assert.equal(await evaluate(a, "[...document.querySelectorAll('video')].find((video) => video.muted).srcObject.getAudioTracks()[0].enabled"), false);
  await click(a, 'button[aria-label="Turn camera off"]');
  assert.equal(await evaluate(a, "[...document.querySelectorAll('video')].find((video) => video.muted).srcObject.getVideoTracks()[0].enabled"), false);
  console.log("PASS: microphone and camera controls change the actual local tracks");
  await click(b, 'button[aria-label="Leave call"]');
  await waitFor(a, "document.querySelectorAll('video').length === 1", "departed participant is removed");
  await waitFor(b, "!!document.querySelector('a[href^=\"/video-call/\"]')", "invitation still available");
  await click(b, 'a[href^="/video-call/"]');
  await waitFor(a, remoteReady, "remote video returns on rejoin", 20000);
  console.log("PASS: leaving removes the participant and rejoining reconnects media");
  await click(a, 'button[aria-label="Leave call"]');
  await click(b, 'button[aria-label="Leave call"]');
  for (const page of [a, b]) {
    await waitFor(page, "!!document.querySelector('aside')", "return to chats");
    await evaluate(page, "[...document.querySelectorAll('aside button')].find((button) => button.textContent === 'People').click()");
  }
  await selectPerson(a, "Sam");
  await selectPerson(b, "Alex");
  await click(a, 'button[aria-label="Start video call"]');
  await waitFor(b, "!!document.querySelector('a[href^=\"/video-call/\"]')", "direct invitation visible");
  await click(b, 'a[href^="/video-call/"]');
  await waitFor(a, remoteReady, "direct caller remote media", 20000);
  await waitFor(b, remoteReady, "direct recipient remote media", 20000);
  console.log("PASS: direct video call connects audio and video");
  assert.deepEqual(errors, [], "no uncaught browser errors");
} finally {
  if (ws?.readyState === WebSocket.OPEN) {
    await send("Browser.close").catch(() => {});
    ws.close();
  }
  await new Promise((resolve) => io.close(resolve));
  await vite?.close();
}
