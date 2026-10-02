import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, Expand, Loader2, Mic, MicOff, Minimize, Monitor, MonitorOff, PhoneOff, RefreshCw, Users, Video, VideoOff, Wifi, X } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import { getIceServers } from "../lib/webrtc";

const formatDuration = (seconds) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

const VideoCallPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { authUser, socket } = useAuthStore();
  const [peers, setPeers] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [status, setStatus] = useState("connecting");
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showParticipants, setShowParticipants] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const streamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnections = useRef({});
  const stageRef = useRef(null);
  const activeRef = useRef(false);

  useEffect(() => {
    let aborted = false;
    let started = false;
    let cameraStream;
    let joinedRoom = false;
    let iceServers;
    let connectionTimeout;
    const connections = {};
    const candidates = {};
    const remoteStreams = {};
    peerConnections.current = connections;
    activeRef.current = true;
    setError(null); setStatus("connecting"); setPeers([]); setLocalStream(null);
    setAudioEnabled(true); setVideoEnabled(true); setIsScreenSharing(false);

    const flushCandidates = async (id) => {
      for (const candidate of candidates[id] || []) {
        try { await connections[id]?.addIceCandidate(candidate); }
        catch (err) { console.warn("Could not add call candidate", err); }
      }
      delete candidates[id];
    };
    const createConnection = (id) => {
      if (connections[id]) return connections[id];
      const connection = new RTCPeerConnection({ iceServers });
      connections[id] = connection;
      const videoTrack = screenStreamRef.current?.getVideoTracks()[0] || cameraStream.getVideoTracks()[0];
      cameraStream.getAudioTracks().forEach((track) => connection.addTrack(track, cameraStream));
      if (videoTrack) connection.addTrack(videoTrack, screenStreamRef.current || cameraStream);
      connection.onicecandidate = ({ candidate }) => { if (candidate && !aborted) socket.emit("iceCandidate", { roomId, candidate, to: id }); };
      connection.ontrack = ({ track }) => {
        if (aborted) return;
        // Camera audio and screen video can arrive in different streams.
        const stream = remoteStreams[id] ||= new MediaStream();
        if (!stream.getTracks().some((existing) => existing.id === track.id)) stream.addTrack(track);
        setPeers((current) => current.some((peer) => peer.socketId === id) ? current.map((peer) => peer.socketId === id ? { ...peer, stream } : peer) : [...current, { socketId: id, stream, state: connection.connectionState }]);
      };
      connection.onconnectionstatechange = () => {
        if (aborted) return;
        setPeers((current) => current.map((peer) => peer.socketId === id ? { ...peer, state: connection.connectionState } : peer));
        if (connection.connectionState === "failed") toast.error("A participant lost connection. Try rejoining the call.");
      };
      return connection;
    };
    const handleJoined = async ({ roomId: eventRoom, socketId, fullName, profilePic }) => {
      if (eventRoom !== roomId || aborted || !cameraStream?.active || socketId === socket.id) return;
      setPeers((current) => current.some((peer) => peer.socketId === socketId)
        ? current.map((peer) => peer.socketId === socketId ? { ...peer, fullName, profilePic } : peer)
        : [...current, { socketId, fullName, profilePic, state: "connecting" }]);
      try {
        const connection = createConnection(socketId);
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        if (!aborted) socket.emit("videoOffer", { roomId, offer, to: socketId });
      } catch (err) { if (!aborted) console.warn("Could not connect participant", err); }
    };
    const handleOffer = async ({ roomId: eventRoom, from, offer }) => {
      if (eventRoom !== roomId || aborted || !cameraStream?.active) return;
      try {
        const connection = createConnection(from);
        await connection.setRemoteDescription(offer);
        await flushCandidates(from);
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        if (!aborted) socket.emit("videoAnswer", { roomId, answer, to: from });
      } catch (err) { if (!aborted) console.warn("Could not answer call", err); }
    };
    const handleAnswer = async ({ roomId: eventRoom, from, answer }) => {
      if (eventRoom !== roomId || aborted || !connections[from]) return;
      try { await connections[from].setRemoteDescription(answer); await flushCandidates(from); }
      catch (err) { if (!aborted) console.warn("Could not accept call answer", err); }
    };
    const handleCandidate = async ({ roomId: eventRoom, from, candidate }) => {
      if (eventRoom !== roomId || aborted || !candidate) return;
      if (!connections[from]?.remoteDescription) { (candidates[from] ||= []).push(candidate); return; }
      try { await connections[from].addIceCandidate(candidate); }
      catch (err) { if (!aborted) console.warn("Could not add call candidate", err); }
    };
    const handleLeft = ({ roomId: eventRoom, socketId: id }) => {
      if (eventRoom !== roomId) return;
      connections[id]?.close(); delete connections[id]; delete candidates[id];
      delete remoteStreams[id];
      if (!aborted) setPeers((current) => current.filter((peer) => peer.socketId !== id));
    };
    const handleDisconnect = () => {
      joinedRoom = false;
      Object.values(connections).forEach((connection) => connection.close());
      if (!aborted) { setPeers([]); setStatus("disconnected"); setError("Your connection was interrupted. Rejoin to continue the conversation."); }
    };
    const initCall = async () => {
      if (aborted || started) return;
      started = true;
      clearTimeout(connectionTimeout);
      if (!navigator.mediaDevices?.getUserMedia) { setError("Camera access isn’t available. Open this page on localhost or over HTTPS in a supported browser."); setStatus("disconnected"); return; }
      try { iceServers = getIceServers(); }
      catch (err) { setError(err.message); setStatus("disconnected"); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (aborted) { stream.getTracks().forEach((track) => track.stop()); return; }
        cameraStream = stream; streamRef.current = stream;
        setLocalStream(stream);
        socket.on("userJoined", handleJoined); socket.on("videoOffer", handleOffer);
        socket.on("videoAnswer", handleAnswer); socket.on("iceCandidate", handleCandidate);
        socket.on("userLeft", handleLeft); socket.on("disconnect", handleDisconnect);
        socket.timeout(10000).emit("joinVideoRoom", roomId, (joinError, response) => {
          if (aborted) return;
          if (joinError || !response?.ok) {
            if (socket.connected) socket.emit("leaveVideoRoom", roomId);
            stream.getTracks().forEach((track) => track.stop());
            setLocalStream(null); setStatus("disconnected");
            setError(response?.error || "The call server did not respond. Please try again.");
            return;
          }
          joinedRoom = true;
          setStatus("ready");
          setPeers((current) => {
            const participants = response.participants || [];
            return [...current.map((peer) => ({ ...peer, ...participants.find((participant) => participant.socketId === peer.socketId) })),
              ...participants.filter((participant) => !current.some((peer) => peer.socketId === participant.socketId)).map((participant) => ({ ...participant, state: "connecting" }))];
          });
        });
      } catch (err) {
        if (aborted) return;
        setStatus("disconnected");
        setError(err.name === "NotAllowedError" ? "Camera or microphone access is blocked. Allow access in your browser, then try again." : err.name === "NotFoundError" ? "We couldn’t find a camera or microphone. Connect your devices and try again." : "We couldn’t start your camera and microphone. Check that another app isn’t using them, then try again.");
      }
    };
    if (socket?.connected) initCall();
    else {
      socket?.once("connect", initCall);
      connectionTimeout = setTimeout(() => { if (!aborted) { setError("We couldn’t connect to the call server. Check your connection and try again."); setStatus("disconnected"); } }, 8000);
    }
    return () => {
      aborted = true; activeRef.current = false; clearTimeout(connectionTimeout);
      socket?.off("connect", initCall); socket?.off("userJoined", handleJoined);
      socket?.off("videoOffer", handleOffer); socket?.off("videoAnswer", handleAnswer);
      socket?.off("iceCandidate", handleCandidate); socket?.off("userLeft", handleLeft); socket?.off("disconnect", handleDisconnect);
      if ((joinedRoom || cameraStream) && socket?.connected) socket.emit("leaveVideoRoom", roomId);
      cameraStream?.getTracks().forEach((track) => track.stop());
      const sharedTrack = screenStreamRef.current?.getVideoTracks()[0];
      if (sharedTrack) sharedTrack.onended = null;
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null; streamRef.current = null;
      Object.values(connections).forEach((connection) => connection.close());
    };
  }, [roomId, socket, retry]);

  useEffect(() => {
    if (status !== "ready") return;
    const startedAt = Date.now(); setDuration(0);
    const timer = setInterval(() => setDuration(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const replaceVideo = async (track) => {
    await Promise.all(Object.values(peerConnections.current).map(async (connection) => {
      const sender = connection.getSenders().find((item) => item.track?.kind === "video");
      if (sender) await sender.replaceTrack(track);
    }));
  };
  const stopScreenShare = async () => {
    const shared = screenStreamRef.current;
    const camera = streamRef.current;
    if (!shared || !camera) return;
    screenStreamRef.current = null;
    shared.getVideoTracks().forEach((track) => { track.onended = null; });
    shared.getTracks().forEach((track) => track.stop());
    try { await replaceVideo(camera.getVideoTracks()[0]); }
    catch { toast.error("Could not restore your camera. Try rejoining the call."); }
    if (activeRef.current) { setLocalStream(camera); setIsScreenSharing(false); }
  };
  const toggleScreenShare = async () => {
    if (shareBusy) return;
    setShareBusy(true);
    try {
      if (isScreenSharing) await stopScreenShare();
      else {
        const shared = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        if (!activeRef.current) { shared.getTracks().forEach((track) => track.stop()); return; }
        screenStreamRef.current = shared;
        shared.getVideoTracks()[0].onended = () => { stopScreenShare(); };
        await replaceVideo(shared.getVideoTracks()[0]);
        setLocalStream(shared); setIsScreenSharing(true);
      }
    } catch (err) {
      if (screenStreamRef.current) await stopScreenShare();
      if (err.name !== "NotAllowedError") toast.error("Screen sharing couldn’t start. Please try again.");
    } finally { if (activeRef.current) setShareBusy(false); }
  };
  const toggleAudio = () => { const track = streamRef.current?.getAudioTracks()[0]; if (track) { track.enabled = !track.enabled; setAudioEnabled(track.enabled); } };
  const toggleVideo = () => { const track = streamRef.current?.getVideoTracks()[0]; if (track) { track.enabled = !track.enabled; setVideoEnabled(track.enabled); } };
  const copyInvite = async () => { try { await navigator.clipboard.writeText(`${window.location.origin}/video-call/${roomId}`); toast.success("Call link copied"); } catch { toast.error("Couldn’t copy the link. Copy it from your address bar."); } };
  const toggleFullscreen = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await stageRef.current?.requestFullscreen(); } catch { toast.error("Fullscreen isn’t available in this browser"); } };
  const ready = status === "ready";
  const connectedCount = peers.filter((peer) => peer.state === "connected").length;

  return (
    <main ref={stageRef} className="flex h-[calc(100dvh-4.5rem)] min-h-[480px] flex-col bg-slate-950 text-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3"><span className="hidden size-10 items-center justify-center rounded-xl bg-white/5 text-primary sm:flex"><Video size={21} /></span><div><h1 className="text-sm font-semibold sm:text-base">Room for a conversation</h1><p className="mt-1 flex items-center gap-2 text-[11px] text-slate-400"><span className={`size-1.5 rounded-full ${ready ? "bg-emerald-400" : error ? "bg-red-400" : "bg-amber-400"}`} />{error ? "Call interrupted" : ready ? connectedCount ? "Connected" : "Waiting for others" : "Getting you connected"}{ready && <><span className="text-slate-600">·</span><span className="tabular-nums">{formatDuration(duration)}</span></>}</p></div></div>
        <div className="flex items-center gap-2"><button onClick={copyInvite} className="btn btn-sm border-white/10 bg-white/5 text-slate-200 hover:bg-white/10" aria-label="Copy call invite link"><Copy size={15} /><span className="hidden sm:inline">Invite someone</span></button>{document.fullscreenEnabled && <button onClick={toggleFullscreen} className="btn btn-ghost btn-sm btn-square text-slate-400 hover:bg-white/10" aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}>{fullscreen ? <Minimize size={18} /> : <Expand size={18} />}</button>}</div>
      </header>

      <div className="flex min-h-0 flex-1">
        {error ? <div className="flex flex-1 items-center justify-center p-6"><div className="max-w-md text-center"><span className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-red-400/10 text-red-400"><VideoOff size={29} /></span><h2 className="text-2xl font-semibold">Let’s get you connected.</h2><p className="mt-3 text-sm leading-relaxed text-slate-400" role="alert">{error}</p><div className="mt-6 flex justify-center gap-3"><button onClick={() => navigate("/")} className="btn border-white/10 bg-white/5 text-white hover:bg-white/10">Back to chats</button><button onClick={() => setRetry((value) => value + 1)} className="btn btn-primary"><RefreshCw size={16} />Try again</button></div></div></div> : <div className={`grid min-h-0 flex-1 auto-rows-[minmax(240px,1fr)] gap-3 overflow-y-auto p-3 sm:gap-4 sm:p-5 ${peers.length > 3 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
          <VideoTile stream={localStream} name={`${authUser.fullName} (you)`} avatar={authUser.profilePic} local cameraOff={!videoEnabled && !isScreenSharing} muted={!audioEnabled} sharing={isScreenSharing} loading={!ready} />
          {peers.map((peer, index) => <VideoTile key={peer.socketId} stream={peer.stream} name={peer.fullName || `Participant ${index + 1}`} avatar={peer.profilePic} connectionState={peer.state} />)}
          {!peers.length && <div className="call-tile flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-center"><div className="mb-6 flex size-20 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-slate-400"><Users size={32} strokeWidth={1.5} /></div><h2 className="text-xl font-semibold">Good company is on its way.</h2><p className="mt-3 max-w-xs text-xs leading-relaxed text-slate-400">{ready ? "You’re ready. Share the call link and invite someone to join you." : "Allow camera and microphone access to get started."}</p><button onClick={copyInvite} className="btn btn-sm mt-6 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"><Copy size={14} />Copy invite link</button></div>}
        </div>}

        {showParticipants && <aside className="absolute right-0 z-20 flex h-[calc(100dvh-15rem)] w-64 flex-col border-l border-white/10 bg-slate-900 p-5 shadow-xl lg:static lg:h-auto lg:shrink-0" aria-label="Call participants"><div className="mb-6 flex items-center justify-between"><h2 className="text-sm font-semibold">Participants ({peers.length + 1})</h2><button className="btn btn-ghost btn-xs btn-square text-slate-400" onClick={() => setShowParticipants(false)} aria-label="Close participant list"><X size={16} /></button></div><div className="space-y-5 overflow-y-auto"><div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm">{authUser.fullName?.[0]}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{authUser.fullName} (you)</p><p className="mt-1 text-[10px] text-slate-400">{ready ? isScreenSharing ? "Sharing screen" : "In the call" : "Connecting"}</p></div>{!audioEnabled && <MicOff size={14} className="text-red-400" />}</div>{peers.map((peer, index) => <div key={peer.socketId} className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-white/10 text-sm">{index + 1}</span><div><p className="text-xs">{peer.fullName || `Participant ${index + 1}`}</p><p className="mt-1 text-[10px] capitalize text-slate-400">{peer.state === "connected" ? "In the call" : peer.state || "Connecting"}</p></div></div>)}</div></aside>}
      </div>

      {isScreenSharing && <div className="flex shrink-0 items-center justify-center gap-2 border-t border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300"><Monitor size={14} />You’re sharing your screen<button onClick={toggleScreenShare} className="ml-2 underline underline-offset-2" disabled={shareBusy}>Stop sharing</button></div>}
      <footer className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 bg-slate-900/80 px-3 py-4 sm:px-6">
        <div className="hidden w-40 items-center gap-2 text-[11px] text-slate-400 xl:flex"><Wifi size={15} />{ready ? "You’re in the room" : "Connecting…"}</div>
        <div className="mx-auto flex items-start justify-center gap-2 sm:gap-5">
          <div className="flex flex-col items-center gap-2"><button onClick={toggleAudio} disabled={!ready} className={`call-control ${!audioEnabled ? "!border-red-400/20 !bg-red-400/15 !text-red-300" : ""}`} aria-label={audioEnabled ? "Mute microphone" : "Unmute microphone"} aria-pressed={!audioEnabled} title={audioEnabled ? "Mute microphone" : "Unmute microphone"}>{audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}</button><span className="text-[10px] text-slate-400">{audioEnabled ? "Mic on" : "Muted"}</span></div>
          <div className="flex flex-col items-center gap-2"><button onClick={toggleVideo} disabled={!ready || isScreenSharing} className={`call-control ${!videoEnabled ? "!border-red-400/20 !bg-red-400/15 !text-red-300" : ""}`} aria-label={videoEnabled ? "Turn camera off" : "Turn camera on"} aria-pressed={!videoEnabled} title={isScreenSharing ? "Stop sharing to change camera" : videoEnabled ? "Turn camera off" : "Turn camera on"}>{videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}</button><span className="text-[10px] text-slate-400">{videoEnabled ? "Camera on" : "Camera off"}</span></div>
          <div className="flex flex-col items-center gap-2"><button onClick={toggleScreenShare} disabled={!ready || shareBusy || !navigator.mediaDevices?.getDisplayMedia} className={`call-control ${isScreenSharing ? "!border-emerald-400/30 !bg-emerald-400/15 !text-emerald-300" : ""}`} aria-label={isScreenSharing ? "Stop screen sharing" : "Share screen"} aria-pressed={isScreenSharing} title={isScreenSharing ? "Stop sharing" : "Share screen"}>{shareBusy ? <Loader2 size={20} className="animate-spin" /> : isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}</button><span className="text-[10px] text-slate-400">{isScreenSharing ? "Sharing" : "Share"}</span></div>
          <div className="flex flex-col items-center gap-2"><button onClick={() => setShowParticipants(!showParticipants)} className={`call-control ${showParticipants ? "!bg-white/20" : ""}`} aria-label="Show participants" aria-pressed={showParticipants}><Users size={20} /></button><span className="text-[10px] text-slate-400">People</span></div>
          <div className="ml-1 flex flex-col items-center gap-2 border-l border-white/10 pl-2 sm:ml-2 sm:pl-5"><button onClick={() => navigate("/")} className="btn h-11 min-h-11 w-11 border-red-500 bg-red-500 text-white hover:border-red-600 hover:bg-red-600 sm:h-12 sm:min-h-12 sm:w-20" aria-label="Leave call" title="Leave call"><PhoneOff size={20} /></button><span className="text-[10px] text-slate-400">Leave</span></div>
        </div>
        <div className="hidden w-40 justify-end xl:flex"><span className="rounded-full border border-white/10 px-3 py-1.5 text-[11px] text-slate-400">{peers.length + 1} in this room</span></div>
      </footer>
    </main>
  );
};

