import { drizzle } from 'drizzle-orm/mysql2';
import { maintenances, checklistItems } from './drizzle/schema.js';

const db = drizzle(process.env.DATABASE_URL);

// Mapeamento de status do Word para o banco
const statusMap = {
  'Conforme': 'confere',
  'Não Conforme': 'realizar_reparo',
  'Crítico': 'realizar_troca',
  'Monitorar': 'nao_conferido',
  'Não possui': 'nao_conferido'
};

// Dados Padre Miguel
const padreMiguelItems = [
  { num: 1, equip: 'Aferição Bico 1', status: 'Conforme', obs: 'Dentro da tolerância' },
  { num: 2, equip: 'Aferição Bico 2', status: 'Conforme', obs: 'Dentro da tolerância' },
  { num: 3, equip: 'Aferição Bico 5', status: 'Crítico', obs: 'Troca de bloco medidor' },
  { num: 4, equip: 'Aferição Bico 4', status: 'Conforme', obs: 'Dentro da tolerância' },
  { num: 5, equip: 'Aferição Bico 3 Arla', status: 'Não Conforme', obs: 'Fora da tolerância' },
  { num: 6, equip: 'Encerrante Bico 1', status: 'Conforme', obs: 'Operacional' },
  { num: 7, equip: 'Encerrante Bico 2', status: 'Conforme', obs: 'Operacional' },
  { num: 8, equip: 'Encerrante Bico 5', status: 'Conforme', obs: 'Operacional' },
  { num: 9, equip: 'Encerrante Bico 4', status: 'Conforme', obs: 'Operacional' },
  { num: 10, equip: 'Encerrante Bico Arla', status: 'Monitorar', obs: 'Sem leitura confirmada' },
  { num: 11, equip: 'Bomba Submersa Dispenser 1', status: 'Conforme', obs: 'Operacional' },
  { num: 12, equip: 'Bomba Submersa Dispenser 2', status: 'Conforme', obs: 'Operacional' },
  { num: 13, equip: 'Bomba Submersa Dispenser 3', status: 'Conforme', obs: 'Operacional' },
  { num: 14, equip: 'Bomba Submersa Arla', status: 'Conforme', obs: 'Operacional' },
  { num: 15, equip: 'Canaletas / Spill', status: 'Conforme', obs: 'Sem acúmulo' },
  { num: 16, equip: 'Caixa separadora estacionamento', status: 'Não possui', obs: 'Estrutural' },
  { num: 17, equip: 'Caixa separadora pista', status: 'Não Conforme', obs: 'Necessita limpeza' },
  { num: 18, equip: 'Dispenser 1', status: 'Conforme', obs: 'Operacional' },
  { num: 19, equip: 'Dispenser 1 Bico 1 Diesel', status: 'Conforme', obs: 'Operacional' },
  { num: 20, equip: 'Dispenser 1 Bico 2 Diesel', status: 'Conforme', obs: 'Pulser ajustado' },
  { num: 21, equip: 'Dispenser 2 Arla Bico 3', status: 'Conforme', obs: 'Operacional' },
  { num: 22, equip: 'Dispenser 3', status: 'Conforme', obs: 'Operacional' },
  { num: 23, equip: 'Dispenser 3 Bico 4 Gasolina', status: 'Conforme', obs: 'Operacional' },
  { num: 24, equip: 'Dispenser 3 Bico 5 Gasolina', status: 'Crítico', obs: 'Reparo + lacre' },
  { num: 25, equip: 'Elemento filtrante Diesel', status: 'Não Conforme', obs: 'Troca recomendada' },
  { num: 26, equip: 'Mangueira Bico 1 Diesel', status: 'Conforme', obs: 'Sem vazamentos' },
  { num: 27, equip: 'Mangueira Bico 2 Diesel', status: 'Conforme', obs: 'Sem vazamentos' },
  { num: 28, equip: 'Mangueira Bico 3 Arla', status: 'Conforme', obs: 'Sem vazamentos' },
  { num: 29, equip: 'Mangueira Bico 4 Gasolina', status: 'Conforme', obs: 'Sem vazamentos' },
  { num: 30, equip: 'Mangueira Bico 5 Gasolina', status: 'Conforme', obs: 'Sem vazamentos' },
  { num: 31, equip: 'Manômetro filtro Diesel', status: 'Não Conforme', obs: 'Troca recomendada' },
  { num: 32, equip: 'Painel comando – IHM', status: 'Conforme', obs: 'Operacional' },
  { num: 33, equip: 'Sensor intertravamento Tanque 1', status: 'Conforme', obs: 'Operacional' },
  { num: 34, equip: 'Sensor intertravamento Tanque 2 e 3', status: 'Conforme', obs: 'Operacional' },
  { num: 35, equip: 'Sensor interrupção sistema', status: 'Conforme', obs: 'Operacional' },
  { num: 36, equip: 'Sensor sump Caixa Transição 1', status: 'Conforme', obs: 'Operacional' },
  { num: 37, equip: 'Sensor sump Caixa Transição 2', status: 'Conforme', obs: 'Operacional' },
  { num: 38, equip: 'Sensor sump Dispenser 1', status: 'Conforme', obs: 'Operacional' },
  { num: 39, equip: 'Sensor sump Dispenser 2', status: 'Conforme', obs: 'Operacional' },
  { num: 40, equip: 'Sensor sump Dispenser Arla', status: 'Conforme', obs: 'Operacional' },
  { num: 41, equip: 'Sensor sump Tanque 1', status: 'Conforme', obs: 'Operacional' },
  { num: 42, equip: 'Sensor sump Tanque 2', status: 'Conforme', obs: 'Operacional' },
  { num: 43, equip: 'Sensor sump Tanque 3', status: 'Conforme', obs: 'Operacional' },
  { num: 44, equip: 'Spill abastecimento Tanque 1', status: 'Conforme', obs: 'Vedação ok' },
  { num: 45, equip: 'Spill abastecimento Tanque 2', status: 'Conforme', obs: 'Vedação ok' },
  { num: 46, equip: 'Spill abastecimento Tanque 3', status: 'Conforme', obs: 'Vedação ok' },
  { num: 47, equip: 'Spill medição Tanque 1', status: 'Conforme', obs: 'Vedação ok' },
  { num: 48, equip: 'Spill medição Tanque 2', status: 'Conforme', obs: 'Vedação ok' },
  { num: 49, equip: 'Spill medição Tanque 3', status: 'Conforme', obs: 'Vedação ok' },
  { num: 50, equip: 'Sump Caixa Transição 1', status: 'Conforme', obs: 'Operacional' },
  { num: 51, equip: 'Sump Caixa Transição 2', status: 'Crítico', obs: 'Vazamento' },
  { num: 52, equip: 'Sump Dispenser Diesel', status: 'Crítico', obs: 'Reinstalação condulete' },
  { num: 53, equip: 'Sump Dispenser Arla', status: 'Crítico', obs: 'Reinstalação condulete' },
  { num: 54, equip: 'Sump Dispenser Gasolina', status: 'Crítico', obs: 'Reinstalação condulete' },
  { num: 55, equip: 'Sump Tanque 1', status: 'Crítico', obs: 'Vedação comprometida' },
  { num: 56, equip: 'Sump Tanque 2', status: 'Crítico', obs: 'Vedação comprometida' },
  { num: 57, equip: 'Sump Tanque 3', status: 'Crítico', obs: 'Vedação comprometida' },
  { num: 58, equip: 'Swivel Bico 1', status: 'Conforme', obs: 'Operacional' },
  { num: 59, equip: 'Swivel Bico 2', status: 'Conforme', obs: 'Operacional' },
  { num: 60, equip: 'Swivel Bico 3 Arla', status: 'Conforme', obs: 'Operacional' },
  { num: 61, equip: 'Swivel Bico 4', status: 'Conforme', obs: 'Operacional' },
  { num: 62, equip: 'Swivel Bico 5', status: 'Conforme', obs: 'Operacional' },
  { num: 63, equip: 'Boca descarga à distância', status: 'Não Conforme', obs: 'Falta identificação' },
  { num: 64, equip: 'Sistema Veeder-Root', status: 'Conforme', obs: 'Sistema ativo' }
];

