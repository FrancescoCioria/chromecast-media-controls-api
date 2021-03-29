# chromecast-media-controls

API to control any media running on the Chromecast

## Install

```
yarn add chromecast-media-controls
```

## Usage

```ts
import {
  ChromecastMediaControls,

  // useful to check in advance if we can call media actions like pause() or resume()
  appSupportsMediaControls
} from "chromecast-media-controls";

const chromecast = new ChromecastMediaControls({
  // called whenever the client receives an error message
  onError: (error: Error) => {
    // handle error
  },

  /*
    called if the connection to the device is lost
    NOTE: this is not called after manually invoking "chromecast.closeConnection()"
  */
  onDisconnect: () => {
    //  handle disconnection, usually by re-initializing:
    chromecast.initialize();
  }
});

/*
  initialize connection:
    - find Chromecast device on network
    - establish connection to Chromecast device
    - initilize listeners (onError, onDisconnect)
    - look for active media session, if any
*/
await chromecast.initialize();

// pause
await chromecast.pause();

// resume
await chromecast.resume();

// stop
await chromecast.stop(); // closes current application

// seek
await chromecast.seek(120); // 120 seconds from beginning of media

// change volume
await chromecast.setVolume({ level: 0.2, muted: false });

// get current volume
const currentVolume = await chromecast.getVolume();

// returns "true" if client has been initialized and we are connected to a Chromecast device
chromecast.isConnected();

// get current media session
const currentMediaSession = await chromecast.getStatus();

// get current client session
const currentClientSession = await chromecast.session();

// close connection (you'll have to re-initialize after this)
await chromecast.closeConnection();

// low level usage
const player = await chromecast.player();
player._player; // -> instance of DefaultMediaReceiver from "castv2-client" library

chromcast.client._client; // -> instance of Platform sender from "castv2-client" library
```
