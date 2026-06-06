/**
 * Description: Component to display the list of approval rules with edit, delete,
 * and reorder actions.
 */

import React, { useState } from "react";
import { ApprovalRule, RuleCondition } from "../../types/approvalRules";
import { Button } from "../ui/Button";
import { useGetApprovalRules } from "../../hooks/approvalRules/useGetApprovalRules";
import { useDeleteApprovalRule } from "../../hooks/approvalRules/useDeleteApprovalRule";
import { useUpdateApprovalRule } from "../../hooks/approvalRules/useUpdateApprovalRule";
import { ConfirmationModal } from "../ui/ConfirmationModal";

const FIELD_LABELS: Record<string, string> = {
  trip_type: "Tipo",
  cost: "Costo",
  priority: "Prioridad",
};

const OPERATOR_LABELS: Record<string, string> = {
  gt: ">",
  gte: ">=",
  lt: "<",
  lte: "<=",
  eq: "=",
};

const VALUE_LABELS: Record<string, string> = {
  nacional: "Nacional",
  internacional: "Internacional",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

/**
 * Formats a single condition into a human-readable Spanish string.
 * @param condition The condition to format.
 * @returns Formatted condition string.
 */
const formatCondition = (condition: RuleCondition): string => {
  const field = FIELD_LABELS[condition.field] ?? condition.field;
  const operator = condition.operator
    ? ` ${OPERATOR_LABELS[condition.operator]}`
    : "";
  const value = VALUE_LABELS[String(condition.value)] ?? condition.value;
  return `${field}${operator} ${value}`;
};

interface RuleListProps {
  onEdit: (rule: ApprovalRule) => void;
  onCreate: () => void;
}

/**
 * Renders a table of all approval rules with options to create, edit, delete,
 * and reorder each one via up/down arrows.
 * @param onEdit Callback triggered when the user selects a rule to edit.
 * @param onCreate Callback triggered when the user wants to create a new rule.
 * @returns React component with the rules table.
 */
export const RuleList = ({ onEdit, onCreate }: RuleListProps) => {
  const { data: rules, isLoading } = useGetApprovalRules();
  const { mutate: deleteRule, isPending: isDeleting } = useDeleteApprovalRule();
  const { mutate: updateRule, isPending: isReordering } =
    useUpdateApprovalRule();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteName, setPendingDeleteName] = useState<string>("");

  /**
   * Moves a rule up or down in the evaluation order by swapping priorities
   * with the adjacent rule.
   * @param index Current position of the rule in the sorted list.
   * @param direction Direction to move: 'up' decreases priority, 'down' increases it.
   */
  const handleMove = (index: number, direction: "up" | "down") => {
    if (!rules) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;

    const ruleA = rules[index];
    const ruleB = rules[targetIndex];

    // Use array indices as fallback priorities when both values are equal.
    const priorityA =
      ruleA.priority !== ruleB.priority ? ruleA.priority : index;
    const priorityB =
      ruleA.priority !== ruleB.priority ? ruleB.priority : targetIndex;

    updateRule({ ruleId: ruleA.id, data: { priority: priorityB } });
    updateRule({ ruleId: ruleB.id, data: { priority: priorityA } });
  };

  /**
   * Opens the confirmation modal before permanently deleting an approval rule.
   * @param ruleId The unique identifier of the rule to delete.
   * @param ruleName The rule name shown in the confirmation modal.
   */
  const handleDelete = (ruleId: string, ruleName: string) => {
    setPendingDeleteId(ruleId);
    setPendingDeleteName(ruleName);
    setConfirmOpen(true);
  };

  /**
   * Executes the rule deletion after the user confirms in the modal.
   */
  const handleConfirmDelete = () => {
    if (!pendingDeleteId) return;
    setConfirmOpen(false);
    setDeletingId(pendingDeleteId);
    deleteRule(pendingDeleteId, {
      onSettled: () => {
        setDeletingId(null);
        setPendingDeleteId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12 text-gray-500 text-sm">
        Cargando reglas...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Reglas de aprobación
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Define quién autoriza cada tipo de solicitud
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Las reglas se evalúan en orden - la primera que coincida con la
            solicitud es la que se aplica.
          </p>
        </div>
        <Button
          onClick={onCreate}
          className="bg-blue-600 text-white hover:bg-blue-700"
        >
          + Nueva Regla
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="py-3 px-4 text-sm font-medium text-gray-600 text-center w-20">
                Orden
              </th>
              <th className="py-3 px-6 text-sm font-medium text-gray-600">
                Nombre
              </th>
              <th className="py-3 px-6 text-sm font-medium text-gray-600">
                Condiciones
              </th>
              <th className="py-3 px-6 text-sm font-medium text-gray-600 text-center">
                Niveles jerárquicos
              </th>
              <th className="py-3 px-6 text-sm font-medium text-gray-600 text-center">
                Estado
              </th>
              <th className="py-3 px-6 text-sm font-medium text-gray-600 text-center">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {rules?.map((rule, index) => (
              <tr
                key={rule.id}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                {/* Evaluation order with up/down controls */}
                <td className="py-4 px-4 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      onClick={() => handleMove(index, "up")}
                      disabled={index === 0 || isReordering}
                      className="text-gray-400 hover:text-blue-600 disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                      title="Subir prioridad"
                    >
                      ▲
                    </button>
                    <span className="text-xs font-bold text-blue-700 w-5 text-center">
                      {index + 1}
                    </span>
                    <button
                      onClick={() => handleMove(index, "down")}
                      disabled={
                        index === (rules?.length ?? 0) - 1 || isReordering
                      }
                      className="text-gray-400 hover:text-blue-600 disabled:opacity-20 disabled:cursor-not-allowed leading-none"
                      title="Bajar prioridad"
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td className="py-4 px-6">
                  <p className="font-medium text-gray-800">{rule.name}</p>
                  {rule.description && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {rule.description}
                    </p>
                  )}
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-1">
                    {rule.conditions.map((condition, i) => (
                      <span
                        key={i}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full w-fit"
                      >
                        {formatCondition(condition)}
                      </span>
                    ))}
                    {rule.conditions.length === 0 && (
                      <span className="text-xs text-gray-400 italic">
                        Sin condiciones
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-6 text-center text-sm text-gray-600">
                  {rule.steps?.find((s) => s.stepType === "hierarchy")
                    ?.hierarchyLevel ?? "—"}
                </td>
                <td className="py-4 px-6 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rule.isActive
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {rule.isActive ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => onEdit(rule)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Editar
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => handleDelete(rule.id, rule.name)}
                      disabled={isDeleting && deletingId === rule.id}
                      className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50"
                    >
                      {isDeleting && deletingId === rule.id
                        ? "Eliminando..."
                        : "Eliminar"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {rules?.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-12 text-center text-gray-400 text-sm"
                >
                  Sin reglas. Crea la primera para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Eliminar regla"
        description={`¿Estás seguro de que deseas eliminar la regla "${pendingDeleteName}"?`}
        confirmText="Eliminar"
        isDestructive
        warningNote="Esta acción es irreversible. La regla será eliminada permanentemente."
      />
    </div>
  );
};

/*
 * Modification History:
 * - 2026-04-08 | Juan de Dios Gastélum Flores | Initial file creation.
 * - 2026-04-21 | Juan de Dios Gastélum Flores | Replaced native confirm() with ConfirmationModal for rule deletion.
 */
