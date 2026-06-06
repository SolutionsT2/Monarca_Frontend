/**
 * Description: Component to display the current user's substitute delegations,
 * separated into active (in effect today) and scheduled (future) sections.
 */
import React, { useState } from "react";
import { useGetSubstitutes } from "../../hooks/substitutes/useGetSubstitutes";
import { useDeleteSubstitute } from "../../hooks/substitutes/useDeleteSubstitute";
import { useGetUsers } from "../../hooks/users/useGetUsers";
import { toast } from "react-toastify";
import { ConfirmationModal } from "../ui/ConfirmationModal";
import { SubstituteDelegation } from "../../types/auth";

/**
 * Returns today's date as a YYYY-MM-DD string using local time.
 */
const getTodayString = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Formats an ISO date string (YYYY-MM-DD) to a human-readable Spanish date,
 * interpreting the date in local time to avoid UTC offset issues.
 * @param isoDate ISO date string in YYYY-MM-DD format.
 * @returns Localized date string.
 */
const formatDate = (isoDate: string): string => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

interface DelegationCardProps {
  sub: SubstituteDelegation;
  targetName: string;
  isPending: boolean;
  pendingDeleteId: string | null;
  onCancel: (id: string) => void;
}

/**
 * Renders a single delegation row with delegate name, date range, notes, and cancel button.
 */
const DelegationCard = ({
  sub,
  targetName,
  isPending,
  pendingDeleteId,
  onCancel,
}: DelegationCardProps) => (
  <div className="flex items-start justify-between gap-4 bg-white border border-gray-200 rounded-lg p-4">
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-800">{targetName}</p>
      <p className="text-xs text-gray-500">
        {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
      </p>
      {sub.notes && <p className="text-xs text-gray-400 italic">{sub.notes}</p>}
    </div>
    <button
      onClick={() => onCancel(sub.id)}
      disabled={isPending && pendingDeleteId === sub.id}
      className="text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50 shrink-0"
    >
      {isPending && pendingDeleteId === sub.id ? "Cancelando..." : "Cancelar"}
    </button>
  </div>
);

/**
 * Renders the list of substitute delegations for the current user,
 * grouped into active (in effect today) and scheduled (future) sections.
 * Expired delegations are not shown.
 * @returns React component with the delegations list.
 */
export const ActiveDelegationsList = () => {
  const { data: substitutes, isLoading: isLoadingSubstitutes } =
    useGetSubstitutes();
  const { data: users = [] } = useGetUsers();
  const { mutate: deleteSubstitute, isPending } = useDeleteSubstitute();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const handleCancelClick = (substituteId: string) => {
    setPendingDeleteId(substituteId);
    setConfirmOpen(true);
  };

  /**
   * Executes the delegation cancellation after the user confirms in the modal.
   */
  const handleConfirmCancel = () => {
    if (!pendingDeleteId) return;
    setConfirmOpen(false);
    deleteSubstitute(pendingDeleteId, {
      onSuccess: () => toast.success("Delegación cancelada correctamente."),
      onError: () => toast.error("Error al cancelar la delegación."),
      onSettled: () => setPendingDeleteId(null),
    });
  };

  const userNameMap = React.useMemo(() => {
    return users.reduce<Record<string, string>>((acc, user) => {
      acc[user.id] = `${user.name} ${user.lastName}`;
      return acc;
    }, {});
  }, [users]);

  if (isLoadingSubstitutes) {
    return (
      <p className="text-sm text-gray-500 py-4">Cargando delegaciones...</p>
    );
  }

  const today = getTodayString();
  const active = (substitutes ?? []).filter(
    (s) => s.startDate <= today && s.endDate >= today,
  );
  const scheduled = (substitutes ?? []).filter((s) => s.startDate > today);

  if (active.length === 0 && scheduled.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-400">
        Sin delegaciones activas.
      </div>
    );
  }

  const cardProps = (sub: SubstituteDelegation) => ({
    sub,
    targetName: userNameMap[sub.targetUserId] ?? sub.targetUserId,
    isPending,
    pendingDeleteId,
    onCancel: handleCancelClick,
  });

  return (
    <div className="space-y-4">
      {active.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">
            Delegaciones Activas
          </h4>
          {active.map((sub) => (
            <DelegationCard key={sub.id} {...cardProps(sub)} />
          ))}
        </div>
      )}

      {scheduled.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">
            Delegaciones Programadas
          </h4>
          {scheduled.map((sub) => (
            <DelegationCard key={sub.id} {...cardProps(sub)} />
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmCancel}
        title="Cancelar delegación"
        description="¿Estás seguro de que deseas cancelar esta delegación?"
        confirmText="Cancelar delegación"
        cancelText="Volver"
        isDestructive
        warningNote="Esta acción es irreversible. El sustituto perderá acceso inmediatamente."
      />
    </div>
  );
};

/*
 * Modification History:
 * - 2026-03-25 | Juan de Dios Gastélum | Initial file creation.
 * - 2026-04-16 | Juan de Dios Gastélum | Replaced hardcoded USER_NAMES with dynamic lookup via useGetUsers.
 * - 2026-04-21 | Juan de Dios Gastélum | Added ConfirmationModal before delegation cancellation.
 * - 2026-06-06 | Juan de Dios Gastélum | Fixed timezone issue in formatDate. Separated delegations into active and scheduled sections. Expired delegations no longer shown.
 */
