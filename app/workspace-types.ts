export type WorkOrderStatus = "new" | "in_progress" | "agreement" | "paid" | "task" | "idea";
export type WorkStepStatus = "open" | "bidding" | "assigned" | "done";
export type CompensationMode = "percent" | "fixed" | "bid";
export type MaterialSource = "office" | "contractor" | "client";

export type TeamMember = {
  id: string;
  name: string;
  contact: string;
  active: boolean;
};

export type WorkType = {
  id: string;
  name: string;
  compensationMode: CompensationMode;
  defaultValue: number;
  autoAddToNewOrder: boolean;
  reimbursesMaterials: boolean;
  active: boolean;
};

export type WorkBid = {
  id: string;
  memberId: string;
  amount: number;
  comment: string;
  material: string;
  leadTime: string;
  createdAt: string;
};

export type OrderQuestion = {
  id: string;
  memberId: string;
  memberName: string;
  message: string;
  createdAt: string;
};

export type WorkStep = {
  id: string;
  typeId: string;
  title: string;
  status: WorkStepStatus;
  assignedTo: string | null;
  compensationMode: CompensationMode;
  value: number;
  agreedAmount: number | null;
  bids: WorkBid[];
  completedAt: string | null;
};

export type WorkAdjustment = {
  id: string;
  memberId: string;
  label: string;
  amount: number;
  kind: "bonus" | "expense" | "deduction";
};

export type WorkOrder = {
  id: string;
  requestId: string | null;
  createdAt: string;
  updatedAt: string;
  title: string;
  clientName: string;
  clientContact: string;
  details: string;
  responsibleId: string | null;
  status: WorkOrderStatus;
  finalPrice: number;
  materialSource: MaterialSource;
  materialOwnerId: string | null;
  materialCost: number;
  deadline: string;
  notes: string;
  auctionClosedAt: string | null;
  questions: OrderQuestion[];
  steps: WorkStep[];
  adjustments: WorkAdjustment[];
};

export type WorkspaceState = {
  version: 1;
  members: TeamMember[];
  workTypes: WorkType[];
  orders: WorkOrder[];
  dismissedRequestIds: string[];
};

export type WorkspaceAction =
  | { type: "create_order"; order: Pick<WorkOrder, "title" | "clientName" | "clientContact" | "details" | "finalPrice" | "deadline"> & { responsibleId?: string | null } }
  | { type: "delete_order"; orderId: string }
  | { type: "update_order"; orderId: string; patch: Partial<Pick<WorkOrder, "title" | "clientName" | "clientContact" | "details" | "responsibleId" | "status" | "finalPrice" | "materialSource" | "materialOwnerId" | "materialCost" | "deadline" | "notes">> }
  | { type: "add_step"; orderId: string; workTypeId: string; title?: string }
  | { type: "delete_step"; orderId: string; stepId: string }
  | { type: "add_bid"; orderId: string; stepId: string; memberId: string; amount: number; comment?: string; material?: string; leadTime?: string }
  | { type: "add_question"; orderId: string; memberId: string; message: string }
  | { type: "close_auction"; orderId: string }
  | { type: "claim_step"; orderId: string; stepId: string; memberId: string }
  | { type: "select_bid"; orderId: string; stepId: string; bidId: string }
  | { type: "update_step_status"; orderId: string; stepId: string; status: WorkStepStatus }
  | { type: "add_adjustment"; orderId: string; adjustment: Omit<WorkAdjustment, "id"> }
  | { type: "delete_adjustment"; orderId: string; adjustmentId: string }
  | { type: "add_member"; member: Pick<TeamMember, "name" | "contact"> }
  | { type: "update_member"; memberId: string; patch: Partial<Pick<TeamMember, "name" | "contact" | "active">> }
  | { type: "add_work_type"; workType: Omit<WorkType, "id"> }
  | { type: "update_work_type"; workTypeId: string; patch: Partial<Omit<WorkType, "id">> };

export type MemberPayout = {
  memberId: string;
  work: number;
  materials: number;
  adjustments: number;
  total: number;
};

export function stepPayout(order: WorkOrder, step: WorkStep) {
  if (!step.assignedTo) return 0;
  if (step.agreedAmount !== null) return Math.max(0, step.agreedAmount);
  if (step.compensationMode === "percent") return Math.max(0, Math.round(order.finalPrice * step.value) / 100);
  if (step.compensationMode === "fixed") return Math.max(0, step.value);
  return 0;
}

export function calculateOrderPayouts(order: WorkOrder): MemberPayout[] {
  const payouts = new Map<string, MemberPayout>();
  const ensure = (memberId: string) => {
    const current = payouts.get(memberId) || { memberId, work: 0, materials: 0, adjustments: 0, total: 0 };
    payouts.set(memberId, current);
    return current;
  };

  for (const step of order.steps) {
    if (!step.assignedTo) continue;
    ensure(step.assignedTo).work += stepPayout(order, step);
  }

  if (order.materialSource === "contractor" && order.materialOwnerId && order.materialCost > 0) {
    ensure(order.materialOwnerId).materials += order.materialCost;
  }

  for (const adjustment of order.adjustments) {
    const multiplier = adjustment.kind === "deduction" ? -1 : 1;
    ensure(adjustment.memberId).adjustments += adjustment.amount * multiplier;
  }

  return [...payouts.values()].map((payout) => ({
    ...payout,
    work: Math.round(payout.work),
    materials: Math.round(payout.materials),
    adjustments: Math.round(payout.adjustments),
    total: Math.round(payout.work + payout.materials + payout.adjustments),
  }));
}
