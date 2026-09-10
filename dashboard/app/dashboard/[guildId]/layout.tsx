import { redirect } from "next/navigation";
import { guardGuild } from "@/lib/guard";
import { iconUrl, userAvatar } from "@/lib/discord";
import { Shell } from "@/components/Shell";

export const dynamic = "force-dynamic";

export default async function GuildLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const { guildId } = await params;
  const guard = await guardGuild(guildId);
  if (!guard.ok) {
    redirect(guard.status === 401 ? "/?error=auth_failed" : "/dashboard");
  }

  return (
    <Shell
      guildId={guildId}
      guildName={guard.guild.name}
      iconUrl={iconUrl({ id: guard.guild.id, icon: guard.guild.icon })}
      userName={guard.user.global_name ?? guard.user.username}
      userAvatarUrl={userAvatar({ id: guard.user.id, avatar: guard.user.avatar })}
    >
      {children}
    </Shell>
  );
}