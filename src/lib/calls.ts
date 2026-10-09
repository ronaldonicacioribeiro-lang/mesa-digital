// Tipos e funções comuns dos chamados de mesa (usados pelo cliente e pela equipe).

export type CallStatus = "waiting" | "attending" | "done" | "canceled";
export type CallType = "waiter" | "bill";
export type BillMethod = "" | "pix" | "card" | "cash";

export const ACTIVE: CallStatus[] = ["waiting", "attending"];

export const BILL_LABEL: Record<string, string> = { pix: "Pix", card: "Cartão", cash: "Dinheiro" };

// O que a mesa (cliente) enxerga de um chamado.
export type CallView = {
  id: string;
  type: CallType;
  billMethod: BillMethod;
  status: CallStatus;
  createdAt: string; // ISO
  doneAt: string | null;
  attendedBy: string;
};

// O que a equipe enxerga (inclui o número da mesa e os tempos).
export type StaffCallView = CallView & { table: number; attendedAt: string | null };

type Raw = {
  _id: unknown;
  tableNumber?: number;
  type: string;
  billMethod?: string;
  status: string;
  createdAt: Date;
  attendedAt?: Date | null;
  attendedBy?: string;
  doneAt?: Date | null;
};

export function toCallView(c: Raw): CallView {
  return {
    id: String(c._id),
    type: c.type as CallType,
    billMethod: (c.billMethod ?? "") as BillMethod,
    status: c.status as CallStatus,
    createdAt: c.createdAt.toISOString(),
    doneAt: c.doneAt ? c.doneAt.toISOString() : null,
    attendedBy: c.attendedBy ?? "",
  };
}

export function toStaffCallView(c: Raw): StaffCallView {
  return {
    ...toCallView(c),
    table: c.tableNumber ?? 0,
    attendedAt: c.attendedAt ? c.attendedAt.toISOString() : null,
  };
}

// Texto do tipo de chamado, ex.: "Garçom" ou "Conta (Pix)".
export const callLabel = (c: Pick<CallView, "type" | "billMethod">) =>
  c.type === "waiter" ? "Garçom" : `Conta${c.billMethod ? ` (${BILL_LABEL[c.billMethod]})` : ""}`;
