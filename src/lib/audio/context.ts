let ctx: AudioContext | null = null;

/** One shared AudioContext. Call from a click handler so browsers allow sound. */
export async function getAudioContext(): Promise<AudioContext> {
  if (!ctx || ctx.state === "closed") {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === "suspended") await ctx.resume();
  return ctx;
}
