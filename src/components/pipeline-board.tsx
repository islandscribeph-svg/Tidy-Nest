"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Stage } from "@prisma/client";
import { closedInYear, textMatch } from "@/lib/filter-presets";
import { MAIN_STAGES, EXIT_STAGES, STAGE_LABELS, STAGE_COLORS, CANONICAL_STATUS } from "@/lib/pipeline";
import { SavedFilterBar } from "@/components/saved-filter-bar";
import type { DealSummary } from "@/lib/types";
import { DealCard } from "@/components/deal-card";
import { ExportLinks } from "@/components/export-links";
import { DealDrawer } from "@/components/deal-drawer";
import { ViewsMenu } from "@/components/views-menu";

export function PipelineBoard({
  initialDeals,
  users,
  employees,
  isAdmin = false,
  initialDealId = null,
}: {
  initialDeals: DealSummary[];
  users: { id: string; name: string }[];
  employees: { id: string; name: string; active: boolean }[];
  isAdmin?: boolean;
  initialDealId?: string | null;
}) {
  const [deals, setDeals] = useState<DealSummary[]>(initialDeals);
  const [activeDeal, setActiveDeal] = useState<DealSummary | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [phoneStage, setPhoneStage] = useState<Stage>("NEW_LEAD");
  const [dragReady, setDragReady] = useState(false);
  useEffect(() => setDragReady(true), []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const visibleDeals = useMemo(() => {
    return deals.filter((deal) => {
      if (stageFilter !== "all" && deal.stage !== stageFilter) return false;
      if (!closedInYear(deal.dateClosed, yearFilter)) return false;
      return textMatch(query, [
        deal.displayName,
        deal.title,
        deal.subStatus,
        deal.invoiceNumber,
        deal.contact.firstName,
        deal.contact.lastName,
        deal.contact.email,
        deal.contact.city,
        deal.contact.state,
      ]);
    });
  }, [deals, query, stageFilter, yearFilter]);

  const dealsByStage = useMemo(() => {
    const map = new Map<Stage, DealSummary[]>();
    for (const stage of [...MAIN_STAGES, ...EXIT_STAGES]) map.set(stage, []);
    for (const deal of visibleDeals) map.get(deal.stage)?.push(deal);
    return map;
  }, [visibleDeals]);

  function handleDragStart(event: DragStartEvent) {
    const deal = deals.find((d) => d.id === event.active.id);
    setActiveDeal(deal ?? null);
  }

  async function moveDeal(dealId: string, newStage: Stage) {
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;
    const prevDeals = deals;
    const subStatus = CANONICAL_STATUS[newStage];
    setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, stage: newStage, subStatus } : d)));
    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage, subStatus }),
    });
    if (!res.ok) setDeals(prevDeals);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;
    await moveDeal(active.id as string, over.id as Stage);
  }

  function handleDealSaved(updated: Partial<DealSummary> & { id: string }) {
    setDeals((ds) => ds.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
  }

  const filterQuery = { q: query, stage: stageFilter, year: yearFilter };
  function applyFilter(next: { q?: string; stage?: string; year?: string }) {
    setQuery(next.q ?? "");
    setStageFilter(next.stage || "all");
    setYearFilter(next.year || "all");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="hidden border-b border-[#e4dfd2] bg-white px-6 py-3 md:flex md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[#1c2116]">Pipeline</h1>
          <p className="text-xs text-neutral-500">Drag a project between stages. On a phone, pick a stage, then move it with the list.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SavedFilterBar page="pipeline" query={filterQuery} onApply={applyFilter} />
          <ExportLinks href="/api/exports/pipeline" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects"
            className="min-h-11 w-48 rounded-xl border border-neutral-300 px-3 text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-2 border-b border-[#e4dfd2] bg-white px-3 py-2 md:hidden">
        <h1 className="sr-only">Pipeline</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search projects"
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-neutral-300 px-3 text-sm"
        />
        <ViewsMenu>
          <SavedFilterBar page="pipeline" query={filterQuery} onApply={applyFilter} />
          <ExportLinks href="/api/exports/pipeline" />
        </ViewsMenu>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:hidden">
        <div className="flex gap-2 overflow-x-auto px-3 py-3">
          {[...MAIN_STAGES, ...EXIT_STAGES].map((stage) => {
            const count = dealsByStage.get(stage)?.length ?? 0;
            const selected = phoneStage === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setPhoneStage(stage)}
                className={`min-h-11 shrink-0 rounded-full px-3 text-sm ${
                  selected ? "bg-[#1c2116] text-white" : "bg-white text-neutral-700"
                }`}
              >
                {STAGE_LABELS[stage]} ({count})
              </button>
            );
          })}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto bg-white">
          {(dealsByStage.get(phoneStage) ?? []).length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">No projects in {STAGE_LABELS[phoneStage]}.</p>
          )}
          {(dealsByStage.get(phoneStage) ?? []).map((deal) => (
            <div key={deal.id} className="border-b border-[#f0ece3]">
              <div onClick={() => setSelectedDealId(deal.id)} className="cursor-pointer">
                <DealCard deal={deal} className="py-3" />
              </div>
              <label className="flex items-center gap-2 px-3 pb-3 text-sm text-neutral-600">
                Move to
                <select
                  value={deal.stage}
                  onChange={(event) => {
                    const next = event.target.value as Stage;
                    setPhoneStage(next);
                    void moveDeal(deal.id, next);
                  }}
                  className="min-h-11 flex-1 rounded-xl border border-[#e4dfd2] bg-white px-2"
                >
                  {[...MAIN_STAGES, ...EXIT_STAGES].map((stage) => (
                    <option key={stage} value={stage}>
                      {STAGE_LABELS[stage]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </div>

      {dragReady ? (
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="hidden min-h-0 flex-1 gap-4 overflow-x-auto p-6 md:flex">
          {MAIN_STAGES.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              deals={dealsByStage.get(stage) ?? []}
              onSelect={setSelectedDealId}
              onMove={(id, next) => void moveDeal(id, next)}
            />
          ))}
          <div className="flex w-64 shrink-0 flex-col gap-4">
            {EXIT_STAGES.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                deals={dealsByStage.get(stage) ?? []}
                onSelect={setSelectedDealId}
                onMove={(id, next) => void moveDeal(id, next)}
                compact
              />
            ))}
          </div>
        </div>
        <DragOverlay>
          {activeDeal ? (
            <div className="rotate-2">
              <DealCard deal={activeDeal} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      ) : (
        <div className="hidden min-h-0 flex-1 gap-4 overflow-x-auto p-6 md:flex">
          {MAIN_STAGES.map((stage) => (
            <StaticColumn key={stage} stage={stage} deals={dealsByStage.get(stage) ?? []} onSelect={setSelectedDealId} onMove={(id, next) => void moveDeal(id, next)} />
          ))}
          <div className="flex w-64 shrink-0 flex-col gap-4">
            {EXIT_STAGES.map((stage) => (
              <StaticColumn
                key={stage}
                stage={stage}
                deals={dealsByStage.get(stage) ?? []}
                onSelect={setSelectedDealId}
                onMove={(id, next) => void moveDeal(id, next)}
                compact
              />
            ))}
          </div>
        </div>
      )}

      {selectedDealId && (
        <DealDrawer
          key={selectedDealId}
          dealId={selectedDealId}
          users={users}
          employees={employees}
          isAdmin={isAdmin}
          onClose={() => setSelectedDealId(null)}
          onSaved={handleDealSaved}
        />
      )}
    </div>
  );
}

function Column({
  stage,
  deals,
  onSelect,
  onMove,
  compact,
}: {
  stage: Stage;
  deals: DealSummary[];
  onSelect: (id: string) => void;
  onMove: (id: string, stage: Stage) => void;
  compact?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const colors = STAGE_COLORS[stage];

  return (
    <div
      ref={setNodeRef}
      className={`flex ${compact ? "flex-1" : "w-80 shrink-0"} flex-col rounded-lg border ${
        isOver ? "border-neutral-400 bg-neutral-100" : "border-neutral-200 bg-white"
      }`}
    >
      <div className={`flex items-center justify-between rounded-t-lg border-b px-3 py-2 ${colors.header}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>{STAGE_LABELS[stage]}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">{deals.length}</span>
      </div>
      <div className="flex flex-1 flex-col divide-y divide-neutral-100 overflow-y-auto pb-2">
        {deals.map((deal) => (
          <DraggableCard key={deal.id} deal={deal} onSelect={onSelect} onMove={onMove} />
        ))}
        {deals.length === 0 && <p className="px-3 py-6 text-center text-xs text-neutral-400">No projects in this stage.</p>}
      </div>
    </div>
  );
}

function StaticColumn({
  stage,
  deals,
  onSelect,
  onMove,
  compact,
}: {
  stage: Stage;
  deals: DealSummary[];
  onSelect: (id: string) => void;
  onMove: (id: string, stage: Stage) => void;
  compact?: boolean;
}) {
  const colors = STAGE_COLORS[stage];
  return (
    <div className={`flex ${compact ? "flex-1" : "w-80 shrink-0"} flex-col rounded-lg border border-neutral-200 bg-white`}>
      <div className={`flex items-center justify-between rounded-t-lg border-b px-3 py-2 ${colors.header}`}>
        <h2 className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>{STAGE_LABELS[stage]}</h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">{deals.length}</span>
      </div>
      <div className="flex flex-1 flex-col divide-y divide-neutral-100 overflow-y-auto pb-2">
        {deals.map((deal) => (
          <div key={deal.id} className="flex items-center">
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onSelect(deal.id)}>
              <DealCard deal={deal} />
            </div>
            <select
              aria-label="Stage"
              value={deal.stage}
              onChange={(event) => onMove(deal.id, event.target.value as Stage)}
              className="mr-2 max-w-28 rounded-md border border-neutral-200 bg-white px-1 py-1 text-xs"
            >
              {[...MAIN_STAGES, ...EXIT_STAGES].map((option) => (
                <option key={option} value={option}>
                  {STAGE_LABELS[option]}
                </option>
              ))}
            </select>
          </div>
        ))}
        {deals.length === 0 && <p className="px-3 py-6 text-center text-xs text-neutral-400">No projects in this stage.</p>}
      </div>
    </div>
  );
}

function DraggableCard({
  deal,
  onSelect,
  onMove,
}: {
  deal: DealSummary;
  onSelect: (id: string) => void;
  onMove: (id: string, stage: Stage) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(deal.id)}
      className={isDragging ? "opacity-30" : "cursor-pointer"}
    >
      <div className="flex items-center">
        <div className="min-w-0 flex-1">
          <DealCard deal={deal} />
        </div>
        <select
          aria-label="Stage"
          value={deal.stage}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onChange={(event) => onMove(deal.id, event.target.value as Stage)}
          className="mr-2 max-w-28 rounded-md border border-neutral-200 bg-white px-1 py-1 text-xs"
        >
          {[...MAIN_STAGES, ...EXIT_STAGES].map((stage) => (
            <option key={stage} value={stage}>
              {STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
