// Web Bluetooth Service for GranBoard
// Ported from granboard-ble-test

const BLE_SERVICE_UUID = '442f1570-8a00-9a28-cbe1-e1d4212d53eb';
const BLE_WRITE_CHAR_UUID = '442f1572-8a00-9a28-cbe1-e1d4212d53eb';
const BLE_NOTIFY_CHAR_UUID = '442f1571-8a00-9a28-cbe1-e1d4212d53eb';

const NOTIF_KEYS = [
  "4.0@", "8.0@", "3.3@", "3.4@", "3.5@", "3.6@", "2.3@", "2.4@", "2.5@", "2.6@",
  "1.2@", "1.4@", "1.5@", "1.6@", "0.1@", "0.3@", "0.5@", "0.6@", "0.0@", "0.2@",
  "0.4@", "4.5@", "1.0@", "1.1@", "1.3@", "4.4@", "2.0@", "2.1@", "2.2@", "4.3@",
  "3.0@", "3.1@", "3.2@", "4.2@", "9.1@", "9.0@", "9.2@", "8.2@", "10.1@", "10.0@",
  "10.2@", "8.3@", "7.1@", "7.0@", "7.2@", "8.4@", "6.1@", "6.0@", "6.3@", "8.5@",
  "11.1@", "11.2@", "11.4@", "8.6@", "11.0@", "11.3@", "11.5@", "11.6@", "6.2@", "6.4@",
  "6.5@", "6.6@", "7.3@", "7.4@", "7.5@", "7.6@", "10.3@", "10.4@", "10.5@", "10.6@",
  "9.3@", "9.4@", "9.5@", "9.6@", "5.0@", "5.3@", "5.5@", "5.6@", "5.1@", "5.2@", "5.4@", "4.6@", "BTN@", "OUT@"
];

const NOTIF_VALUES = [
  "DB", "SB", "S20", "T20", "S20", "D20", "S1", "T1", "S1", "D1",
  "S18", "T18", "S18", "D18", "S4", "T4", "S4", "D4", "S13", "T13",
  "S13", "D13", "S6", "T6", "S6", "D6", "S10", "T10", "S10", "D10",
  "S15", "T15", "S15", "D15", "S2", "T2", "S2", "D2", "S17", "T17",
  "S17", "D17", "S3", "T3", "S3", "D3", "S19", "T19", "S19", "D19",
  "S7", "T7", "S7", "D7", "S16", "T16", "S16", "D16", "S8", "T8",
  "S8", "D8", "S11", "T11", "S11", "D11", "S14", "T14", "S14", "D14",
  "S9", "T9", "S9", "D9", "S12", "T12", "S12", "D12", "S5", "T5", "S5", "D5", "BTN", "OUT"
];

export interface DartHit {
  multiplier: string;
  value: number;
  points: number;
  timestamp: number;
}

type HitCallback = (hit: DartHit) => void;
type LogCallback = (message: string) => void;
type ConnectionCallback = (connected: boolean) => void;

