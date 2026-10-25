import type { AuditLogEntry, AnyOrderRequest, GateDecision } from "../types.ts";

export class AuditLogger {
  private readonly logs: AuditLogEntry[] = [];

  record(order: AnyOrderRequest, decision: GateDecision): void {
    const entry: AuditLogEntry = {
      timestampMs: Date.now(),
      orderId: order.id,
      botType: order.botType,
      action: decision.allowed ? "APPROVED" : "REJECTED",
      rule: decision.allowed ? "ALL_PASS" : decision.ruleViolated,
      reason: decision.allowed ? (decision.notes ?? "Passed all risk gates") : decision.reason,
      metadata: decision.allowed ? undefined : decision.metadata
    };
    this.logs.push(entry);
  }

  getEntries(): readonly AuditLogEntry[] {
    return [...this.logs];
  }

  getLastEntry(): AuditLogEntry | undefined {
    return this.logs[this.logs.length - 1];
  }

  clear(): void {
    this.logs.length = 0;
  }
}
