# chromecast-media-controls

API to control any media running on the Chromecast

## Install

```
yarn add chromecast-media-controls
```

## Usage

```ts
import { ChromecastMediaControls } from "chromecast-media-controls";

// called whenever the client receives an error message
const onClientError = (error: Error) => {
  // handle error
};

const chromecast = new ChromecastMediaControls();
await chromecast.initialize(onClientError);

// chromecast client
chromcast.client;

// pause
await chromecast.pause();

// resume
await chromecast.resume();

// seek
await chromecast.seek(120); // 120 seconds from beginning of media

// change volume
await chromecast.setVolume({ level: 0.2, muted: false });

// get current volume
const currentVolume = await chromecast.getVolume();

// get current media session
const currentMediaSession = await chromecast.getStatus();

// low level usage
const player = await chromecast.player();
player._player; // -> instance of DefaultMediaReceiver from "castv2-client" library
```
