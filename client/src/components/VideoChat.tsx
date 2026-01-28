import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { agoraService, RemoteUser } from '../services/agora';

interface VideoChatProps {
  channelName?: string;
  inline?: boolean;
}

export function VideoChat({ channelName, inline = false }: VideoChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState(agoraService.getLocalVideoTrack());

  const localVideoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubConnection = agoraService.onConnectionChange((connected) => {
      setIsConnected(connected);
      if (!connected) {
        setAudioMuted(false);
        setVideoMuted(false);
      }
    });
    const unsubRemote = agoraService.onRemoteUsersChange(setRemoteUsers);
    const unsubError = agoraService.onError((err) => setError(err.message));
    const unsubLocal = agoraService.onLocalTracksChange((track) => {
      setLocalVideoTrack(track);
    });

    return () => {
      unsubConnection();
      unsubRemote();
      unsubError();
      unsubLocal();
      agoraService.leaveChannel();
    };
  }, []);

  useEffect(() => {
    const container = localVideoRef.current;
    if (!localVideoTrack || !container) return;

    localVideoTrack.play(container);

    return () => {
      localVideoTrack.stop();
    };
  }, [localVideoTrack]);

  const handleJoin = async () => {
    if (!channelName || isJoining) return;
    setIsJoining(true);
    setError(null);
    try {
      await agoraService.joinChannel(channelName);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    await agoraService.leaveChannel();
    setRemoteUsers([]);
    setAudioMuted(false);
    setVideoMuted(false);
  };

  const handleToggleAudio = async () => {
    const muted = await agoraService.toggleAudio();
    setAudioMuted(muted);
  };

  const handleToggleVideo = async () => {
    const muted = await agoraService.toggleVideo();
    setVideoMuted(muted);
  };

  // Inline mode - renders as part of the layout
  if (inline) {
    return (
      <div className="h-full flex flex-col bg-gray-800 p-1 min-h-0 overflow-hidden">
        {error && (
          <div className="text-[10px] text-red-400 bg-red-900/30 px-1 py-0.5 rounded mb-1 flex-shrink-0">
            {error}
          </div>
        )}

        {!isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-0">
            <Video className="w-6 h-6 text-gray-500 mb-1" />
            <button
              onClick={handleJoin}
              disabled={!channelName || isJoining}
              className="btn btn-primary text-xs px-2 py-1"
            >
              {isJoining ? '...' : 'Join'}
            </button>
          </div>
        ) : (
          <>
            {/* Video grid - side by side */}
            <div className="flex-1 flex gap-1 min-h-0 overflow-hidden">
              {/* Local video */}
              <div className="relative bg-gray-900 rounded overflow-hidden flex-1 min-w-0">
                <div className="absolute top-0.5 left-0.5 text-[8px] bg-emerald-600/80 px-1 rounded z-10">
                  You
                </div>
                <div
                  ref={localVideoRef}
                  className="w-full h-full flex items-center justify-center text-gray-600"
                >
                  {!localVideoTrack && (videoMuted ? <VideoOff className="w-4 h-4" /> : '')}
                </div>
              </div>

              {/* Remote video (first user) or waiting */}
              {remoteUsers.length > 0 ? (
                <RemoteVideoTile user={remoteUsers[0]} />
              ) : (
                <div className="flex-1 min-w-0 bg-gray-900 rounded flex items-center justify-center text-gray-600 text-[10px]">
                  Waiting...
                </div>
              )}
            </div>

            {/* Controls - compact */}
            <div className="flex items-center justify-center gap-1 pt-1 flex-shrink-0">
              <button
                onClick={handleToggleAudio}
                className={`p-1.5 rounded-full ${audioMuted ? 'bg-red-600' : 'bg-gray-700'}`}
                title={audioMuted ? 'Unmute' : 'Mute'}
              >
                {audioMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              </button>
              <button
                onClick={handleToggleVideo}
                className={`p-1.5 rounded-full ${videoMuted ? 'bg-red-600' : 'bg-gray-700'}`}
                title={videoMuted ? 'Camera on' : 'Camera off'}
              >
                {videoMuted ? <VideoOff className="w-3 h-3" /> : <Video className="w-3 h-3" />}
              </button>
              <button
                onClick={handleLeave}
                className="p-1.5 rounded-full bg-red-600"
                title="Leave"
              >
                <PhoneOff className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // Non-inline mode - don't render anything (controlled by parent)
  return null;
}

function RemoteVideoTile({ user }: { user: RemoteUser }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const track = user.hasVideo ? agoraService.getRemoteVideoTrack(user.uid) : null;
    if (track) {
      track.play(container);
      return () => {
        track.stop();
      };
    }

    container.innerHTML = '';
    return undefined;
  }, [user.uid, user.hasVideo]);

  return (
    <div className="relative bg-gray-900 rounded overflow-hidden flex-1 min-w-0">
      <div className="absolute top-0.5 left-0.5 text-[8px] bg-gray-700/80 px-1 rounded z-10">
        {user.uid.toString().slice(-4)}
      </div>
      <div ref={containerRef} className="w-full h-full" />
      {!user.hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <VideoOff className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