// eslint-disable-next-line react/prop-types
const VideoTile = ({ stream, name, avatar, local = false, cameraOff = false, muted = false, sharing = false, loading = false, connectionState }) => {
  const videoRef = useRef(null);
  useEffect(() => { if (videoRef.current) videoRef.current.srcObject = stream || null; }, [stream]);
  return (
    <div className={`call-tile ${sharing ? "ring-1 ring-emerald-400/50" : ""}`}>
      <video ref={videoRef} autoPlay playsInline muted={local} className={`absolute inset-0 h-full w-full ${sharing ? "object-contain" : "object-cover"} ${local && !sharing ? "-scale-x-100" : ""} ${cameraOff ? "opacity-0" : ""}`} />
      {(cameraOff || loading) && <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-800 to-slate-900">{loading ? <><Loader2 size={32} className="animate-spin text-slate-400" /><p className="text-xs text-slate-400">Starting your camera…</p></> : <>{avatar ? <img src={avatar} alt="" className="size-24 rounded-full object-cover ring-4 ring-white/5" /> : <span className="flex size-24 items-center justify-center rounded-full bg-white/10 text-3xl font-medium">{name?.[0]}</span>}<p className="flex items-center gap-2 text-xs text-slate-400"><VideoOff size={14} />Camera is off</p></>}</div>}
      {sharing && <span className="absolute left-3 top-3 flex items-center gap-2 rounded-lg bg-emerald-500/90 px-3 py-1.5 text-[11px] font-medium text-white"><Monitor size={13} />Presenting your screen</span>}
      {!local && connectionState && connectionState !== "connected" && <span className="absolute left-3 top-3 rounded-lg bg-slate-950/70 px-3 py-1.5 text-[11px] capitalize text-amber-300">{connectionState === "new" ? "Connecting…" : connectionState}</span>}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-slate-950/80 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-3"><span className="truncate rounded-lg bg-slate-950/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">{name}</span>{muted && <span className="flex size-8 items-center justify-center rounded-full bg-red-500/80 text-white" aria-label="Microphone muted"><MicOff size={14} /></span>}{local && !muted && !loading && <span className="rounded-full bg-slate-950/40 p-2 text-white/70"><Mic size={14} /></span>}</div>
    </div>
  );
};

export default VideoCallPage;
