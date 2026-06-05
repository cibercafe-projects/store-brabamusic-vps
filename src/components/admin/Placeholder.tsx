import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function AdminPlaceholder({ title, description }: { title: string; description?: string }) {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display text-2xl">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-muted-foreground">
        <p>Tela em desenvolvimento.</p>
        {description && <p className="text-sm">{description}</p>}
        <p className="text-xs">Será implementada nas próximas sprints.</p>
      </CardContent>
    </Card>
  );
}
