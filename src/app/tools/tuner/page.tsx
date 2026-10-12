import { BackLink } from "@/components/back-link";
import { TunerPanel } from "@/components/tuner-panel";
import { PageTitle } from "@/components/ui";

export default function TunerPage() {
  return (
    <div>
      <BackLink href="/tools" label="Tools" />
      <div className="mt-4">
        <PageTitle>Tuner</PageTitle>
      </div>
      <div className="mt-8">
        <TunerPanel />
      </div>
    </div>
  );
}
