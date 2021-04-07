import React, { useState, useCallback, useEffect } from "react";
import ReactDOM from "react-dom";
import cx from "classnames";
import "@spectrum-web-components/theme/sp-theme.js";
import "@spectrum-web-components/theme/theme-dark.js";
import "@spectrum-web-components/theme/scale-medium.js";
import "@spectrum-web-components/slider/sp-slider.js";
import "./index.css";

function range(n) {
  return Array.from({ length: n }).map((_, i) => i);
}

function Cell({ select, selected }) {
  return (
    <div
      className={cx("cell", { selected })}
      onClick={select}
      onPointerMove={(e) => e.buttons && select()}
    ></div>
  );
}

function Column({ playing, val, setVal }) {
  return (
    <div className={cx("column", { playing })}>
      {range(5).map((i) => (
        <Cell key={i} select={() => setVal(i)} selected={val === i} />
      ))}
    </div>
  );
}

function Sequencer({
  sequence,
  setSequence,
  device,
  paused,
  onToggle,
  onRemove,
}) {
  const [playing, setPlaying] = useState(0);

  const setVal = useCallback(
    (v, i) => {
      const newSequence = {...sequence};
      newSequence.values[i] = v;
      setSequence(newSequence);
    },
    [sequence, setSequence]
  );

  const setDuration = useCallback(
    (duration) => {
      const newSequence = {...sequence};
      newSequence.duration = duration;
      setSequence(newSequence);
    },
    [sequence, setSequence]
  );

  useEffect(() => {
    if (paused) return;

    const id = setInterval(() => {
      setPlaying((playing) => {
        playing = (playing + 1) % 20;
        device.vibrate(sequence.values[playing] / 4);
        return playing;
      });
    }, sequence.duration);

    return () => clearInterval(id);
  }, [device, paused, sequence]);

  return (
    <div className="sequencer">
      <div className="grid">
        {sequence.values.map((v, i) => (
          <Column
            key={i}
            playing={playing === i}
            val={v}
            setVal={(v) => setVal(v, i)}
          />
        ))}
      </div>
      <div className="controls">
        <button onClick={() => onToggle(paused)} disabled={!device}>
          {paused ? "play" : "pause"}
        </button>
        <sp-slider
          label="duration"
          value={sequence.duration}
          min={500}
          max={3000}
          step={500}
          onInput={(e) => setDuration(parseInt(e.target.value, 10))}
        ></sp-slider>
        <div className="spacer"></div>
        <button onClick={onRemove}>remove</button>
      </div>
    </div>
  );
}

const initialSequences = localStorage.sequences
  ? JSON.parse(localStorage.sequences)
  : [{values: range(20).map(() => 0), duration: 500}];

function App() {
  const [connecting, setConnecting] = useState(true);
  const [devices, setDevices] = useState([]);
  const [device, setDevice] = useState();
  const [sequences, setSequences] = useState(initialSequences);
  const [playing, setPlaying] = useState();

  const setDeviceIndex = useCallback((index, devices) => {
    index = Number(index);
    if (isNaN(index)) return;
    localStorage.deviceIndex = index;
    const device = devices.find((device) => device.Index === index);
    if (device) setDevice(device);
  });

  useEffect(async () => {
    await Buttplug.buttplugInit();

    const client = new Buttplug.ButtplugClient("vibe sequencer");
    client.on("deviceadded", () => {
      setDevices(client.Devices);
      setDeviceIndex(localStorage.deviceIndex, client.Devices);
    });

    await client.connect(new Buttplug.ButtplugWebsocketConnectorOptions());

    setDevices(client.Devices);
    setDeviceIndex(localStorage.deviceIndex, client.Devices);

    client.startScanning();

    setConnecting(false);
  }, []);

  return (
    <sp-theme>
      <h1>vibe sequencer</h1>

      <label className="device">
        Device:{" "}
        <select
          value={localStorage.deviceIndex || ""}
          onChange={(e) => setDeviceIndex(e.target.value, devices)}
        >
          <option disabled value="">
            {connecting ? "connecting..." : "select a device"}
          </option>
          {devices.map((device, i) => (
            <option key={i} value={device.Index}>
              {device.Name}
            </option>
          ))}
        </select>
      </label>

      {sequences.map((sequence, i) => {
        return (
          <Sequencer
            paused={playing !== i}
            onToggle={(play) => {
              if (play) setPlaying(i);
              else {
                device.stop();
                setPlaying(null);
              }
            }}
            onRemove={() => {
              if (playing === i) {
                if (device) device.stop();
                setPlaying(null);
              }
              const newSequences = sequences.slice(0);
              newSequences.splice(i, 1);
              localStorage.sequences = JSON.stringify(newSequences);
              setSequences(newSequences);
            }}
            key={i}
            sequence={sequence}
            setSequence={(sequence) => {
              const newSequences = sequences.slice(0);
              newSequences[i] = sequence;
              localStorage.sequences = JSON.stringify(newSequences);
              setSequences(newSequences);
            }}
            device={device}
          />
        );
      })}

      <button
        onClick={() => {
          const newSequences = sequences.slice(0);
          newSequences.push({values: range(20).map(() => 0), duration: 500});
          localStorage.sequences = JSON.stringify(newSequences);
          setSequences(newSequences);
        }}
      >
        Add Sequencer
      </button>
    </sp-theme>
  );
}

ReactDOM.render(<App />, document.getElementById("root"));
