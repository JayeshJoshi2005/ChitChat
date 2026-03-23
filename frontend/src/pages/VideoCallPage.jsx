import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff, Monitor, MonitorOff } from "lucide-react";
import toast from "react-hot-toast";

const VideoCallPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { authUser } = useAuthStore();
  const [peers, setPeers] = useState([]);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef();
  const userVideo = useRef();
  const streamRef = useRef();
  const peerConnections = useRef({});
  const peerStreams = useRef({});
  const screenStreamRef = useRef(null);

  useEffect(() => {
    let aborted = false;
    const socket = useAuthStore.getState().socket;
    socketRef.current = socket;

    const initCall = () => {
      if (aborted || !socketRef.current?.connected) {
        if (!socketRef.current?.connected) setError("Not connected to server. Please wait or refresh.");
        return;
      }

      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setError(null);
        streamRef.current = stream;
        if (userVideo.current) userVideo.current.srcObject = stream;

        socketRef.current.emit("joinVideoRoom", roomId);

        socketRef.current.on("userJoined", async (data) => {
          const peerConnection = createPeerConnection(data.socketId);
          peerConnections.current[data.socketId] = peerConnection;

          const offer = await peerConnection.createOffer();
          await peerConnection.setLocalDescription(offer);

          socketRef.current.emit("videoOffer", {
            roomId,
            offer,
            to: data.socketId
          });
        });

        socketRef.current.on("videoOffer", async (data) => {
          const peerConnection = createPeerConnection(data.from);
          peerConnections.current[data.from] = peerConnection;

          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          socketRef.current.emit("videoAnswer", {
            roomId,
            answer,
            to: data.from
          });
        });

        socketRef.current.on("videoAnswer", async (data) => {
          const peerConnection = peerConnections.current[data.from];
          if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        });

        socketRef.current.on("iceCandidate", async (data) => {
          const peerConnection = peerConnections.current[data.from];
          if (peerConnection && data.candidate) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } catch (e) {
              console.warn("Failed to add ICE candidate:", e);
            }
          }
        });

        socketRef.current.on("userLeft", (leftSocketId) => {
          if (peerConnections.current[leftSocketId]) {
            peerConnections.current[leftSocketId].close();
            delete peerConnections.current[leftSocketId];
            delete peerStreams.current[leftSocketId];
            setPeers(prev => prev.filter(p => p.socketId !== leftSocketId));
          }
        });
      })
      .catch(err => {
        console.error("getUserMedia error:", err);
        setError(err.name === "NotAllowedError" ? "Camera/microphone access denied" : "Could not access media devices");
        toast.error("Could not access camera or microphone");
      });
    };

    if (socket?.connected) {
      initCall();
    } else {
      socket?.once("connect", initCall);
      setTimeout(() => {
        if (!aborted && !socketRef.current?.connected) setError("Connection timeout. Please refresh.");
      }, 8000);
    }

    return () => {
      aborted = true;
      socket?.off("connect", initCall);
      socketRef.current?.off("userJoined");
      socketRef.current?.off("videoOffer");
      socketRef.current?.off("videoAnswer");
      socketRef.current?.off("iceCandidate");
      socketRef.current?.off("userLeft");
      socketRef.current?.emit("leaveVideoRoom", roomId);
      streamRef.current?.getTracks().forEach(track => track.stop());
      screenStreamRef.current?.getTracks().forEach(track => track.stop());
      Object.values(peerConnections.current).forEach(pc => pc.close());
    };
  }, [roomId]);

  const createPeerConnection = (socketId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream
    streamRef.current.getTracks().forEach(track => {
      peerConnection.addTrack(track, streamRef.current);
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current.emit("iceCandidate", {
          roomId,
          candidate: event.candidate,
          to: socketId
        });
      }
    };

    peerConnection.ontrack = (event) => {
      console.log("Received remote stream from:", socketId);
      peerStreams.current[socketId] = event.streams[0];
      setPeers(peers => {
        const existing = peers.find(p => p.socketId === socketId);
        if (existing) {
          return peers.map(p => p.socketId === socketId ? { ...p, stream: event.streams[0] } : p);
        } else {
          return [...peers, { socketId, stream: event.streams[0] }];
        }
      });
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state for ${socketId}:`, peerConnection.connectionState);
    };

    return peerConnection;
  };

  const replaceTrackInPeerConnections = (newTrack) => {
    Object.values(peerConnections.current).forEach(pc => {
      const sender = pc.getSenders().find(s => s.track?.kind === "video");
      if (sender && newTrack) {
        sender.replaceTrack(newTrack);
      }
    });
  };

  const stopScreenShare = async () => {
    screenStreamRef.current?.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const videoTrack = cameraStream.getVideoTracks()[0];
    streamRef.current.getVideoTracks().forEach(t => streamRef.current.removeTrack(t));
    streamRef.current.addTrack(videoTrack);
    replaceTrackInPeerConnections(videoTrack);
    setIsScreenSharing(false);
  };

  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        await stopScreenShare();
      } else {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: "always" },
          audio: false
        });
        screenStreamRef.current = screenStream;
        screenStream.getVideoTracks()[0].onended = () => stopScreenShare();
        streamRef.current.getVideoTracks().forEach(t => streamRef.current.removeTrack(t));
        streamRef.current.addTrack(screenStream.getVideoTracks()[0]);
        replaceTrackInPeerConnections(screenStream.getVideoTracks()[0]);
        setIsScreenSharing(true);
        toast.success("Screen sharing started");
      }
    } catch (err) {
      console.error("Screen share error:", err);
      if (err.name !== "NotAllowedError") {
        toast.error("Could not share screen");
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const leaveCall = () => {
    navigate(-1);
  };

  if (error) {
    return (
      <div className="h-screen bg-base-200 flex flex-col items-center justify-center gap-4 p-4">
        <p className="text-error">{error}</p>
        <button onClick={() => navigate(-1)} className="btn btn-primary">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen bg-base-200 flex flex-col">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <div className="relative">
          <video
            ref={userVideo}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover rounded-lg bg-base-300"
          />
          <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            You {isScreenSharing && "(Sharing)"}
          </div>
        </div>
        {peers.map((peerObj) => (
          <Video key={peerObj.socketId} stream={peerObj.stream} />
        ))}
      </div>

      <div className="flex justify-center flex-wrap gap-2 p-4 bg-base-100 border-t border-base-300">
        <button
          onClick={toggleAudio}
          className={`btn btn-circle ${audioEnabled ? "btn-primary" : "btn-error"}`}
          title={audioEnabled ? "Mute" : "Unmute"}
        >
          {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button
          onClick={toggleVideo}
          className={`btn btn-circle ${videoEnabled ? "btn-primary" : "btn-error"}`}
          title={videoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {videoEnabled ? <VideoIcon size={20} /> : <VideoOff size={20} />}
        </button>
        <button
          onClick={toggleScreenShare}
          className={`btn btn-circle ${isScreenSharing ? "btn-error" : "btn-primary"}`}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          {isScreenSharing ? <MonitorOff size={20} /> : <Monitor size={20} />}
        </button>
        <button onClick={leaveCall} className="btn btn-circle btn-error" title="Leave call">
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
};

const Video = ({ stream }) => {
  const ref = useRef();

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative">
      <video
        ref={ref}
        autoPlay
        playsInline
        className="w-full h-full object-cover rounded-lg bg-base-300"
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded">
        Peer
      </div>
    </div>
  );
};

export default VideoCallPage;