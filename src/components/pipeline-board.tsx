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
import { MAIN_STAGES, EXIT_STAGES, STAGE_LABELS } from "@/lib/pipeline";
import type { DealSummary } from "@/lib/types";
import { DealCard } from "@/components/deal-card";
import { DealDrawer } from "@/components/deal-drawer";
import { NewLeadModal } from "@/components/new-lead-modal";

export function PipelineBoard({
  initialDeals,
  users,
}: {
  initialDeals: DealSummary[];
  users: { id: string; name: string }[];
}) {
  const [deals, setDeals] = useState<DealSummary[]>(initialDeals);
  const [activeDeal, setActiveDeal] = useState<DealSummary | null>(null);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [showNewLead, setShowNewLead] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const dealsByStage = useMemo(() => {
    const map = new Map<Stage, DealSummary[]>();
    for (const stage of [...MAIN_STAGES, ...EXIT_STAGES]) map.set(stage, []);
    for (const deal of deals) map.get(deal.stage)?.push(deal);
    return map;
  }, [deals]);

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
    setDeals((ds) => ds.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)));

    const res = await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
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
        <h1 className="text-lg font-semibold text-neutral-900">Pipeline</h1>
        <button
          onClick={() => setShowNewLead(true)}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + New Lead
        </button>
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
          dealId={selectedDealId}
          users={users}
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
  const isExit = stage === "DEAD" || stage === "UNQUALIFIED";

  return (
    <div
      ref={setNodeRef}
      className={`flex ${compact ? "flex-1" : "w-72 shrink-0"} flex-col rounded-lg border ${
        isOver ? "border-neutral-400 bg-neutral-100" : "border-neutral-200 bg-neutral-100/60"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2">
        <h2
          className={`text-xs font-semibold uppercase tracking-wide ${
            isExit ? "text-red-500" : "text-neutral-500"
          }`}
        >
          {STAGE_LABELS[stage]}
        </h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-neutral-500">{deals.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
        {deals.map((deal) => (
          <DraggableCard key={deal.id} deal={deal} onSelect={onSelect} />
        ))}
        {deals.length === 0 && <p className="px-2 py-6 text-center text-xs text-neutral-400">No deals</p>}
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
