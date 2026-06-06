/**
 * Description: Component to build dynamic conditions for an approval rule.
 */

import React from "react";
import { detectConditionContradiction } from "../../utils/conditionValidation";
import {
  RuleCondition,
  ConditionField,
  ConditionOperator,
} from "../../types/approvalRules";

const FIELD_OPTIONS: { value: ConditionField; label: string }[] = [
  { value: "trip_type", label: "Tipo de viaje" },
  { value: "cost", label: "Costo" },
  { value: "priority", label: "Prioridad" },
];

const OPERATOR_OPTIONS: { value: ConditionOperator; label: string }[] = [
  { value: "gt", label: "Mayor que (>)" },
  { value: "gte", label: "Mayor o igual (≥)" },
  { value: "lt", label: "Menor que (<)" },
  { value: "lte", label: "Menor o igual (≤)" },
  { value: "eq", label: "Igual a (=)" },
];

const TRIP_TYPE_OPTIONS = [
  { value: "nacional", label: "Nacional" },
  { value: "internacional", label: "Internacional" },
];

const PRIORITY_OPTIONS = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

const SELECT_CLASS =
  "w-full text-sm border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer";

interface ConditionBuilderProps {
  conditions: RuleCondition[];
  onChange: (conditions: RuleCondition[]) => void;
}

/**
 * Renders a dynamic list of condition rows for an approval rule.
 * @param conditions Current list of conditions.
 * @param onChange Callback triggered when conditions are added, removed, or updated.
 * @returns React component with the condition builder.
 */
export const ConditionBuilder = ({
  conditions,
  onChange,
}: ConditionBuilderProps) => {
  /**
   * Adds a new default condition to the list.
   */
  const handleAdd = () => {
    onChange([...conditions, { field: "trip_type", value: "nacional" }]);
  };

  /**
   * Removes the condition at the given index.
   * @param index Position of the condition to remove.
   */
  const handleRemove = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index));
  };

  /**
   * Updates a specific condition at the given index, resetting dependent fields when the field type changes.
   * @param index Position of the condition to update.
   * @param updates Partial condition data to merge.
   */
  const handleChange = (index: number, updates: Partial<RuleCondition>) => {
    const updated = conditions.map((condition, i) => {
      if (i !== index) return condition;
      const merged = { ...condition, ...updates };
      if (updates.field && updates.field !== condition.field) {
        merged.value =
          updates.field === "cost"
            ? ""
            : updates.field === "trip_type"
              ? "nacional"
              : "alta";
        merged.operator = updates.field === "cost" ? "gt" : undefined;
      }
      return merged;
    });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Condiciones
        </label>
        <p className="text-xs text-gray-500">
          Define cuándo aplica esta regla. Puedes combinar varias condiciones -
          todas deben cumplirse para que la regla se active.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700 space-y-1">
        <p>
          <strong>Tipo de viaje:</strong> si el destino es dentro o fuera del
          país.
        </p>
        <p>
          <strong>Costo:</strong> monto estimado del viaje en pesos.
        </p>
        <p>
          <strong>Prioridad:</strong> nivel de urgencia asignado a la solicitud.
        </p>
      </div>

      {conditions.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          Sin condiciones - la regla aplicará a todas las solicitudes.
        </p>
      )}

      {conditions.map((condition, index) => (
        <div
          key={index}
          className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Condición {index + 1}
            </span>
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="text-red-400 hover:text-red-600 text-sm font-medium"
            >
              Eliminar
            </button>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Variable</label>
            <select
              value={condition.field}
              onChange={(e) =>
                handleChange(index, { field: e.target.value as ConditionField })
              }
              className={SELECT_CLASS}
            >
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {condition.field === "cost" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Comparación
                </label>
                <select
                  value={condition.operator ?? "gt"}
                  onChange={(e) =>
                    handleChange(index, {
                      operator: e.target.value as ConditionOperator,
                    })
                  }
                  className={SELECT_CLASS}
                >
                  {OPERATOR_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  Monto ($)
                </label>
                <input
                  type="number"
                  min={0}
                  value={condition.value}
                  onChange={(e) =>
                    handleChange(index, { value: e.target.value })
                  }
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  className={`w-full text-sm border rounded-lg px-3 py-2.5 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    String(condition.value).trim() === ""
                      ? "border-red-400"
                      : "border-gray-300"
                  }`}
                />
                {String(condition.value).trim() === "" && (
                  <p className="text-xs text-red-500 mt-1">
                    El monto no puede estar vacío.
                  </p>
                )}
              </div>
            </div>
          )}

          {condition.field === "trip_type" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tipo</label>
              <select
                value={condition.value as string}
                onChange={(e) => handleChange(index, { value: e.target.value })}
                className={SELECT_CLASS}
              >
                {TRIP_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {condition.field === "priority" && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nivel</label>
              <select
                value={condition.value as string}
                onChange={(e) => handleChange(index, { value: e.target.value })}
                className={SELECT_CLASS}
              >
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      ))}
      {(() => {
        const contradiction = detectConditionContradiction(conditions);
        return contradiction ? (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-300 rounded-lg px-4 py-3 text-sm text-amber-800">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <p>{contradiction}</p>
          </div>
        ) : null;
      })()}
      <button
        type="button"
        onClick={handleAdd}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        + Agregar condición
      </button>
    </div>
  );
};

/*
 * Modification History:
 * - 2026-04-08 | Juan de Dios Gastélum Flores | Initial file creation.
 */
