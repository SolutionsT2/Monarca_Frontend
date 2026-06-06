/**
 * Description: Type definitions for approval rules, conditions, and approval chains.
 */

export type ConditionField = "trip_type" | "cost" | "priority";
export type ConditionOperator = "gt" | "lt" | "gte" | "lte" | "eq";
export type TripType = "nacional" | "internacional";
export type Priority = "alta" | "media" | "baja";
export type StepType = "role" | "hierarchy";

export interface RuleCondition {
  field: ConditionField;
  operator?: ConditionOperator;
  value: string | number;
}

export interface ApprovalRuleStep {
  id?: string;
  order: number;
  stepType: StepType;
  idRole?: string | null;
  hierarchyLevel?: number | null;
  minApprovals: number;
}

export interface ApprovalRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: number;
  conditions: RuleCondition[];
  steps: ApprovalRuleStep[];
}

export interface ResolvedManager {
  level: number;
  userId: string;
  name: string;
  lastName: string;
  email: string;
}

export interface ResolvedStep {
  order: number;
  stepType: StepType;
  minApprovals: number;
  roleId?: string | null;
  resolvedManagers?: ResolvedManager[];
  warning?: string;
}

export interface ResolveApproversResult {
  ruleId: string;
  ruleName: string;
  steps: ResolvedStep[];
}

export interface ApprovalLevel {
  order: number;
  stepType: StepType;
  roleId?: string;
  roleName?: string;
  hierarchyLevel?: number;
  requiredApprovals: number;
}

/*
 * Modification History:
 * - 2026-04-08 | Juan de Dios Gastélum | Initial file creation.
 * - 2026-05-12 | Juan de Dios Gastélum | Added StepType, ResolvedManager, ResolvedStep, ResolveApproversResult.
 * - 2026-05-12 | Juan de Dios Gastélum | Replaced approvalChain with steps to match backend schema: added ApprovalRuleStep interface; removed role-only ApprovalLevel.
 * - 2026-05-12 | Juan de Dios Gastélum | Restored ApprovalLevel type for approval chain builder compatibility.
 */