// Dados Paciência (61 itens)
const pacienciaItems = [
  { num: 1, equip: 'Aferição Bico 1', status: 'Conforme', obs: 'Dentro da tolerância' },
  { num: 2, equip: 'Aferição Bico 2', status: 'Conforme', obs: 'Dentro da tolerância' },
  { num: 3, equip: 'Aferição Bico 3', status: 'Conforme', obs: 'Dentro da tolerância' },
  { num: 4, equip: 'Aferição Bico 4', status: 'Conforme', obs: 'Dentro da tolerância' },
  { num: 5, equip: 'Aferição Bico Arla', status: 'Conforme', obs: 'Dentro da tolerância' },
  { num: 6, equip: 'Encerrante Bico 1', status: 'Monitorar', obs: 'Dentro da tolerância' },
  { num: 7, equip: 'Encerrante Bico 2', status: 'Monitorar', obs: 'Dentro da tolerância' },
  { num: 8, equip: 'Encerrante Bico 3', status: 'Monitorar', obs: 'Dentro da tolerância' },
  { num: 9, equip: 'Encerrante Bico 4', status: 'Monitorar', obs: 'Dentro da tolerância' },
  { num: 10, equip: 'Encerrante Bico Arla', status: 'Monitorar', obs: 'Dentro da tolerância' },
  { num: 11, equip: 'Bomba Submersa Dispenser 1', status: 'Conforme', obs: 'Operacional' },
  { num: 12, equip: 'Bomba Submersa Dispenser 2', status: 'Conforme', obs: 'Operacional' },
  { num: 13, equip: 'Bomba Submersa Arla', status: 'Conforme', obs: 'Operacional' },
  { num: 14, equip: 'Canaleta dos tanques / Spill', status: 'Não Conforme', obs: 'Necessita limpeza' },
  { num: 15, equip: 'Caixa separadora estacionamento', status: 'Conforme', obs: 'Operacional' },
  { num: 16, equip: 'Caixa separadora pista', status: 'Não Conforme', obs: 'Necessita limpeza' },
  { num: 17, equip: 'Dispenser 1', status: 'Conforme', obs: 'Operacional' },
  { num: 18, equip: 'Dispenser 1 – Bico 1', status: 'Conforme', obs: 'Operacional' },
  { num: 19, equip: 'Dispenser 1 – Bico 2', status: 'Conforme', obs: 'Operacional' },
  { num: 20, equip: 'Dispenser 2', status: 'Conforme', obs: 'Operacional' },
  { num: 21, equip: 'Dispenser 2 – Bico 3', status: 'Conforme', obs: 'Operacional' },
  { num: 22, equip: 'Dispenser 2 – Bico 4', status: 'Conforme', obs: 'Operacional' },
  { num: 23, equip: 'Dispenser 3', status: 'Não Conforme', obs: 'Necessita limpeza' },
  { num: 24, equip: 'Dispenser Arla', status: 'Conforme', obs: 'Operacional' },
  { num: 25, equip: 'Elemento filtrante Diesel', status: 'Não Conforme', obs: 'Troca recomendada' },
  { num: 26, equip: 'Mangueira Arla', status: 'Conforme', obs: 'Sem vazamentos' },
  { num: 27, equip: 'Mangueira Bico 1', status: 'Conforme', obs: 'Troca recomendada' },
  { num: 28, equip: 'Mangueira Bico 2', status: 'Conforme', obs: 'Troca recomendada' },
  { num: 29, equip: 'Mangueira Bico 3', status: 'Conforme', obs: 'Troca recomendada' },
  { num: 30, equip: 'Mangueira Bico 4', status: 'Conforme', obs: 'Troca recomendada' },
  { num: 31, equip: 'Manômetro filtro Diesel', status: 'Não Conforme', obs: 'Troca recomendada' },
  { num: 32, equip: 'Painel de comando – IHM', status: 'Conforme', obs: 'Operacional' },
  { num: 33, equip: 'Sensor intertravamento Tanque 1', status: 'Conforme', obs: 'Operacional' },
  { num: 34, equip: 'Sensor intertravamento Tanque 2', status: 'Conforme', obs: 'Operacional' },
  { num: 35, equip: 'Sensor interrupção sistema', status: 'Conforme', obs: 'Operacional' },
  { num: 36, equip: 'Sensor sump Caixa Transição 1', status: 'Conforme', obs: 'Operacional' },
  { num: 37, equip: 'Sensor sump Caixa Transição 2', status: 'Conforme', obs: 'Operacional' },
  { num: 38, equip: 'Sensor sump Caixa Transição 3', status: 'Conforme', obs: 'Operacional' },
  { num: 39, equip: 'Sensor sump Dispenser 1', status: 'Conforme', obs: 'Operacional' },
  { num: 40, equip: 'Sensor sump Dispenser 2', status: 'Conforme', obs: 'Operacional' },
  { num: 41, equip: 'Sensor sump Dispenser Arla', status: 'Conforme', obs: 'Operacional' },
  { num: 42, equip: 'Sensor sump Tanque 1', status: 'Conforme', obs: 'Operacional' },
  { num: 43, equip: 'Sensor sump Tanque 2', status: 'Conforme', obs: 'Operacional' },
  { num: 44, equip: 'Spill container abastecimento T1', status: 'Conforme', obs: 'Troca Vedação recomendada' },
  { num: 45, equip: 'Spill container abastecimento T2', status: 'Conforme', obs: 'Troca Vedação recomendada' },
  { num: 46, equip: 'Spill container medição T1', status: 'Conforme', obs: 'Troca Vedação recomendada' },
  { num: 47, equip: 'Spill container medição T2', status: 'Conforme', obs: 'Troca Vedação recomendada' },
  { num: 48, equip: 'Sump Caixa Transição 1', status: 'Conforme', obs: 'Operacional' },
  { num: 49, equip: 'Sump Caixa Transição 2', status: 'Conforme', obs: 'Operacional' },
  { num: 50, equip: 'Sump Caixa Transição 3', status: 'Conforme', obs: 'Operacional' },
  { num: 51, equip: 'Sump Dispenser 1', status: 'Conforme', obs: 'Operacional' },
  { num: 52, equip: 'Sump Dispenser 2', status: 'Conforme', obs: 'Operacional' },
  { num: 53, equip: 'Sump Dispenser 3', status: 'Conforme', obs: 'Operacional' },
  { num: 54, equip: 'Sump Tanque 1', status: 'Conforme', obs: 'Operacional' },
  { num: 55, equip: 'Sump Tanque 2', status: 'Conforme', obs: 'Operacional' },
  { num: 56, equip: 'Swivel Bico 1', status: 'Conforme', obs: 'Operacional' },
  { num: 57, equip: 'Swivel Bico 2', status: 'Conforme', obs: 'Operacional' },
  { num: 58, equip: 'Swivel Bico 3', status: 'Conforme', obs: 'Operacional' },
  { num: 59, equip: 'Swivel Bico 4', status: 'Conforme', obs: 'Operacional' },
  { num: 60, equip: 'Swivel Bico Arla', status: 'Conforme', obs: 'Operacional' },
  { num: 61, equip: 'Sistema Veeder-Root', status: 'Conforme', obs: 'Sistema ativo' }
];

