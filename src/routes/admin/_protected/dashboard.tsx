import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Users,
  Music,
  CheckCircle2,
  PackageCheck,
  FileEdit,
  Loader2,
  ArrowRight,
  Inbox,
  MessageCircle,
  Handshake,
  Trophy,
  ShoppingCart,
  FileText,
  CreditCard,
  Send,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAdminMetrics } from "@/lib/beats.functions";
import { getPurchaseDashboardCounts } from "@/lib/purchases.functions";


export const Route = createFileRoute("/admin/_protected/dashboard")({
  component: DashboardPage,
});

function MetricCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof Users;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-display">{value}</div>
        {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const getMetrics = useServerFn(getAdminMetrics);
  const getPurchaseCounts = useServerFn(getPurchaseDashboardCounts);
  const query = useQuery({
    queryKey: ["admin", "metrics"],
    queryFn: () => getMetrics(),
    staleTime: 30_000,
  });
  const pQuery = useQuery({
    queryKey: ["admin", "purchase-counts"],
    queryFn: () => getPurchaseCounts(),
    staleTime: 30_000,
  });

  const m = query.data;
  const p = pQuery.data;

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da operação Braba Beats.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/produtoras">
              Produtoras <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/admin/beats">
              Beats <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      {query.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando métricas...
        </div>
      ) : query.isError ? (
        <div className="text-sm text-destructive">Falha ao carregar métricas.</div>
      ) : m ? (
        <>
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="Total Produtoras"
              value={m.produtorasTotal}
              icon={Users}
              hint={`${m.produtorasAtivas} ativas`}
            />
            <MetricCard label="Total Beats" value={m.beatsTotal} icon={Music} />
            <MetricCard label="Beats Ativos" value={m.beatsAtivos} icon={CheckCircle2} />
            <MetricCard label="Beats Vendidos" value={m.beatsVendidos} icon={PackageCheck} />
          </section>

          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Rascunhos" value={m.beatsRascunho} icon={FileEdit} />
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl">Funil comercial</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/leads">
                  Ver leads <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Total de Leads" value={m.leadsTotal} icon={Inbox} />
              <MetricCard label="Leads Novos" value={m.leadsNovos} icon={MessageCircle} />
              <MetricCard label="Em Negociação" value={m.leadsNegociacao} icon={Handshake} />
              <MetricCard
                label="Convertidos"
                value={m.leadsConvertidos}
                icon={Trophy}
                hint="Pagos + entregues"
              />
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl">Compras</h2>
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/compras">
                  Ver compras <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Compras solicitadas" value={p?.total ?? 0} icon={ShoppingCart} />
              <MetricCard
                label="Comprovantes pendentes"
                value={p?.aguardando_pagamento ?? 0}
                icon={FileText}
              />
              <MetricCard
                label="Pagamentos confirmados"
                value={p?.pagamento_confirmado ?? 0}
                icon={CreditCard}
              />
              <MetricCard
                label="Arquivos enviados"
                value={p?.arquivos_enviados ?? 0}
                icon={Send}
              />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

