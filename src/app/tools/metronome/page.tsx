import { BackLink } from "@/components/back-link";
import { MetronomePanel } from "@/components/metronome-panel";
import { PageTitle } from "@/components/ui";

export default function MetronomePage() {
  return (
    <div>
      <BackLink href="/tools" label="Tools" />
      <div className="mt-4">
        <PageTitle>Metronome</PageTitle>
        <p className="mt-2 text-ink-dim">Space bar starts and stops.</p>
      </div>
      <div className="mt-8">
        <MetronomePanel />
      </div>
    </div>
  );
}
