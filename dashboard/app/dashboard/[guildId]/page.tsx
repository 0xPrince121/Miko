"use client";

import { useParams } from "next/navigation";
import { Overview } from "@/components/pages/Overview";

export default function OverviewPage() {
  const { guildId } = useParams<{ guildId: string }>();
  return <Overview guildId={guildId} />;
}