async function importReports() {
  try {
    console.log('🚀 Iniciando importação dos relatórios...');
    
    // Criar manutenção Padre Miguel
    const [padreMiguel] = await db.insert(maintenances).values({
      stationId: 1, // Padre Miguel
      technicianId: 1, // Assumindo técnico ID 1
      preventiveNumber: 'PM-001',
      date: new Date('2026-01-28'),
      status: 'completed',
      observations: 'Diagnóstico Inicial – Assunção de Contrato. Presença de múltiplas não conformidades estruturais. Histórico de vazamentos em sumps.',
      technicianSignature: 'Técnico RR Engenharia',
      technicianSignatureDate: new Date('2026-01-28'),
      clientSignature: 'Márcio Franco',
      clientSignatureDate: new Date('2026-01-28')
    });
    
    console.log(`✅ Manutenção Padre Miguel criada (ID: ${padreMiguel.insertId})`);
    
    // Inserir itens Padre Miguel
    for (const item of padreMiguelItems) {
      await db.insert(checklistItems).values({
        maintenanceId: padreMiguel.insertId,
        itemNumber: item.num,
        equipmentName: item.equip,
        status: statusMap[item.status] || 'confere',
        observations: item.obs
      });
    }
    
    console.log(`✅ ${padreMiguelItems.length} itens Padre Miguel inseridos`);
    
    // Criar manutenção Paciência
    const [paciencia] = await db.insert(maintenances).values({
      stationId: 2, // Paciência
      technicianId: 1,
      preventiveNumber: 'PC-001',
      date: new Date('2026-01-28'),
      status: 'completed',
      observations: 'Diagnóstico Inicial – Assunção de Contrato. Sistemas operacionais, porém, com pendências recorrentes. Não conformidades associadas principalmente a limpeza, troca de componentes.',
      technicianSignature: 'Técnico RR Engenharia',
      technicianSignatureDate: new Date('2026-01-28'),
      clientSignature: 'Márcio Franco',
      clientSignatureDate: new Date('2026-01-28')
    });
    
    console.log(`✅ Manutenção Paciência criada (ID: ${paciencia.insertId})`);
    
    // Inserir itens Paciência
    for (const item of pacienciaItems) {
      await db.insert(checklistItems).values({
        maintenanceId: paciencia.insertId,
        itemNumber: item.num,
        equipmentName: item.equip,
        status: statusMap[item.status] || 'confere',
        observations: item.obs
      });
    }
    
    console.log(`✅ ${pacienciaItems.length} itens Paciência inseridos`);
    console.log('🎉 Importação concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    process.exit(1);
  }
}

importReports();
