import AgoraToken from 'agora-token';
const { RtcTokenBuilder, RtcRole } = AgoraToken;
import { AgoraTokenResponse } from '../types/index.js';

export class AgoraTokenService {
  private appId: string;
  private appCertificate: string;

  constructor() {
    this.appId = process.env.AGORA_APP_ID || '';
    this.appCertificate = process.env.AGORA_APP_CERTIFICATE || '';

    if (!this.appId || !this.appCertificate) {
      console.warn('[Agora] Credentials not configured. Video chat will not work.');
    }
  }

  isConfigured(): boolean {
    return !!(this.appId && this.appCertificate);
  }

  generateToken(
    channelName: string,
    uid: number = 0,
    role: 'publisher' | 'subscriber' = 'publisher',
    expireTimeSeconds: number = 3600
  ): AgoraTokenResponse {
    if (!this.isConfigured()) {
      throw new Error('Agora credentials not configured');
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTimeSeconds;

    const rtcRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    const token = RtcTokenBuilder.buildTokenWithUid(
      this.appId,
      this.appCertificate,
      channelName,
      uid,
      rtcRole,
      privilegeExpireTime,
      privilegeExpireTime
    );

    return {
      token,
      appId: this.appId,
      channelName,
      uid,
      expireTime: privilegeExpireTime,
    };
  }
}

export const agoraTokenService = new AgoraTokenService();
