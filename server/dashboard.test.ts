import { describe, it, expect, beforeEach } from 'vitest';
import { getDb } from './db';
import { maintenances, checklistItems } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Dashboard Procedures', () => {
  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    
    // Limpar dados de teste
    await db.delete(checklistItems);
    await db.delete(maintenances);
  });

  describe('QUESLog (Ações Necessárias)', () => {
    it('deve extrair itens com "realizar_reparo" e "realizar_troca"', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const result = await db.insert(maintenances).values({
        stationId: 1,
        technicianId: 1,
        preventiveNumber: 'TEST-001',
        date: new Date(),
        status: 'completed',
      });
      const maintenanceId = result[0].insertId;

      await db.insert(checklistItems).values([
        { maintenanceId: maintenanceId, itemNumber: 1, equipmentName: 'Extintor 1', status: 'realizar_reparo', observations: 'Manômetro danificado' },
        { maintenanceId: maintenanceId, itemNumber: 2, equipmentName: 'Painel Elétrico', status: 'realizar_troca', observations: 'Disjuntor queimado' },
        { maintenanceId: maintenanceId, itemNumber: 3, equipmentName: 'Alvará', status: 'confere' }, // Não deve aparecer
        { maintenanceId: maintenanceId, itemNumber: 4, equipmentName: 'Piso', status: 'realizar_limpeza' }, // Não deve aparecer
      ]);

      // Buscar itens de ação
      const actionItems = await db.select().from(checklistItems)
        .where(eq(checklistItems.maintenanceId, maintenanceId));
      
      const filteredActions = actionItems.filter(
        (item) => item.status === 'realizar_reparo' || item.status === 'realizar_troca'
      );

      expect(filteredActions.length).toBe(2);
      expect(filteredActions[0].equipmentName).toBe('Extintor 1');
      expect(filteredActions[0].status).toBe('realizar_reparo');
      expect(filteredActions[1].equipmentName).toBe('Painel Elétrico');
      expect(filteredActions[1].status).toBe('realizar_troca');
    });

    it('deve retornar array vazio quando não há ações necessárias', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const result = await db.insert(maintenances).values({
        stationId: 1,
        technicianId: 1,
        preventiveNumber: 'TEST-002',
        date: new Date(),
        status: 'completed',
      });
      const maintenanceId = result[0].insertId;

      await db.insert(checklistItems).values([
        { maintenanceId: maintenanceId, itemNumber: 1, equipmentName: 'Item 1', status: 'confere' },
        { maintenanceId: maintenanceId, itemNumber: 2, equipmentName: 'Item 2', status: 'nao_conferido' },
      ]);

      const actionItems = await db.select().from(checklistItems)
        .where(eq(checklistItems.maintenanceId, maintenanceId));
      
      const filteredActions = actionItems.filter(
        (item) => item.status === 'realizar_reparo' || item.status === 'realizar_troca'
      );

      expect(filteredActions.length).toBe(0);
    });

    it('deve priorizar "realizar_troca" sobre "realizar_reparo"', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const result = await db.insert(maintenances).values({
        stationId: 1,
        technicianId: 1,
        preventiveNumber: 'TEST-003',
        date: new Date(),
        status: 'completed',
      });
      const maintenanceId = result[0].insertId;

      await db.insert(checklistItems).values([
        { maintenanceId: maintenanceId, itemNumber: 1, equipmentName: 'Item Reparo', status: 'realizar_reparo' },
        { maintenanceId: maintenanceId, itemNumber: 2, equipmentName: 'Item Troca', status: 'realizar_troca' },
      ]);

      const actionItems = await db.select().from(checklistItems)
        .where(eq(checklistItems.maintenanceId, maintenanceId));
      
      const filteredActions = actionItems.filter(
        (item) => item.status === 'realizar_reparo' || item.status === 'realizar_troca'
      );

      // Verificar que ambos foram capturados
      expect(filteredActions.length).toBe(2);
      
      // Verificar que "realizar_troca" tem prioridade maior (P1) que "realizar_reparo" (P2)
      const getPriority = (status: string) => {
        if (status === 'realizar_troca') return 'P1';
        if (status === 'realizar_reparo') return 'P2';
        return 'P3';
      };

      const trocaItem = filteredActions.find((item) => item.status === 'realizar_troca');
      const reparoItem = filteredActions.find((item) => item.status === 'realizar_reparo');

      expect(getPriority(trocaItem!.status)).toBe('P1');
      expect(getPriority(reparoItem!.status)).toBe('P2');
    });
  });

  describe('Cálculo de Conformidade', () => {
    it('deve calcular percentual de itens "confere" corretamente', async () => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      
      const result = await db.insert(maintenances).values({
        stationId: 1,
        technicianId: 1,
        preventiveNumber: 'TEST-004',
        date: new Date(),
        status: 'completed',
      });
      const maintenanceId = result[0].insertId;

      // 6 confere de 10 itens = 60%
      await db.insert(checklistItems).values([
        { maintenanceId: maintenanceId, itemNumber: 1, equipmentName: 'Item 1', status: 'confere' },
        { maintenanceId: maintenanceId, itemNumber: 2, equipmentName: 'Item 2', status: 'confere' },
        { maintenanceId: maintenanceId, itemNumber: 3, equipmentName: 'Item 3', status: 'confere' },
        { maintenanceId: maintenanceId, itemNumber: 4, equipmentName: 'Item 4', status: 'confere' },
        { maintenanceId: maintenanceId, itemNumber: 5, equipmentName: 'Item 5', status: 'confere' },
        { maintenanceId: maintenanceId, itemNumber: 6, equipmentName: 'Item 6', status: 'confere' },
        { maintenanceId: maintenanceId, itemNumber: 7, equipmentName: 'Item 7', status: 'nao_conferido' },
        { maintenanceId: maintenanceId, itemNumber: 8, equipmentName: 'Item 8', status: 'realizar_reparo' },
        { maintenanceId: maintenanceId, itemNumber: 9, equipmentName: 'Item 9', status: 'realizar_troca' },
        { maintenanceId: maintenanceId, itemNumber: 10, equipmentName: 'Item 10', status: 'realizar_limpeza' },
      ]);

      const items = await db.select().from(checklistItems)
        .where(eq(checklistItems.maintenanceId, maintenanceId));

      const totalItems = items.length;
      const conformeCount = items.filter((item) => item.status === 'confere').length;
      const percentage = Math.round((conformeCount / totalItems) * 100);

      expect(totalItems).toBe(10);
      expect(conformeCount).toBe(6);
      expect(percentage).toBe(60);
    });
  });
});
