import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react';
import { agoraService, RemoteUser } from '../services/agora';

interface VideoChatProps {
  channelName?: string;
}

export function VideoChat({ channelName }: VideoChatProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([]);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localUid, setLocalUid] = useState<number | null>(null);
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
      const uid = await agoraService.joinChannel(channelName);
      setLocalUid(Number(uid));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeave = async () => {
    await agoraService.leaveChannel();
    setLocalUid(null);
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

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xl font-bold">Live Video Chat</h3>
          <p className="text-sm text-gray-400">Chat with other players in this match.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isConnected ? (
            <>
              <button onClick={handleToggleAudio} className="btn btn-secondary flex items-center gap-2">
                {audioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {audioMuted ? 'Unmute' : 'Mute'}
              </button>
              <button onClick={handleToggleVideo} className="btn btn-secondary flex items-center gap-2">
                {videoMuted ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                {videoMuted ? 'Show Video' : 'Hide Video'}
              </button>
              <button onClick={handleLeave} className="btn btn-danger flex items-center gap-2">
                <PhoneOff className="w-4 h-4" />
                Leave
              </button>
            </>
          ) : (
            <button
              onClick={handleJoin}
              disabled={!channelName || isJoining}
              className="btn btn-primary flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              {isJoining ? 'Connecting…' : 'Join Call'}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative bg-gray-800 rounded-lg h-56 overflow-hidden">
          <div className="absolute top-2 left-2 text-xs bg-emerald-600 px-2 py-1 rounded">
            You {localUid ? `(UID: ${localUid})` : ''}
          </div>
          <div
            ref={localVideoRef}
            className="w-full h-full flex items-center justify-center text-gray-500 text-sm"
          >
            {!localVideoTrack && <span>{isConnected ? 'Audio Only' : 'Not Connected'}</span>}
          </div>
        </div>

        {remoteUsers.length === 0 && (
          <div className="bg-gray-800 rounded-lg h-56 flex items-center justify-center text-gray-500 text-sm">
            {isConnected ? 'Waiting for other players to join…' : 'No remote streams yet'}
          </div>
        )}

        {remoteUsers.map((user) => (
          <RemoteVideoTile key={user.uid.toString()} user={user} />
        ))}
      </div>
    </div>
  );
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
    <div className="relative bg-gray-800 rounded-lg h-56 overflow-hidden">
      <div className="absolute top-2 left-2 text-xs bg-gray-700 px-2 py-1 rounded">
        User {user.uid.toString()}
      </div>
      <div ref={containerRef} className="w-full h-full" />
      {!user.hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm bg-gray-900/50">
          Camera Off
        </div>
      )}
    </div>
  );
}
