import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { validate } from "../middleware/validate.js";
import {
  dayQuerySchema,
  gridQuerySchema,
  memberGridQuerySchema,
  recomputeBodySchema,
  searchBodySchema,
  slotQuerySchema,
  idParamSchema,
} from "../validators/availability.schema.js";
import { periodRepo } from "../repositories/period.repo.js";
import { memberRepo } from "../repositories/member.repo.js";
import { activityRepo } from "../repositories/activity.repo.js";
import { serializeBand } from "../lib/serialize.js";
import { availabilityRepo } from "../repositories/availability.repo.js";
import { availabilityService, isFree, isNegotiable } from "../services/availability.service.js";
import { matrixService } from "../services/matrix.service.js";
import { db } from "../db/index.js";
import { bandFromSlots, type SlotCount } from "../lib/band-aggregate.js";
import { slotsPerDay } from "../lib/time.js";
import { NotFoundError } from "../lib/errors.js";
import { ok } from "../lib/result.js";

export const availabilityRoutes = Router();
availabilityRoutes.use(requireAuth);

availabilityRoutes.get("/grid", validate({ query: gridQuerySchema }), async (req, res) => {
  const { periodId, granularity } = req.query as unknown as { periodId: string; granularity: "slot" | "band" };
  const period = await periodRepo.byId(periodId);
  if (!period) throw new NotFoundError("Periode");

  const etag = `"v${period.availabilityVersion}-${granularity}"`;
  if (req.headers["if-none-match"] === etag) return res.status(304).end();

  const aggregates = await availabilityRepo.aggregatesFor(periodId);
  const totalActiveMembers = aggregates[0]?.totalActive ?? 0;
  res.setHeader("ETag", etag);

  if (granularity === "slot") {
    return res.json(
      ok(
        {
          periodId,
          granularity,
          cells: aggregates.map((a) => ({ weekday: a.weekday, slotIndex: a.slotIndex, free: a.freeCount, soft: a.softCount, total: a.totalActive })),
          totalActiveMembers,
        },
        { version: period.availabilityVersion, computedAt: aggregates[0]?.computedAt },
      ),
    );
  }

  const bands = (await periodRepo.listBands(periodId)).map(serializeBand);
  const cells = [];
  for (let weekday = 1; weekday <= 7; weekday++) {
    const totalSlots = slotsPerDay(period);
    const bySlot: (SlotCount | undefined)[] = Array.from({ length: totalSlots });
    for (const a of aggregates) {
      if (a.weekday === weekday) bySlot[a.slotIndex] = { free: a.freeCount, soft: a.softCount, total: a.totalActive };
    }
    for (const band of bands) {
      const agg = bandFromSlots(period, band, bySlot);
      cells.push({ weekday, bandKey: band.key, free: agg.free, soft: agg.soft, total: agg.total });
    }
  }

  res.json(
    ok(
      { periodId, granularity, bands, cells, totalActiveMembers },
      { version: period.availabilityVersion, computedAt: aggregates[0]?.computedAt },
    ),
  );
});

availabilityRoutes.get("/member/:id", validate({ params: idParamSchema, query: memberGridQuerySchema }), async (req, res) => {
  const memberId = (req.params.id as string);
  const { periodId } = req.query as unknown as { periodId: string };
  const period = await periodRepo.byId(periodId);
  if (!period) throw new NotFoundError("Periode");
  const member = await memberRepo.byId(memberId);
  if (!member) throw new NotFoundError("Anggota");

  const rows = await availabilityRepo.slotsForMember(memberId, periodId);
  const sourceIds = [...new Set(rows.map((r) => r.sourceActivityId).filter((x): x is string => !!x))];
  const categoryMap = await activityRepo.categoriesByIds(sourceIds);

  const totalSlots = slotsPerDay(period);
  const grid: { weekday: number; slotIndex: number; status: string; category: string | null }[] = [];
  for (let weekday = 1; weekday <= 7; weekday++) {
    for (let slotIndex = 0; slotIndex < totalSlots; slotIndex++) grid.push({ weekday, slotIndex, status: "implicit_free", category: null });
  }
  const byKey = new Map(grid.map((g) => [`${g.weekday}:${g.slotIndex}`, g]));
  for (const r of rows) {
    const cell = byKey.get(`${r.weekday}:${r.slotIndex}`);
    if (!cell) continue;
    cell.status = r.status;
    cell.category = r.sourceActivityId ? categoryMap.get(r.sourceActivityId)?.category ?? null : null;
  }

  res.json(ok({ periodId, memberId, cells: grid }, { version: period.availabilityVersion }));
});

availabilityRoutes.get("/day", validate({ query: dayQuerySchema }), async (req, res) => {
  const { periodId, date, granularity } = req.query as unknown as { periodId: string; date: string; granularity: "slot" | "band" };
  const period = await periodRepo.byId(periodId);
  if (!period) throw new NotFoundError("Periode");

  const pool = await memberRepo.list({ activeOnly: true });
  const grid = await availabilityService.resolveForDate(pool.map((m) => m.id), periodId, date);
  if (!grid) return res.json(ok({ periodId, date, outOfRange: true, cells: [] }));

  const totalSlots = slotsPerDay(period);
  const slotCounts: SlotCount[] = Array.from({ length: totalSlots }, () => ({ free: 0, soft: 0, total: pool.length }));
  for (const cells of grid.values()) {
    cells.forEach((c, i) => {
      if (isFree(c)) slotCounts[i].free += 1;
      else if (isNegotiable(c)) slotCounts[i].soft += 1;
    });
  }

  if (granularity === "slot") {
    return res.json(ok({ periodId, date, granularity, totalActiveMembers: pool.length, cells: slotCounts }));
  }

  const bands = (await periodRepo.listBands(periodId)).map(serializeBand);
  const cells = bands.map((band) => ({ bandKey: band.key, ...bandFromSlots(period, band, slotCounts) }));
  res.json(ok({ periodId, date, granularity, bands, totalActiveMembers: pool.length, cells }));
});

availabilityRoutes.get("/slot", validate({ query: slotQuerySchema }), async (req, res) => {
  const { periodId, date, startTime, endTime } = req.query as unknown as {
    periodId: string;
    date: string;
    startTime: string;
    endTime: string;
  };
  res.json(ok(await matrixService.slotDetail(req.actor, { periodId, date, startTime, endTime })));
});

availabilityRoutes.post(
  "/search",
  requireRole("coordinator", "admin"),
  validate({ body: searchBodySchema }),
  async (req, res) => res.json(ok(await matrixService.search(req.actor, req.body as any))),
);

availabilityRoutes.post(
  "/recompute",
  requireRole("admin"),
  validate({ body: recomputeBodySchema }),
  async (req, res) => {
    const { periodId, memberId } = req.body as { periodId: string; memberId?: string };
    if (memberId) {
      await db.transaction((tx) => availabilityService.recomputeMember(memberId, periodId, tx));
    } else {
      await db.transaction((tx) => availabilityService.recomputeAllForPeriod(periodId, tx));
    }
    res.json(ok({ recomputed: true }));
  },
);
