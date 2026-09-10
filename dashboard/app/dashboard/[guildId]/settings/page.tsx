"use client";

import { useParams } from "next/navigation";
import { Settings } from "@/components/pages/Settings";

export default function SettingsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  return <Settings guildId={guildId} />;
}