import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// Middleware para verificar se é admin ou rr_admin
const rrAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'rr_admin' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado. Apenas administradores RR podem acessar.' });
  }
  return next({ ctx });
});

// Middleware para verificar se é técnico, rr_admin ou admin
const technicanProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'tecnico' && ctx.user.role !== 'rr_admin' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado.' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  stations: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllStations();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getStationById(input.id);
      }),
  }),

  maintenances: router({
    create: technicanProcedure
      .input(z.object({
        stationId: z.number(),
        preventiveNumber: z.string(),
        date: z.date(),
        observations: z.string().optional(),
        technicianSignature: z.string().optional(),
        clientSignature: z.string().optional(),
        status: z.enum(["draft", "completed", "approved"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const maintenanceId = await db.createMaintenance({
          ...input,
          technicianId: ctx.user.id,
          status: input.status || "draft",
          technicianSignatureDate: input.technicianSignature ? new Date() : undefined,
          clientSignatureDate: input.clientSignature ? new Date() : undefined,
        });
        return { maintenanceId };
      }),

    listAll: protectedProcedure
      .query(async () => {
        return await db.getAllMaintenances();
      }),

    listByStation: protectedProcedure
      .input(z.object({ stationId: z.number() }))
      .query(async ({ input }) => {
        return await db.getMaintenancesByStation(input.stationId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const maintenance = await db.getMaintenanceById(input.id);
        if (!maintenance) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Manutenção não encontrada' });
        }
        const items = await db.getChecklistItemsByMaintenance(input.id);
        
        // Buscar fotos para cada item
        const itemsWithPhotos = await Promise.all(
          items.map(async (item) => {
            const photos = await db.getPhotosByChecklistItem(item.id);
            return { ...item, photos };
          })
        );

        return { ...maintenance, items: itemsWithPhotos };
      }),

    updateStatus: rrAdminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["draft", "completed", "approved"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateMaintenanceStatus(input.id, input.status);
        return { success: true };
      }),

    deleteWithPassword: protectedProcedure
      .input(z.object({ 
        id: z.number(),
        password: z.string()
      }))
      .mutation(async ({ input }) => {
        // Verificar senha
        if (input.password !== 'rrengenharia') {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Senha incorreta' });
        }

        // Deletar fotos, itens e manutenção
        const items = await db.getChecklistItemsByMaintenance(input.id);
        
        for (const item of items) {
          await db.deletePhotosByChecklistItem(item.id);
        }
        
        await db.deleteChecklistItemsByMaintenance(input.id);
        await db.deleteMaintenance(input.id);
        
        return { success: true };
      }),

    generatePDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        try {
          console.log('[PDF] Iniciando geração de PDF para manutenção:', input.id);
          
          const maintenance = await db.getMaintenanceById(input.id);
          if (!maintenance) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Manutenção não encontrada' });
          }
          console.log('[PDF] Manutenção encontrada:', maintenance.preventiveNumber);

          const items = await db.getChecklistItemsByMaintenance(input.id);
          console.log('[PDF] Itens do checklist:', items.length);
          
          const itemsWithPhotos = await Promise.all(
            items.map(async (item) => {
              const photos = await db.getPhotosByChecklistItem(item.id);
              return { ...item, photos };
            })
          );
          console.log('[PDF] Fotos carregadas');

          const station = await db.getStationById(maintenance.stationId);
          if (!station) {
            throw new TRPCError({ code: 'NOT_FOUND', message: 'Posto não encontrado' });
          }
          console.log('[PDF] Posto encontrado:', station.name);

          const { generateMaintenancePDF } = await import('./pdfGenerator');
          console.log('[PDF] Gerando documento PDF...');
          
          const pdfBuffer = await generateMaintenancePDF(
            { ...maintenance, items: itemsWithPhotos },
            station,
            ctx.user.name || 'Técnico'
          );
          console.log('[PDF] PDF gerado com sucesso. Tamanho:', pdfBuffer.length, 'bytes');

          // Upload PDF para S3
          const fileKey = `maintenance-reports/${maintenance.id}/${nanoid()}-relatorio.pdf`;
          console.log('[PDF] Fazendo upload para S3:', fileKey);
          
          const { url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');
          console.log('[PDF] Upload concluído:', url);

          return { url };
        } catch (error) {
          console.error('[PDF] Erro ao gerar PDF:', error);
          throw new TRPCError({ 
            code: 'INTERNAL_SERVER_ERROR', 
            message: `Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
          });
        }
      }),

    // Calcular Radar de Conformidade baseado em dados reais
    getConformityRadar: protectedProcedure
      .input(z.object({ stationId: z.number().optional() }))
      .query(async ({ input }) => {
        const maintenances = input.stationId 
          ? await db.getMaintenancesByStation(input.stationId)
          : await db.getAllMaintenances();
        
        if (!maintenances || maintenances.length === 0) {
          return [
            { subject: 'NR-20 Ambiental', value: 0, fullMark: 100 },
            { subject: 'NR-10 Elétrica', value: 0, fullMark: 100 },
            { subject: 'Documentação', value: 0, fullMark: 100 },
            { subject: 'Limpeza/5S', value: 0, fullMark: 100 },
            { subject: 'Metrologia', value: 0, fullMark: 100 },
          ];
        }

        // Buscar todos os itens de checklist das manutenções
        const allItems = [];
        for (const maintenance of maintenances) {
          const items = await db.getChecklistItemsByMaintenance(maintenance.id);
          allItems.push(...items);
        }

        if (allItems.length === 0) {
          return [
            { subject: 'NR-20 Ambiental', value: 0, fullMark: 100 },
            { subject: 'NR-10 Elétrica', value: 0, fullMark: 100 },
            { subject: 'Documentação', value: 0, fullMark: 100 },
            { subject: 'Limpeza/5S', value: 0, fullMark: 100 },
            { subject: 'Metrologia', value: 0, fullMark: 100 },
          ];
        }

        // Categorizar itens por tipo
        const categories = {
          ambiental: ['canaleta', 'caixa separadora', 'spill', 'sump', 'vazamento'],
          eletrica: ['sensor', 'painel', 'ihm', 'intertravamento', 'interrupção'],
          documentacao: ['veeder', 'sistema', 'encerrante'],
          limpeza: ['limpeza', 'limpar', 'sujeira'],
          metrologia: ['aferição', 'bico', 'calibração', 'manômetro', 'filtro'],
        };

        const conformityByCategory: Record<string, { total: number; conforme: number }> = {
          ambiental: { total: 0, conforme: 0 },
          eletrica: { total: 0, conforme: 0 },
          documentacao: { total: 0, conforme: 0 },
          limpeza: { total: 0, conforme: 0 },
          metrologia: { total: 0, conforme: 0 },
        };

        // Contar conformidades por categoria
        for (const item of allItems) {
          const equipName = item.equipmentName.toLowerCase();
          let categorized = false;

          for (const [category, keywords] of Object.entries(categories)) {
            if (keywords.some(keyword => equipName.includes(keyword))) {
              conformityByCategory[category].total++;
              if (item.status === 'confere') {
                conformityByCategory[category].conforme++;
              }
              categorized = true;
              break;
            }
          }

          // Se não foi categorizado, adicionar em metrologia (padrão)
          if (!categorized) {
            conformityByCategory.metrologia.total++;
            if (item.status === 'confere') {
              conformityByCategory.metrologia.conforme++;
            }
          }
        }

        // Calcular percentuais
        return [
          { 
            subject: 'NR-20 Ambiental', 
            value: conformityByCategory.ambiental.total > 0 
              ? Math.round((conformityByCategory.ambiental.conforme / conformityByCategory.ambiental.total) * 100)
              : 0,
            fullMark: 100 
          },
          { 
            subject: 'NR-10 Elétrica', 
            value: conformityByCategory.eletrica.total > 0
              ? Math.round((conformityByCategory.eletrica.conforme / conformityByCategory.eletrica.total) * 100)
              : 0,
            fullMark: 100 
          },
          { 
            subject: 'Documentação', 
            value: conformityByCategory.documentacao.total > 0
              ? Math.round((conformityByCategory.documentacao.conforme / conformityByCategory.documentacao.total) * 100)
              : 0,
            fullMark: 100 
          },
          { 
            subject: 'Limpeza/5S', 
            value: conformityByCategory.limpeza.total > 0
              ? Math.round((conformityByCategory.limpeza.conforme / conformityByCategory.limpeza.total) * 100)
              : 100, // Se não tem itens de limpeza, assume 100%
            fullMark: 100 
          },
          { 
            subject: 'Metrologia', 
            value: conformityByCategory.metrologia.total > 0
              ? Math.round((conformityByCategory.metrologia.conforme / conformityByCategory.metrologia.total) * 100)
              : 0,
            fullMark: 100 
          },
        ];
      }),

    // Extrair ações necessárias (QUESLog) dos itens
    getQuestLog: protectedProcedure
      .input(z.object({ stationId: z.number().optional() }))
      .query(async ({ input }) => {
        const maintenances = input.stationId 
          ? await db.getMaintenancesByStation(input.stationId)
          : await db.getAllMaintenances();
        
        if (!maintenances || maintenances.length === 0) {
          return [];
        }

        // Buscar todos os itens de checklist das manutenções
        const allItems = [];
        for (const maintenance of maintenances) {
          const items = await db.getChecklistItemsByMaintenance(maintenance.id);
          allItems.push(...items.map(item => ({ ...item, maintenanceId: maintenance.id })));
        }

        // Filtrar itens que precisam de ação
        const actionItems = allItems.filter(item => 
          item.status === 'realizar_reparo' || 
          item.status === 'realizar_troca' ||
          item.status === 'realizar_limpeza'
        );

        // Mapear para formato QUESLog
        return actionItems.map((item, index) => {
          let priority: 'critical' | 'high' | 'medium' = 'medium';
          let action = '';

          if (item.status === 'realizar_troca') {
            priority = 'critical';
            action = 'Troca';
          } else if (item.status === 'realizar_reparo') {
            priority = 'high';
            action = 'Reparo';
          } else if (item.status === 'realizar_limpeza') {
            priority = 'medium';
            action = 'Limpeza';
          }

          return {
            id: item.id,
            title: `${action}: ${item.equipmentName}`,
            priority,
            status: 'pending',
            observations: item.observations || '',
            maintenanceId: item.maintenanceId,
          };
        });
      }),
  }),

  checklistItems: router({
    create: technicanProcedure
      .input(z.object({
        maintenanceId: z.number(),
        itemNumber: z.number(),
        equipmentName: z.string(),
        status: z.enum(["confere", "nao_conferido", "realizar_limpeza", "realizar_reparo", "realizar_troca"]),
        value: z.string().optional(),
        correctiveAction: z.string().optional(),
        observations: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const itemId = await db.createChecklistItem(input);
        return { itemId };
      }),

    listByMaintenance: protectedProcedure
      .input(z.object({ maintenanceId: z.number() }))
      .query(async ({ input }) => {
        return await db.getChecklistItemsByMaintenance(input.maintenanceId);
      }),
  }),

  photos: router({
    upload: technicanProcedure
      .input(z.object({
        checklistItemId: z.number(),
        fileData: z.string(), // base64
        fileName: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Converter base64 para buffer
        const buffer = Buffer.from(input.fileData, 'base64');
        
        // Gerar key único para S3
        const fileKey = `maintenance-photos/${input.checklistItemId}/${nanoid()}-${input.fileName}`;
        
        // Upload para S3
        const { url } = await storagePut(fileKey, buffer, 'image/jpeg');
        
        // Salvar no banco
        const photoId = await db.createPhoto({
          checklistItemId: input.checklistItemId,
          fileKey,
          url,
          description: input.description,
        });

        return { photoId, url };
      }),

    listByChecklistItem: protectedProcedure
      .input(z.object({ checklistItemId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPhotosByChecklistItem(input.checklistItemId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
