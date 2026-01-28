import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Download, Image as ImageIcon } from "lucide-react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";

export default function MaintenanceDetails() {
  const { id } = useParams<{ id: string }>();
  const maintenanceId = parseInt(id);

  const { data: maintenance } = trpc.maintenances.getById.useQuery({ id: maintenanceId });
  const { data: station } = trpc.stations.getById.useQuery(
    { id: maintenance?.stationId || 0 },
    { enabled: !!maintenance }
  );

  const generatePDFMutation = trpc.maintenances.generatePDF.useMutation();

  const handleGeneratePDF = async () => {
    // Validação do ID
    if (!maintenanceId || isNaN(maintenanceId)) {
      toast.error('ID de manutenção inválido');
      console.error('[PDF] ID inválido:', maintenanceId, 'id original:', id);
      return;
    }

    try {
      // Mostrar loading
      toast.loading('Gerando PDF...', { id: 'pdf-generation' });
      console.log('[PDF] Iniciando geração para ID:', maintenanceId);
      
      // Chamar API
      const result = await generatePDFMutation.mutateAsync({ 
        id: maintenanceId
      });
      
      console.log('[PDF] PDF gerado com sucesso:', result.url);
      
      // Abrir PDF em nova aba
      window.open(result.url, '_blank');
      
      // Sucesso
      toast.success('PDF gerado com sucesso!', { id: 'pdf-generation' });
    } catch (error) {
      // Log detalhado do erro
      console.error('[PDF] Erro completo:', {
        error,
        message: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        maintenanceId,
        maintenance
      });
      
      // Mensagem específica para o usuário
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Erro desconhecido ao gerar PDF';
      
      toast.error(`Erro: ${errorMessage}`, { id: 'pdf-generation' });
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      confere: "Confere",
      nao_conferido: "Não Conferido",
      realizar_limpeza: "Realizar Limpeza",
      realizar_reparo: "Realizar Reparo",
      realizar_troca: "Realizar Troca",
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      confere: "default",
      nao_conferido: "secondary",
      realizar_limpeza: "outline",
      realizar_reparo: "destructive",
      realizar_troca: "destructive",
    };
    return variants[status] || "default";
  };

  if (!maintenance) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href={`/posto/${maintenance.stationId}`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                Preventiva Nº {maintenance.preventiveNumber}
              </h1>
              <p className="text-sm text-muted-foreground">{station?.name}</p>
            </div>
          </div>
          <Button onClick={handleGeneratePDF} disabled={generatePDFMutation.isPending} className="gap-2">
            <Download className="h-4 w-4" />
            {generatePDFMutation.isPending ? "Gerando PDF..." : "Gerar PDF"}
          </Button>
        </div>
      </header>

      <main className="container py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informações da Manutenção</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Data</p>
              <p className="font-semibold">{new Date(maintenance.date).toLocaleDateString("pt-BR")}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={maintenance.status === "approved" ? "default" : "secondary"}>
                {maintenance.status === "draft" ? "Rascunho" : maintenance.status === "completed" ? "Concluída" : "Aprovada"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Posto</p>
              <p className="font-semibold">{station?.name}</p>
            </div>
            {maintenance.observations && (
              <div className="md:col-span-3">
                <p className="text-sm text-muted-foreground">Observações Gerais</p>
                <p className="mt-1">{maintenance.observations}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklist de Equipamentos</CardTitle>
            <CardDescription>
              {maintenance.items?.length || 0} itens verificados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {maintenance.items?.map((item) => (
              <div key={item.id} className="border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {item.itemNumber}. {item.equipmentName}
                    </h3>
                    {item.value && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Valor: {item.value}
                      </p>
                    )}
                  </div>
                  <Badge variant={getStatusVariant(item.status)}>
                    {getStatusLabel(item.status)}
                  </Badge>
                </div>

                {item.correctiveAction && (
                  <div className="bg-muted/50 rounded p-3">
                    <p className="text-sm font-medium text-foreground mb-1">Ação Corretiva:</p>
                    <p className="text-sm text-muted-foreground">{item.correctiveAction}</p>
                  </div>
                )}

                {item.observations && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">Observações:</p>
                    <p className="text-sm text-muted-foreground">{item.observations}</p>
                  </div>
                )}

                {item.photos && item.photos.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Fotos ({item.photos.length})
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {item.photos.map((photo) => (
                        <a
                          key={photo.id}
                          href={photo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                        >
                          <img
                            src={photo.url}
                            alt={photo.description || "Foto do equipamento"}
                            className="w-full h-full object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
