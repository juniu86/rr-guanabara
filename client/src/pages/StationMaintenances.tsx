import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Calendar } from "lucide-react";
import { Link, useParams } from "wouter";

export default function StationMaintenances() {
  const { id } = useParams<{ id: string }>();
  const stationId = parseInt(id);

  const { data: station } = trpc.stations.getById.useQuery({ id: stationId });
  const { data: maintenances } = trpc.maintenances.listByStation.useQuery({ stationId });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      completed: "default",
      approved: "outline",
    };
    const labels: Record<string, string> = {
      draft: "Rascunho",
      completed: "Concluída",
      approved: "Aprovada",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button asChild variant="ghost" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{station?.name}</h1>
            <p className="text-sm text-muted-foreground">{station?.address}</p>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground mb-2">Histórico de Manutenções</h2>
          <p className="text-muted-foreground">
            Visualize todas as manutenções preventivas realizadas neste posto
          </p>
        </div>

        {!maintenances || maintenances.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma manutenção encontrada</CardTitle>
              <CardDescription>
                Este posto ainda não possui manutenções registradas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/nova-manutencao">Criar Nova Manutenção</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {maintenances.map((maintenance) => (
              <Card key={maintenance.id} className="hover:border-primary transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Preventiva Nº {maintenance.preventiveNumber}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(maintenance.date).toLocaleDateString("pt-BR")}
                      </CardDescription>
                    </div>
                    {getStatusBadge(maintenance.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  {maintenance.observations && (
                    <p className="text-sm text-muted-foreground mb-4">
                      {maintenance.observations}
                    </p>
                  )}
                  <Button asChild variant="outline">
                    <Link href={`/manutencao/${maintenance.id}`}>Ver Detalhes</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
