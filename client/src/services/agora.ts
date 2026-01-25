import AgoraRTC from 'agora-rtc-sdk-ng';
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  IMicrophoneAudioTrack,
  UID,
} from 'agora-rtc-sdk-ng';
import { socketService, onAgoraToken } from './socket';

AgoraRTC.setLogLevel(1);

export interface RemoteUser {
  uid: UID;
  hasVideo: boolean;
  hasAudio: boolean;
}

type RemoteUserCallback = (users: RemoteUser[]) => void;
type ConnectionCallback = (connected: boolean) => void;
type ErrorCallback = (error: Error) => void;
type LocalTracksCallback = (videoTrack: ICameraVideoTrack | null) => void;

class AgoraService {
  private client: IAgoraRTCClient | null = null;
  private localAudioTrack: IMicrophoneAudioTrack | null = null;
  private localVideoTrack: ICameraVideoTrack | null = null;

  private remoteUsers: Map<UID, IAgoraRTCRemoteUser> = new Map();

  private remoteUserCallbacks: RemoteUserCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private localTracksCallbacks: LocalTracksCallback[] = [];

  private isAudioMuted = false;
  private isVideoMuted = false;

  onRemoteUsersChange(callback: RemoteUserCallback): () => void {
    this.remoteUserCallbacks.push(callback);
    return () => {
      this.remoteUserCallbacks = this.remoteUserCallbacks.filter(cb => cb !== callback);
    };
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  onError(callback: ErrorCallback): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }

  onLocalTracksChange(callback: LocalTracksCallback): () => void {
    this.localTracksCallbacks.push(callback);
    return () => {
      this.localTracksCallbacks = this.localTracksCallbacks.filter(cb => cb !== callback);
    };
  }

  private emitRemoteUsersChange() {
    const users: RemoteUser[] = Array.from(this.remoteUsers.values()).map(user => ({
      uid: user.uid,
      hasVideo: user.hasVideo,
      hasAudio: user.hasAudio,
    }));
    this.remoteUserCallbacks.forEach(cb => cb(users));
  }

  private emitConnectionChange(connected: boolean) {
    this.connectionCallbacks.forEach(cb => cb(connected));
  }

  private emitError(error: Error) {
    this.errorCallbacks.forEach(cb => cb(error));
  }

  private emitLocalTracksChange() {
    this.localTracksCallbacks.forEach(cb => cb(this.localVideoTrack));
  }

  async joinChannel(channelName: string, uid?: number): Promise<UID> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const onComplete = () => {
        settled = true;
        unsubscribe();
        clearTimeout(timeoutId);
      };

      const unsubscribe = onAgoraToken(async (tokenData) => {
        onComplete();

        try {
          const { token, appId } = tokenData;

          this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

          this.client.on('user-published', async (user, mediaType) => {
            await this.client!.subscribe(user, mediaType);
            console.log('[Agora] Subscribed to user:', user.uid, mediaType);

            this.remoteUsers.set(user.uid, user);
            this.emitRemoteUsersChange();

            if (mediaType === 'audio') {
              user.audioTrack?.play();
            }
          });

          this.client.on('user-unpublished', (user, mediaType) => {
            console.log('[Agora] User unpublished:', user.uid, mediaType);
            if (mediaType === 'video') {
              this.emitRemoteUsersChange();
            }
          });

          this.client.on('user-left', (user) => {
            console.log('[Agora] User left:', user.uid);
            this.remoteUsers.delete(user.uid);
            this.emitRemoteUsersChange();
          });

          this.client.on('connection-state-change', (curState) => {
            console.log('[Agora] Connection state:', curState);
            this.emitConnectionChange(curState === 'CONNECTED');
          });

          const joinedUid = await this.client.join(appId, channelName, token, uid || null);
          console.log('[Agora] Joined channel:', channelName, 'as', joinedUid);

          [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
            { AEC: true, ANS: true, AGC: true },
            { encoderConfig: 'standard' }
          );

          await this.client.publish([this.localAudioTrack, this.localVideoTrack]);
          console.log('[Agora] Published local tracks');

          this.emitLocalTracksChange();
          this.emitConnectionChange(true);
          resolve(joinedUid);
        } catch (error) {
          console.error('[Agora] Join error:', error);
          this.emitError(error as Error);
          reject(error);
        }
      });

      // Request token from server
      socketService.requestAgoraToken(channelName, uid);

      // Timeout after 10 seconds
      const timeoutId = setTimeout(() => {
        if (settled) return;
        onComplete();
        reject(new Error('Agora token request timeout'));
      }, 10000);
    });
  }

  async leaveChannel(): Promise<void> {
    try {
      if (this.localAudioTrack) {
        this.localAudioTrack.stop();
        this.localAudioTrack.close();
        this.localAudioTrack = null;
      }
      if (this.localVideoTrack) {
        this.localVideoTrack.stop();
        this.localVideoTrack.close();
        this.localVideoTrack = null;
      }

      if (this.client) {
        await this.client.leave();
        this.client = null;
      }

      this.remoteUsers.clear();
      this.emitRemoteUsersChange();
      this.emitLocalTracksChange();
      this.emitConnectionChange(false);

      console.log('[Agora] Left channel');
    } catch (error) {
      console.error('[Agora] Leave error:', error);
      this.emitError(error as Error);
    }
  }

  async toggleAudio(): Promise<boolean> {
    if (this.localAudioTrack) {
      this.isAudioMuted = !this.isAudioMuted;
      await this.localAudioTrack.setEnabled(!this.isAudioMuted);
    }
    return this.isAudioMuted;
  }

  async toggleVideo(): Promise<boolean> {
    if (this.localVideoTrack) {
      this.isVideoMuted = !this.isVideoMuted;
      await this.localVideoTrack.setEnabled(!this.isVideoMuted);
    }
    return this.isVideoMuted;
  }

  getLocalVideoTrack(): ICameraVideoTrack | null {
    return this.localVideoTrack;
  }

  getRemoteVideoTrack(uid: UID) {
    return this.remoteUsers.get(uid)?.videoTrack || null;
  }

  getAudioMuted(): boolean {
    return this.isAudioMuted;
  }

  getVideoMuted(): boolean {
    return this.isVideoMuted;
  }

  isConnected(): boolean {
    return this.client?.connectionState === 'CONNECTED';
  }
}

export const agoraService = new AgoraService();
