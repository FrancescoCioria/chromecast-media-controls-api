import { promisify } from "util";
import {
  ChromecastDevice,
  Client,
  ClientPromisified,
  ClientSession,
  Player,
  PlayerPromisified,
  _Client,
  _Player
} from "./model";
import { timeoutPromise } from "./utils";

const MDNS = require("multicast-dns");
const { Client, DefaultMediaReceiver } = require("castv2-client");

const mdns = MDNS();

const promisifyClient = (client: _Client): ClientPromisified => {
  return {
    _client: client,
    on: client.on.bind(client),
    connect: promisify(client.connect).bind(client),
    getSessions: promisify(client.getSessions).bind(client),
    join: promisify(client.join).bind(client),
    stop: promisify(client.stop).bind(client),
    close: client.close.bind(client),
    getVolume: promisify(client.getVolume).bind(client),
    setVolume: promisify(client.setVolume).bind(client)
  };
};

const initializeClient = async (host: string): Promise<ClientPromisified> => {
  const client = promisifyClient(new Client());

  console.log("Connecting to device: " + host);
  await client.connect(host);
  console.log("Connected");

  return client;
};

const promisifyPlayer = (player: _Player): PlayerPromisified => {
  return {
    play: promisify(player.play).bind(player),
    pause: promisify(player.pause).bind(player),
    stop: promisify(player.stop).bind(player),
    seek: promisify(player.seek).bind(player),
    getStatus: promisify(player.getStatus).bind(player)
  };
};

const initializePlayer = async (
  client: ClientPromisified,
  session: ClientSession
): Promise<Player> => {
  const player = await client.join(session, DefaultMediaReceiver);
  const _player: Player["_player"] = player as any;

  const promisifiedPlayer = promisifyPlayer(player);

  if (!appSupportsMediaControls(session)) {
    return Promise.reject(
      new Error(
        `The app "${session.displayName}" does not support media controls`
      )
    );
  }

  if (!_player.media.currentSession) {
    // force fetching the current media session, if any
    await timeoutPromise(promisifiedPlayer.getStatus(), 2000);
  }

  return {
    ...promisifiedPlayer,
    _player
  };
};

export const appSupportsMediaControls = (session: ClientSession): boolean => {
  return !!session.namespaces.find(
    n => n.name === "urn:x-cast:com.google.cast.media"
  );
};

export const findChromecastDevice = async (): Promise<ChromecastDevice> => {
  type Answer = {
    name: string;
    type: "PTR" | "A" | "TXT" | "SRV";
    data: unknown;
  };

  return new Promise<ChromecastDevice>((resolve, reject) => {
    mdns.on(
      "response",
      (response: { answers: Answer[]; additionals: Answer[] }) => {
        const srv = response.additionals.find(a => a.type === "SRV");
        const a = response.additionals.find(a => a.type === "A");

        if (!a) {
          reject(new Error("Could not find any Chromecast on network"));
          return;
        }

        resolve({
          name: srv ? srv.name : "unknown",
          host: String(a.data)
        });
      }
    );

    mdns.query("_googlecast._tcp.local");
  });
};

export { Client };

export class ChromecastMediaControls {
  client: Client | null = null;

  onError: (err: Error) => void;
  onDisconnect: () => void;

  private isClosingConnection: boolean = false;

  constructor(opt: {
    onError: (err: Error) => void;
    onDisconnect: () => void;
  }) {
    this.onError = opt.onError;
    this.onDisconnect = opt.onDisconnect;
  }

  private throwIfClientIsNotInitialized() {
    if (this.client === null) {
      throw new Error(
        "The chromecast client is NULL. Please call ChromecastMediaControls.initialize() before any other operation."
      );
    } else if (!this.isConnected()) {
      throw new Error(
        "There isn't an active connection to a chromecast device. Please call ChromecastMediaControls.initialize() before any other operation."
      );
    }
  }

  closeConnection = async (): Promise<void> => {
    this.throwIfClientIsNotInitialized();

    return timeoutPromise(
      new Promise<void>(resolve => {
        this.isClosingConnection = true;
        this.client!._client.client.once("close", () => {
          resolve();
        });

        this.client!.close();
      }),
      1000
    ).then(() => {
      this.isClosingConnection = false;
      this.client = null;
    });
  };

  isConnected = (): boolean => {
    return this.client !== null && this.client._client.connection !== null;
  };

  session = async () => {
    this.throwIfClientIsNotInitialized();

    const sessions = await this.client!.getSessions();

    if (sessions.length === 0) {
      throw new Error("No session available");
    }

    return sessions[0];
  };

  player = async () => {
    this.throwIfClientIsNotInitialized();

    const session = await this.session();
    return initializePlayer(this.client!, session);
  };

  pause = async () => {
    this.throwIfClientIsNotInitialized();

    const player = await this.player();
    return player.pause();
  };

  resume = async () => {
    this.throwIfClientIsNotInitialized();

    const player = await this.player();
    return player.play();
  };

  stop = async () => {
    this.throwIfClientIsNotInitialized();

    const session = await this.session();
    this.client!.stop({
      close: () => {}, // fake
      session
    });
  };

  seek = async (seconds: number) => {
    this.throwIfClientIsNotInitialized();

    const player = await this.player();
    return player.seek(seconds);
  };

  getStatus = async () => {
    this.throwIfClientIsNotInitialized();

    const player = await this.player();

    if (!appSupportsMediaControls(player._player.session)) {
      throw new Error(
        `The app ${player._player.session.displayName} does not support media controls`
      );
    }

    return (
      player._player.media.currentSession ||
      timeoutPromise(player.getStatus(), 2000)
    );
  };

  getVolume = async () => {
    this.throwIfClientIsNotInitialized();

    return this.client!.getVolume();
  };

  setVolume = async (opt: Partial<{ level: number; muted: boolean }>) => {
    this.throwIfClientIsNotInitialized();

    return this.client!.setVolume(opt);
  };

  initialize = async () => {
    if (this.isConnected()) {
      await this.closeConnection();
    }

    const { host } = await findChromecastDevice();

    const client = await initializeClient(host);
    this.client = client;

    client.on("error", err => {
      this.onError(err);
    });

    this.client._client.client.once("close", () => {
      if (!this.isClosingConnection) {
        this.onDisconnect();
      }
    });

    try {
      const session = await this.session();

      // force fetching current media session, if any
      initializePlayer(client, session);
    } catch (e) {}
  };
}
