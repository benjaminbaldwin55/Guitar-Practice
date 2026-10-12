import { getAudioContext } from "./context";

/** A short beep. Used for count-ins and "time's up". */
export async function beep(freq = 880, ms = 120, vol = 0.3): Promise<void> {
  const ctx = await getAudioContext();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  osc.connect(g).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + ms / 1000 + 0.02);
}