class BleService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;

  private hitCallbacks: HitCallback[] = [];
  private logCallbacks: LogCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];

  isSupported(): boolean {
    return 'bluetooth' in navigator;
  }

  onHit(callback: HitCallback): () => void {
    this.hitCallbacks.push(callback);
    return () => {
      this.hitCallbacks = this.hitCallbacks.filter(cb => cb !== callback);
    };
  }

  onLog(callback: LogCallback): () => void {
    this.logCallbacks.push(callback);
    return () => {
      this.logCallbacks = this.logCallbacks.filter(cb => cb !== callback);
    };
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  private log(message: string) {
    console.log(`[BLE] ${message}`);
    this.logCallbacks.forEach(cb => cb(message));
  }

  private emitHit(hit: DartHit) {
    this.hitCallbacks.forEach(cb => cb(hit));
  }

  private emitConnectionChange(connected: boolean) {
    this.connectionCallbacks.forEach(cb => cb(connected));
  }

  private decodeNotification(data: DataView): DartHit | null {
    const decoder = new TextDecoder();
    const bytes = new Uint8Array(data.buffer);
    const decoded = decoder.decode(bytes);

    const index = NOTIF_KEYS.indexOf(decoded);
    if (index < 0) {
      this.log(`Unknown notification: ${decoded}`);
      return null;
    }

    const dartString = NOTIF_VALUES[index];
    return this.parseDartString(dartString);
  }

  private parseDartString(dartString: string): DartHit {
    const timestamp = Date.now();

    if (dartString === 'OUT' || dartString === 'BTN') {
      return { multiplier: 'OUT', value: 0, points: 0, timestamp };
    }

    if (dartString === 'SB') {
      return { multiplier: 'SB', value: 25, points: 25, timestamp };
    }

    if (dartString === 'DB') {
      return { multiplier: 'DB', value: 25, points: 50, timestamp };
    }

    const multiplier = dartString[0];
    const value = parseInt(dartString.substring(1), 10);

    let points = value;
    if (multiplier === 'D') points = value * 2;
    if (multiplier === 'T') points = value * 3;

    return { multiplier, value, points, timestamp };
  }

  async connect(): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Web Bluetooth is not supported in this browser');
    }

    try {
      this.log('Requesting Bluetooth device...');

      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'GRAN' }],
        optionalServices: [BLE_SERVICE_UUID],
      });

      this.log(`Found device: ${this.device.name}`);

      this.device.addEventListener('gattserverdisconnected', () => {
        this.log('Device disconnected');
        this.server = null;
        this.writeChar = null;
        this.notifyChar = null;
        this.emitConnectionChange(false);
      });

      this.log('Connecting to GATT server...');
      this.server = await this.device.gatt!.connect();

      this.log('Getting GranBoard service...');
      const service = await this.server.getPrimaryService(BLE_SERVICE_UUID);

      this.log('Getting characteristics...');
      this.writeChar = await service.getCharacteristic(BLE_WRITE_CHAR_UUID);
      this.notifyChar = await service.getCharacteristic(BLE_NOTIFY_CHAR_UUID);

      this.log('Subscribing to notifications...');
      await this.notifyChar.startNotifications();

      this.notifyChar.addEventListener('characteristicvaluechanged', (event) => {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        if (target.value) {
          const hit = this.decodeNotification(target.value);
          if (hit) {
            this.log(`🎯 Hit: ${hit.multiplier}${hit.value} (${hit.points} pts)`);
            this.emitHit(hit);
          }
        }
      });

      this.log('Connected and listening for hits!');
      this.emitConnectionChange(true);

      await this.clearLEDs();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.log(`Connection error: ${message}`);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.server) {
      this.server.disconnect();
      this.server = null;
      this.writeChar = null;
      this.notifyChar = null;
      this.device = null;
      this.log('Disconnected');
      this.emitConnectionChange(false);
    }
  }

  isConnected(): boolean {
    return this.server?.connected ?? false;
  }

  getDeviceName(): string | null {
    return this.device?.name ?? null;
  }

  async sendCommand(bytes: number[]): Promise<void> {
    if (!this.writeChar) {
      throw new Error('Not connected to board');
    }

    const data = new Uint8Array(16);
    bytes.forEach((b, i) => {
      if (i < 16) data[i] = b;
    });

    await this.writeChar.writeValue(data);
    this.log(`Sent: ${Array.from(data).map(b => b.toString(16).padStart(2, '0')).join(' ')}`);
  }

  async clearLEDs(): Promise<void> {
    await this.sendCommand([5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  }

  async lightRing(r: number, g: number, b: number): Promise<void> {
    await this.sendCommand([17, r, g, b, 0, 0, 0, 0, 0, 0, 0, 0, 0x14, 0, 0, 1]);
  }

  async rainbowAnimation(): Promise<void> {
    await this.sendCommand([16, 255, 255, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0x14, 0, 0, 1]);
  }
}

export const bleService = new BleService();
