import { ComingSoon } from "@/components/coming-soon";

export default function Progress() {
  return (
    <ComingSoon
      title="Progress"
      lines={[
        "Chord changes per minute, clean tempos, and personal bests",
        "Recordings to compare this week with last month",
        "A 30-second weekly review",
      ]}
    />
  );
}
