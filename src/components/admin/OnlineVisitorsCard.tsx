import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export function OnlineVisitorsCard() {
  const [counts, setCounts] = useState({ total: 0, auth: 0, anon: 0 });

  useEffect(() => {
    const channel = supabase.channel("presence:site");

    const update = () => {
      const state = channel.presenceState<{ authenticated?: boolean }>();
      let total = 0;
      let auth = 0;
      for (const key of Object.keys(state)) {
        const metas = state[key];
        if (!metas || metas.length === 0) continue;
        total += 1;
        if (metas.some((m) => m.authenticated)) auth += 1;
      }
      setCounts({ total, auth, anon: total - auth });
    };

    channel
      .on("presence", { event: "sync" }, update)
      .on("presence", { event: "join" }, update)
      .on("presence", { event: "leave" }, update)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card className="border-l-4 border-l-accent">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Visitantes online agora
        </CardTitle>
        <Users className="h-4 w-4 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-display text-accent">{counts.total}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {counts.auth} logados · {counts.anon} anônimos
        </p>
      </CardContent>
    </Card>
  );
}
