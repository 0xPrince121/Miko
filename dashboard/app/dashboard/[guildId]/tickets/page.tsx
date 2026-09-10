"use client";

import { useParams } from "next/navigation";
import { Tickets } from "@/components/pages/Tickets";

export default function TicketsPage() {
  const { guildId } = useParams<{ guildId: string }>();
  return <Tickets guildId={guildId} />;
}