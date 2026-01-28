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
      }))
      .mutation(async ({ input, ctx }) => {
        const maintenanceId = await db.createMaintenance({
          ...input,
          technicianId: ctx.user.id,
          status: "draft",
        });
        return { maintenanceId };
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

    generatePDF: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const maintenance = await db.getMaintenanceById(input.id);
        if (!maintenance) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Manutenção não encontrada' });
        }

        const items = await db.getChecklistItemsByMaintenance(input.id);
        const itemsWithPhotos = await Promise.all(
          items.map(async (item) => {
            const photos = await db.getPhotosByChecklistItem(item.id);
            return { ...item, photos };
          })
        );

        const station = await db.getStationById(maintenance.stationId);
        if (!station) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Posto não encontrado' });
        }

        const { generateMaintenancePDF } = await import('./pdfGenerator');
        const pdfBuffer = await generateMaintenancePDF(
          { ...maintenance, items: itemsWithPhotos },
          station,
          ctx.user.name || 'Técnico'
        );

        // Upload PDF para S3
        const fileKey = `maintenance-reports/${maintenance.id}/${nanoid()}-relatorio.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, 'application/pdf');

        return { url };
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
