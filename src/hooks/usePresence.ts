import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "braba_presence_id";

function getPresenceId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `anon-${Date.now()}-${Math.random()}`);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `anon-${Date.now()}-${Math.random()}`;
  }
}

/**
 * Registra a aba atual no canal Realtime `presence:site` para contar visitantes online.
 * Deve ser montado uma única vez, no root.
 */
export function usePresence() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = getPresenceId();
    const channel = supabase.channel("presence:site", {
      config: { presence: { key } },
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        try {
          const { data } = await supabase.auth.getUser();
          await channel.track({
            online_at: new Date().toISOString(),
            authenticated: !!data.user,
            path: window.location.pathname,
          });
        } catch {
          await channel.track({ online_at: new Date().toISOString(), authenticated: false });
        }
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}
