export type Callback<A> = (err: null | Error, res: A) => void;

export type Volume = { level: number; muted: boolean };

export type ClientSession = {
  appId: string;
  appType: "WEB";
  displayName: string;
  iconUrl: string;
  isIdleScreen: boolean;
  launchedFromCloud: boolean;
  namespaces: Array<{ name: string }>;
  sessionId: string;
  statusText: string;
  transportId: string;
  universalAppId: string;
};

export type MediaSession = {
  mediaSessionId: number;
  playbackRate: number;
  supportedMediaCommands: number;
  volume: Volume;
  playerState: "PLAYING" | "PAUSED" | "IDLE" | "BUFFERING";
  customData: unknown;
  currentTime: number;
  media: {
    contentId: string;
    contentType: string;
    streamType: "BUFFERED" | "LIVE";
    metadata: {
      metadataType: number;
      title: string;
      subtitle: string;
      images: unknown[];
    };
    duration: number;
  };
};

export type _Client = {
  on: (event: "error", cb: (err: Error) => void) => void;
  connect: (host: string, cb: Callback<void>) => void;
  getSessions: (cb: Callback<ClientSession[]>) => void;
  join: (session: ClientSession, app: unknown, cb: Callback<_Player>) => void;
  stop: (
    app: { close: () => void; session: ClientSession },
    cb: Callback<void>
  ) => Promise<void>;
  close: (cb: Callback<void>) => void;
  getVolume: (cb: Callback<Volume>) => void;
  setVolume: (opt: Partial<Volume>, callback: Callback<void>) => void;
};

export type ClientPromisified = {
  _client: any;
  on: _Client["on"];
  connect: (host: string) => Promise<void>;
  getSessions: () => Promise<ClientSession[]>;
  join: (session: ClientSession, app: unknown) => Promise<_Player>;
  stop: (app: { close: () => void; session: ClientSession }) => Promise<void>;
  close: () => Promise<void>;
  getVolume: () => Promise<Volume>;
  setVolume: (opt: Partial<Volume>) => Promise<void>;
};

export type Client = ClientPromisified;

export type _Player = {
  play: (callback: Callback<void>) => void;
  pause: (callback: Callback<void>) => void;
  stop: (callback: Callback<void>) => void;
  seek: (seconds: number, callback: Callback<void>) => void;
  getStatus: (callback: Callback<MediaSession>) => void;
};

export type PlayerPromisified = {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  seek: (seconds: number) => Promise<void>;
  getStatus: () => Promise<MediaSession>;
};

export type Player = PlayerPromisified & {
  _player: {
    session: ClientSession;
    media: {
      currentSession: MediaSession | null;
    };
  };
};

export type ChromecastDevice = { name: string; host: string };
