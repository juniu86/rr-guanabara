import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { Building2, ClipboardList, FileText, Plus, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Link } from "wouter";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { getLoginUrl } from "@/const";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: stations } = trpc.stations.list.useQuery();
  const { data: allMaintenances } = trpc.maintenances.listAll.useQuery();

  if (!loading && !isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  const totalMaintenances = allMaintenances?.length || 0;
  const completedMaintenances = allMaintenances?.filter((m: any) => m.status === 'completed' || m.status === 'approved').length || 0;
  
  const lastMaintenance = allMaintenances && allMaintenances.length > 0
    ? allMaintenances.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;
  
  const daysSinceLastMaintenance = lastMaintenance
    ? Math.floor((Date.now() - new Date(lastMaintenance.date).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const unitHealth = totalMaintenances > 0 
    ? Math.round((completedMaintenances / totalMaintenances) * 100)
    : 75;

  const conformityData = [
    { subject: 'NR-20 Ambiental', value: 85, fullMark: 100 },
    { subject: 'NR-10 Elétrica', value: 90, fullMark: 100 },
    { subject: 'Documentação', value: 75, fullMark: 100 },
    { subject: 'Limpeza/5S', value: 80, fullMark: 100 },
    { subject: 'Metrologia', value: 95, fullMark: 100 },
  ];

  const questLog = [
    { id: 1, title: 'Limpeza Caixa SAO', priority: 'critical', status: 'pending', reward: '+500 XP' },
    { id: 2, title: 'Calibração Bicos', priority: 'high', status: 'pending', reward: '+300 XP' },
    { id: 3, title: 'Troca Filtros Diesel', priority: 'high', status: 'pending', reward: '+150 XP' },
    { id: 4, title: 'Reapertar Elétrico', priority: 'medium', status: 'completed', reward: '+100 XP' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-green-500/10 text-green-500 border-green-500/20';
    }
  };

  const getSLAColor = (days: number) => {
    if (days <= 20) return 'bg-green-500';
    if (days <= 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container flex items-center justify-between py-4">
          <div>
            <h1 className="text-2xl font-bold text-primary">RR Engenharia</h1>
            <p className="text-sm text-muted-foreground">Sua Parceira em Obras e Instalações</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button asChild>
              <Link href="/nova-manutencao">
                <Plus className="h-4 w-4 mr-2" />
                Nova Manutenção
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-bold">MISSION REPORT: CASAS GUANABARA</h2>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">RR ENGENHARIA</p>
              <p className="text-sm font-semibold">{new Date().toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase()}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">STATUS DA UNIDADE</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-red-500/20"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - unitHealth / 100)}`}
                      className="text-primary transition-all duration-1000"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{unitHealth}%</span>
                    <span className="text-xs text-muted-foreground">UNIT HEALTH</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-6 w-full justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="text-xs text-muted-foreground">Saúde Operacional</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                    <span className="text-xs text-muted-foreground">Dano (Risco)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">RADAR DE CONFORMIDADE</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={conformityData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis 
                    dataKey="subject" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                  <Radar 
                    name="Conformidade" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6} 
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">SLA TIMER (Tempo de Visita)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 py-2">
                <div className="flex items-center justify-center">
                  <div className={`${getSLAColor(daysSinceLastMaintenance)} text-white px-6 py-3 rounded-lg text-center`}>
                    <div className="text-3xl font-bold">{daysSinceLastMaintenance} DIAS</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground px-2">
                  <span>0 dias</span>
                  <span>40 dias (MÁX)</span>
                </div>
                <Progress 
                  value={(daysSinceLastMaintenance / 40) * 100} 
                  className="h-2"
                />
                <p className="text-xs text-center text-muted-foreground">
                  {daysSinceLastMaintenance <= 30 ? '✅ Dentro do prazo' : '⚠️ Atenção: Próximo da data limite'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>QUESLog (Ações Necessárias)</CardTitle>
            </div>
            <CardDescription>
              Tarefas pendentes e concluídas nas manutenções preventivas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {questLog.map((quest) => (
                <div
                  key={quest.id}
                  className={`p-4 rounded-lg border-2 ${getPriorityColor(quest.priority)} ${
                    quest.status === 'completed' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm">{quest.title}</h3>
                    {quest.status === 'completed' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">Reward: {quest.reward}</span>
                      <Badge variant={quest.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                        {quest.status === 'completed' ? 'CONCLUÍDO' : 'PENDENTE'}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Postos Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{stations?.length || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Padre Miguel e Paciência</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Equipamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">64</div>
              <p className="text-sm text-muted-foreground mt-1">Itens de verificação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Relatórios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary">{totalMaintenances}</div>
              <p className="text-sm text-muted-foreground mt-1">Manutenções realizadas</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stations?.map((station) => (
            <Card key={station.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{station.name}</CardTitle>
                      <CardDescription className="mt-1">{station.address}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full" variant="outline">
                  <Link href={`/posto/${station.id}`}>Ver Manutenções</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
