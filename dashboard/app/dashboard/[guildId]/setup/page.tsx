"use client";

import { useParams } from "next/navigation";
import { Setup } from "@/components/pages/Setup";

export default function SetupPage() {
  const { guildId } = useParams<{ guildId: string }>();
  return <Setup guildId={guildId} />;
}