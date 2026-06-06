/**
 * Description: Utility for detecting logical contradictions in a set of rule conditions.
 * All conditions in a rule use AND logic, so contradictory conditions make the rule unmatchable.
 */

import { RuleCondition, ConditionField } from "../types/approvalRules";

const FIELD_LABELS: Record<string, string> = {
  trip_type: "Tipo de viaje",
  priority: "Prioridad",
  cost: "Costo",
};

/**
 * Checks whether a list of conditions contain logical contradictions under AND semantics.
 * Handles categorical fields (trip_type, priority) and numeric range analysis for cost.
 * @param conditions Conditions to validate.
 * @returns A human-readable error string if a contradiction is found, or null if satisfiable.
 */
export const detectConditionContradiction = (
  conditions: RuleCondition[],
): string | null => {
  // A categorical field can only match one value; two different values = always false
  for (const field of ["trip_type", "priority"] as ConditionField[]) {
    const fieldConditions = conditions.filter((c) => c.field === field);
    if (fieldConditions.length < 2) continue;
    const uniqueValues = [
      ...new Set(fieldConditions.map((c) => String(c.value))),
    ];
    if (uniqueValues.length > 1) {
      return `Las condiciones de "${FIELD_LABELS[field]}" son contradictorias: una solicitud no puede tener dos valores distintos al mismo tiempo.`;
    }
  }

  // Cost: compute the effective numeric range and check if it is satisfiable
  const costConditions = conditions.filter((c) => c.field === "cost");
  if (costConditions.length < 2) return null;

  let lowerBound = -Infinity;
  let lowerInclusive = true;
  let upperBound = Infinity;
  let upperInclusive = true;
  const eqValues: number[] = [];

  for (const c of costConditions) {
    const val = Number(c.value);
    if (isNaN(val)) continue;

    switch (c.operator) {
      case "gt":
        if (val > lowerBound || (val === lowerBound && lowerInclusive)) {
          lowerBound = val;
          lowerInclusive = false;
        }
        break;
      case "gte":
        if (val > lowerBound) {
          lowerBound = val;
          lowerInclusive = true;
        }
        break;
      case "lt":
        if (val < upperBound || (val === upperBound && upperInclusive)) {
          upperBound = val;
          upperInclusive = false;
        }
        break;
      case "lte":
        if (val < upperBound) {
          upperBound = val;
          upperInclusive = true;
        }
        break;
      case "eq":
        eqValues.push(val);
        break;
    }
  }

  if (eqValues.length > 0) {
    // Every eq value must fall within the computed range
    const allInvalid = eqValues.every((eqVal) => {
      const aboveLower = lowerInclusive
        ? eqVal >= lowerBound
        : eqVal > lowerBound;
      const belowUpper = upperInclusive
        ? eqVal <= upperBound
        : eqVal < upperBound;
      return !(aboveLower && belowUpper);
    });
    if (allInvalid) {
      return "Las condiciones de costo son contradictorias: ningún monto satisface todas las condiciones al mismo tiempo.";
    }
  } else {
    const rangeIsEmpty =
      lowerBound > upperBound ||
      (lowerBound === upperBound && (!lowerInclusive || !upperInclusive));
    if (rangeIsEmpty) {
      return "Las condiciones de costo son contradictorias: ningún monto satisface todas las condiciones al mismo tiempo.";
    }
  }

  return null;
};

/*
 * Modification History:
 * - 2026-05-26 | Juan de Dios Gastélum Flores | Initial file creation.
 */
