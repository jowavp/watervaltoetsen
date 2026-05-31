import { useEffect, useState } from 'react';

export function useSpeak() {
  const [speaking, setSpeaking] = useState(false);

  const pick = () => {
    const vs = window.speechSynthesis ? speechSynthesis.getVoices() : [];
    return (
      vs.find((v) => /nl[-_]BE/i.test(v.lang)) ||
      vs.find((v) => /^nl/i.test(v.lang)) ||
      vs.find((v) => /dutch|neder/i.test(v.name)) ||
      null
    );
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'nl-BE';
    u.rate = 0.95;
    u.pitch = 1.05;
    const v = pick();
    if (v) u.voice = v;
    u.onstart = () => setSpeaking(true);
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    speechSynthesis.speak(u);
  };

  const stop = () => {
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
      setSpeaking(false);
    }
  };

  useEffect(() => () => stop(), []);

  return { speak, stop, speaking };
}
