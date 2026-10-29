"use client";

import { useMemo, useState } from "react";
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
import { NewLeadModal } from "@/components/new-lead-modal";

export function PipelineBoard({
  initialDeals,
  users,
  employees,
  initialDealId = null,
}: {
  initialDeals: DealSummary[];
  users: { id: string; name: string }[];
  employees: { id: string; name: string; active: boolean }[];
  initialDealId?: string | null;
}) {
  const [deals, setDeals] = useState<DealSummary[]>(initialDeals);
  const [activeDeal, setActiveDeal] = useState<DealSummary | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(initialDealId);
  const [showNewLead, setShowNewLead] = useState(false);
  const [query, setQuery] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

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

  async function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null);
    const { active, over } = event;
    if (!over) return;
    const dealId = active.id as string;
    const newStage = over.id as Stage;
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
    if (!res.ok) {
      setDeals(prevDeals);
    }
  }

  function handleDealSaved(updated: Partial<DealSummary> & { id: string }) {
    setDeals((ds) => ds.map((d) => (d.id === updated.id ? { ...d, ...updated } : d)));
  }

  function handleNewLead(deal: DealSummary) {
    setDeals((ds) => [deal, ...ds]);
    setShowNewLead(false);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">Pipeline</h1>
          <p className="text-xs text-neutral-500">
            Columns follow Monday Status. Board groups are ignored. Moving a row updates this app only.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SavedFilterBar
            page="pipeline"
            query={{ q: query, stage: stageFilter, year: yearFilter }}
            onApply={(next) => {
              setQuery(next.q ?? "");
              setStageFilter(next.stage || "all");
              setYearFilter(next.year || "all");
            }}
          />
          <ExportLinks href="/api/exports/pipeline" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="w-48 rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          />
        <button
          onClick={() => setShowNewLead(true)}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + New Lead
        </button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-4 overflow-x-auto p-6">
          {MAIN_STAGES.map((stage) => (
            <Column
              key={stage}
              stage={stage}
              deals={dealsByStage.get(stage) ?? []}
              onSelect={setSelectedDealId}
            />
          ))}
          <div className="flex w-64 shrink-0 flex-col gap-4">
            {EXIT_STAGES.map((stage) => (
              <Column
                key={stage}
                stage={stage}
                deals={dealsByStage.get(stage) ?? []}
                onSelect={setSelectedDealId}
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

      {selectedDealId && (
        <DealDrawer
          key={selectedDealId}
          dealId={selectedDealId}
          users={users}
          employees={employees}
          onClose={() => setSelectedDealId(null)}
          onSaved={handleDealSaved}
        />
      )}
      {showNewLead && <NewLeadModal onClose={() => setShowNewLead(false)} onCreated={handleNewLead} />}
    </div>
  );
}

function Column({
  stage,
  deals,
  onSelect,
  compact,
}: {
  stage: Stage;
  deals: DealSummary[];
  onSelect: (id: string) => void;
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
          <DraggableCard key={deal.id} deal={deal} onSelect={onSelect} />
        ))}
        {deals.length === 0 && <p className="px-3 py-6 text-center text-xs text-neutral-400">No deals</p>}
      </div>
    </div>
  );
}

function DraggableCard({ deal, onSelect }: { deal: DealSummary; onSelect: (id: string) => void }) {
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
      <DealCard deal={deal} />
    </div>
  );
}
