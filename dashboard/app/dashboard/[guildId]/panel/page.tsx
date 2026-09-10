"use client";

import { useParams } from "next/navigation";
import { Panel } from "@/components/pages/Panel";

export default function PanelPage() {
  const { guildId } = useParams<{ guildId: string }>();
  return <Panel guildId={guildId} />;
}