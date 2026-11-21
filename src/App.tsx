import { useState } from 'react';
import { Config } from './components/Config';
import { Display } from './components/Display';
import { loadSelection, saveSelection } from './lib/settings';

export default function App() {
  const [selected, setSelected] = useState<string[]>(loadSelection);
  const [running, setRunning] = useState(false);

  if (running) {
    return (
      <Display
        selected={selected}
        onOpenSettings={() => {
          if (document.fullscreenElement) void document.exitFullscreen();
          setRunning(false);
        }}
      />
    );
  }

  return (
    <Config
      initial={selected}
      onStart={(sel) => {
        setSelected(sel);
        saveSelection(sel);
        setRunning(true);
      }}
    />
  );
}
