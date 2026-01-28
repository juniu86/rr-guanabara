import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { CHECKLIST_EQUIPMENT } from "@shared/checklistEquipments";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type ChecklistItemData = {
  itemNumber: number;
  equipmentName: string;
  status: "confere" | "nao_conferido" | "realizar_limpeza" | "realizar_reparo" | "realizar_troca";
  value?: string;
  correctiveAction?: string;
  observations?: string;
  photos: File[];
};

export default function NewMaintenance() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: stations } = trpc.stations.list.useQuery();

  const [stationId, setStationId] = useState<string>("");
  const [preventiveNumber, setPreventiveNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [observations, setObservations] = useState("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItemData[]>(
    CHECKLIST_EQUIPMENT.map((eq) => ({
      itemNumber: eq.itemNumber,
      equipmentName: eq.equipmentName,
      status: "nao_conferido" as const,
      value: "",
      correctiveAction: "",
      observations: "",
      photos: [],
    }))
  );

  const createMaintenanceMutation = trpc.maintenances.create.useMutation();
  const createChecklistItemMutation = trpc.checklistItems.create.useMutation();
  const uploadPhotoMutation = trpc.photos.upload.useMutation();

  // Cálculo de progresso
  const filledItems = checklistItems.filter(item => 
    item.status !== 'nao_conferido'
  ).length;
  const progress = (filledItems / checklistItems.length) * 100;

  // Salvamento automático a cada 30 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      try {
        // Preparar dados para salvar (sem fotos, pois File não é serializável)
        const dataToSave = {
          stationId,
          preventiveNumber,
          date,
          observations,
          checklistItems: checklistItems.map(item => ({
            itemNumber: item.itemNumber,
            equipmentName: item.equipmentName,
            status: item.status,
            value: item.value,
            correctiveAction: item.correctiveAction,
            observations: item.observations,
            photoCount: item.photos.length
          })),
          timestamp: Date.now()
        };
        
        localStorage.setItem('maintenance-draft', JSON.stringify(dataToSave));
        setLastSaved(new Date());
        toast.success('Rascunho salvo automaticamente', { 
          duration: 2000,
          icon: '💾'
        });
      } catch (error) {
        console.error('[AutoSave] Erro ao salvar:', error);
      }
    }, 30000); // 30 segundos
    
    return () => clearInterval(timer);
  }, [stationId, preventiveNumber, date, observations, checklistItems]);

  // Recuperar rascunho ao montar componente
  useEffect(() => {
    const draft = localStorage.getItem('maintenance-draft');
    if (draft) {
      try {
        const { data: savedData, timestamp } = JSON.parse(draft);
        const draftAge = Date.now() - (savedData?.timestamp || timestamp || 0);
        
        // Se rascunho tem menos de 24 horas
        if (draftAge < 24 * 60 * 60 * 1000) {
          const shouldRecover = window.confirm(
            'Encontramos um rascunho salvo. Deseja recuperá-lo?'
          );
          
          if (shouldRecover && savedData) {
            setStationId(savedData.stationId || '');
            setPreventiveNumber(savedData.preventiveNumber || '');
            setDate(savedData.date || new Date().toISOString().split('T')[0]);
            setObservations(savedData.observations || '');
            
            // Recuperar itens do checklist
            if (savedData.checklistItems) {
              setChecklistItems(prev => 
                prev.map((item, index) => {
                  const saved = savedData.checklistItems[index];
                  return saved ? {
                    ...item,
                    status: saved.status || item.status,
                    value: saved.value || item.value,
                    correctiveAction: saved.correctiveAction || item.correctiveAction,
                    observations: saved.observations || item.observations
                  } : item;
                })
              );
            }
            
            toast.success('Rascunho recuperado!');
          } else {
            localStorage.removeItem('maintenance-draft');
          }
        } else {
          // Rascunho muito antigo, remover
          localStorage.removeItem('maintenance-draft');
        }
      } catch (error) {
        console.error('[Recovery] Erro ao recuperar rascunho:', error);
        localStorage.removeItem('maintenance-draft');
      }
    }
  }, []); // Executar apenas na montagem

  const updateChecklistItem = (index: number, field: keyof ChecklistItemData, value: any) => {
    setChecklistItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  const handlePhotoChange = (index: number, files: FileList | null) => {
    if (!files) return;
    const newPhotos = Array.from(files);
    updateChecklistItem(index, "photos", [...checklistItems[index].photos, ...newPhotos]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stationId || !preventiveNumber) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      toast.loading("Salvando manutenção...");

      // Criar manutenção
      const { maintenanceId } = await createMaintenanceMutation.mutateAsync({
        stationId: parseInt(stationId),
        preventiveNumber,
        date: new Date(date),
        observations,
      });

      // Criar itens do checklist
      for (const item of checklistItems) {
        const { itemId } = await createChecklistItemMutation.mutateAsync({
          maintenanceId,
          itemNumber: item.itemNumber,
          equipmentName: item.equipmentName,
          status: item.status,
          value: item.value,
          correctiveAction: item.correctiveAction,
          observations: item.observations,
        });

        // Upload de fotos
        for (const photo of item.photos) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result?.toString().split(",")[1];
            if (base64) {
              await uploadPhotoMutation.mutateAsync({
                checklistItemId: itemId,
                fileData: base64,
                fileName: photo.name,
              });
            }
          };
          reader.readAsDataURL(photo);
        }
      }

      // Limpar rascunho após salvar com sucesso
      localStorage.removeItem('maintenance-draft');
      
      toast.success("Manutenção salva com sucesso!");
      setLocation("/");
    } catch (error) {
      toast.error("Erro ao salvar manutenção");
      console.error(error);
    }
  };

  if (user?.role !== "tecnico" && user?.role !== "rr_admin" && user?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>Você não tem permissão para acessar esta página.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/">Voltar ao Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Nova Manutenção Preventiva</h1>
              <p className="text-sm text-muted-foreground">
                Preencha o checklist de 64 itens
                {lastSaved && (
                  <span className="ml-2 text-xs text-primary">
                    • Último salvamento: {lastSaved.toLocaleTimeString('pt-BR')}
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button onClick={handleSubmit} className="gap-2">
            <Save className="h-4 w-4" />
            Salvar Manutenção
          </Button>
        </div>
      </header>

      {/* Barra de Progresso Fixa */}
      <div className="sticky top-[73px] z-20 bg-card border-b border-border shadow-sm">
        <div className="container py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">
              Progresso do Checklist
            </span>
            <span className="text-sm font-medium text-primary">
              {filledItems} de {checklistItems.length} itens preenchidos ({Math.round(progress)}%)
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      <main className="container py-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="station">Posto *</Label>
                  <Select value={stationId} onValueChange={setStationId}>
                    <SelectTrigger id="station">
                      <SelectValue placeholder="Selecione o posto" />
                    </SelectTrigger>
                    <SelectContent>
                      {stations?.map((station) => (
                        <SelectItem key={station.id} value={station.id.toString()}>
                          {station.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preventiveNumber">Número da Preventiva *</Label>
                  <Input
                    id="preventiveNumber"
                    value={preventiveNumber}
                    onChange={(e) => setPreventiveNumber(e.target.value)}
                    placeholder="Ex: 01"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações Gerais</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observações sobre a manutenção..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Checklist de Equipamentos (64 itens)</CardTitle>
              <CardDescription>
                Verifique cada equipamento e adicione fotos quando necessário
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {checklistItems.map((item, index) => (
                <div key={item.itemNumber} className="border border-border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">
                      {item.itemNumber}. {item.equipmentName}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status *</Label>
                      <Select
                        value={item.status}
                        onValueChange={(value: any) => updateChecklistItem(index, "status", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="confere">Confere</SelectItem>
                          <SelectItem value="nao_conferido">Não Conferido</SelectItem>
                          <SelectItem value="realizar_limpeza">Realizar Limpeza</SelectItem>
                          <SelectItem value="realizar_reparo">Realizar Reparo</SelectItem>
                          <SelectItem value="realizar_troca">Realizar Troca</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Valor/Leitura</Label>
                      <Input
                        value={item.value}
                        onChange={(e) => updateChecklistItem(index, "value", e.target.value)}
                        placeholder="Ex: +20, -30, 114.567"
                      />
                    </div>
                  </div>

                  {item.status !== "confere" && item.status !== "nao_conferido" && (
                    <div className="space-y-2">
                      <Label>Ação Corretiva</Label>
                      <Textarea
                        value={item.correctiveAction}
                        onChange={(e) => updateChecklistItem(index, "correctiveAction", e.target.value)}
                        placeholder="Descreva a ação corretiva necessária..."
                        rows={2}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={item.observations}
                      onChange={(e) => updateChecklistItem(index, "observations", e.target.value)}
                      placeholder="Observações adicionais..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fotos</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`photo-${index}`)?.click()}
                        className="gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Adicionar Foto
                      </Button>
                      <input
                        id={`photo-${index}`}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => handlePhotoChange(index, e.target.files)}
                      />
                      {item.photos.length > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {item.photos.length} foto(s) selecionada(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/">Cancelar</Link>
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              Salvar Manutenção
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
