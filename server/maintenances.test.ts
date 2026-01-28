import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(role: "tecnico" | "rr_admin" | "guanabara" | "admin" = "tecnico"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Stations Router", () => {
  it("should list all stations", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const stations = await caller.stations.list();

    expect(stations).toBeDefined();
    expect(Array.isArray(stations)).toBe(true);
  });

  it("should get station by id", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const station = await caller.stations.getById({ id: 1 });

    expect(station).toBeDefined();
    if (station) {
      expect(station.id).toBe(1);
      expect(station.name).toBeDefined();
    }
  });
});

describe("Maintenances Router - Permissions", () => {
  it("should allow tecnico to create maintenance", async () => {
    const ctx = createTestContext("tecnico");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.maintenances.create({
      stationId: 1,
      preventiveNumber: "TEST-001",
      date: new Date(),
      observations: "Test maintenance",
    });

    expect(result).toBeDefined();
    expect(result.maintenanceId).toBeDefined();
  });

  it("should allow rr_admin to create maintenance", async () => {
    const ctx = createTestContext("rr_admin");
    const caller = appRouter.createCaller(ctx);

    const result = await caller.maintenances.create({
      stationId: 1,
      preventiveNumber: "TEST-002",
      date: new Date(),
      observations: "Test maintenance by admin",
    });

    expect(result).toBeDefined();
    expect(result.maintenanceId).toBeDefined();
  });

  it("should deny guanabara from creating maintenance", async () => {
    const ctx = createTestContext("guanabara");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.maintenances.create({
        stationId: 1,
        preventiveNumber: "TEST-003",
        date: new Date(),
      })
    ).rejects.toThrow();
  });

  it("should allow rr_admin to update status", async () => {
    const ctx = createTestContext("rr_admin");
    const caller = appRouter.createCaller(ctx);

    // Primeiro criar uma manutenção
    const { maintenanceId } = await caller.maintenances.create({
      stationId: 1,
      preventiveNumber: "TEST-STATUS",
      date: new Date(),
    });

    // Depois atualizar o status
    const result = await caller.maintenances.updateStatus({
      id: maintenanceId,
      status: "completed",
    });

    expect(result.success).toBe(true);
  });

  it("should deny tecnico from updating status", async () => {
    const ctx = createTestContext("tecnico");
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.maintenances.updateStatus({
        id: 1,
        status: "completed",
      })
    ).rejects.toThrow();
  });
});

describe("Checklist Items Router", () => {
  it("should allow tecnico to create checklist item", async () => {
    const ctx = createTestContext("tecnico");
    const caller = appRouter.createCaller(ctx);

    // Primeiro criar uma manutenção
    const { maintenanceId } = await caller.maintenances.create({
      stationId: 1,
      preventiveNumber: "TEST-CHECKLIST",
      date: new Date(),
    });

    // Depois criar um item do checklist
    const result = await caller.checklistItems.create({
      maintenanceId,
      itemNumber: 1,
      equipmentName: "Test Equipment",
      status: "confere",
      value: "OK",
    });

    expect(result).toBeDefined();
    expect(result.itemId).toBeDefined();
  });

  it("should list checklist items by maintenance", async () => {
    const ctx = createTestContext("tecnico");
    const caller = appRouter.createCaller(ctx);

    // Criar manutenção e item
    const { maintenanceId } = await caller.maintenances.create({
      stationId: 1,
      preventiveNumber: "TEST-LIST",
      date: new Date(),
    });

    await caller.checklistItems.create({
      maintenanceId,
      itemNumber: 1,
      equipmentName: "Test Equipment",
      status: "confere",
    });

    // Listar itens
    const items = await caller.checklistItems.listByMaintenance({ maintenanceId });

    expect(items).toBeDefined();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThan(0);
  });
});

describe("Auth Router", () => {
  it("should return current user", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toBeDefined();
    expect(user?.id).toBe(1);
    expect(user?.name).toBe("Test User");
  });

  it("should logout successfully", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
  });
});
