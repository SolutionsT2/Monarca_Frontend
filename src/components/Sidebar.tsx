/**
 * Sidebar.tsx
 *
 * Main sidebar navigation component with user info and menu options.
 * Displays user profile information and dynamically renders menu items based on permissions.
 */

// ***************** images *****************
import logo from "../assets/logo.png";

// ***************** components *****************
import SidebarOption from "./SidebarOption";

import { AuthState, Permission } from "../hooks/auth/authContext";
import Mosaic from "./Mosaic";
import { useApp } from "../hooks/app/appContext";

/**
 * Interface for Sidebar component properties.
 */
interface SidebarProps {
  user: AuthState;
  isOpen: boolean;
}
/**
 * Renders a responsive sidebar with user info and permission-based navigation.
 * Collapses into a drawer on small screens.
 * @param user Authenticated user state including permissions and profile info.
 * @param isOpen Boolean state to control mobile visibility toggle.
 */
function Sidebar({ user, isOpen }: SidebarProps) {
  const { viewMode, setViewMode } = useApp();
  const normalizedRole = (user.userRole || "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
  const isSuperAdmin = normalizedRole === "superadmin";
  const isCompanyAdmin = normalizedRole === "companyadmin";
  const isApprover =
    normalizedRole === "approver" || normalizedRole === "aprobador";

  // Determine if the user has BOTH approver and requester capabilities
  const hasApproverRole = user.userPermissions.includes("approve_request" as Permission);
  const hasRequesterRole = user.userPermissions.includes("create_request" as Permission);
  const isDualRole = hasApproverRole && hasRequesterRole;

  // Effective mode: if user isn't dual-role, always show all their options
  const isApproverMode = !isDualRole || viewMode === "approver";
  const isRequesterMode = !isDualRole || viewMode === "requester";

  return (
    <aside
      id="logo-sidebar"
      className={`fixed top-0 left-0 z-40 w-[240px] h-screen pt-24 transition-transform bg-[var(--gray)] border-r border-gray-200 
        ${isOpen ? "translate-x-0" : "-translate-x-full"} 
        lg:translate-x-0`}
      aria-label="Sidebar"
    >
      <div className="h-full px-3 pb-4 overflow-y-auto bg-[var(--gray)]">
        <div className="flex items-center bg-[var(--dark-blue)] mb-6 w-[100px] mx-auto p-3 rounded-xl">
          <img src={logo} className="invert mx-auto" alt="Monarca Logo" />
        </div>
        <div className="flex flex-col items-center justify-center mb-6 text-center px-2">
          <p className="text-[var(--blue)] font-bold truncate w-full">
            {user.userName ?? ""} {user.userLastName ?? ""}{" "}
          </p>
          <p className="text-[var(--ultra-light-blue)] text-xs font-medium uppercase tracking-wider">
            {user.userRole ?? ""}
          </p>
        </div>
        <ul className="space-y-2 font-medium">
          {/* -------- View Mode Toggle (only for dual-role users) -------- */}
          {isDualRole && (
            <li className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
                Vista actual
              </p>
              <div className="flex items-center bg-[var(--dark-blue)] rounded-xl p-1 gap-1">
                <button
                  onClick={() => setViewMode("approver")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    viewMode === "approver"
                      ? "bg-white text-[var(--dark-blue)] shadow"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Aprobador
                </button>
                <button
                  onClick={() => setViewMode("requester")}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 ${
                    viewMode === "requester"
                      ? "bg-white text-[var(--dark-blue)] shadow"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  Solicitante
                </button>
              </div>
            </li>
          )}
          {/* ----------------------------------------------------------- */}

          <SidebarOption
            label="Inicio"
            pathIcon="/assets/dashboard.png"
            link="/dashboard"
            invertIcon
          />
          {isRequesterMode && user.userPermissions.includes("create_request" as Permission) && (
            <SidebarOption
              label="Crear solicitud de viaje"
              pathIcon="/assets/crear_solicitud_de_viaje.png"
              link="/requests/create"
            />
          )}
          {isRequesterMode &&
            user.userPermissions.includes(
              "view_assigned_requests_readonly" as Permission,
            ) &&
            user.userPermissions.includes("create_request" as Permission) && (
              <SidebarOption
                label="Historial de viajes"
                pathIcon="/assets/historial_de_viajes.png"
                link="/history"
              />
            )}
          {isRequesterMode && user.userPermissions.includes("upload_vouchers" as Permission) && (
            <SidebarOption
              label="Comprobar gastos"
              pathIcon="/assets/solicitud_de_reembolso.png"
              link="/refunds"
            />
          )}
          {isRequesterMode && user.userPermissions.includes("upload_vouchers" as Permission) && (
            <SidebarOption
              label="Historial de comprobantes"
              pathIcon="/assets/historial_de_reembolsos_aprobados.png"
              link="/vouchers-history"
            />
          )}
          {isApproverMode && user.userPermissions.includes("approve_request" as Permission) && (
            <SidebarOption
              label="Viajes por aprobar"
              pathIcon="/assets/viajes_por_aprobar.png"
              link="/approvals"
            />
          )}
          {isApproverMode &&
            user.userPermissions.includes(
              "view_assigned_requests_readonly" as Permission,
            ) &&
            user.userPermissions.includes("approve_request" as Permission) && (
              <SidebarOption
                label="Historial de viajes aprobados"
                pathIcon="/assets/historial_de_viajes_aprobados.png"
                link="/history?scope=approver"
              />
            )}
          {isApproverMode && user.userPermissions.includes("approve_vouchers" as Permission) && (
            <SidebarOption
              label="Comprobantes de gastos por aprobar"
              pathIcon="/assets/comprobantes_de_gastos_por_aprobar.png"
              link="/refunds-review"
            />
          )}
          {user.userPermissions.includes("request_history" as Permission) && (
            <SidebarOption
              label="Viajes por registrar"
              pathIcon="/assets/historial_de_reembolsos_aprobados.png"
              link="/history?scope=soi-trips"
            />
          )}
          {user.userPermissions.includes("check_budgets" as Permission) && (
            <SidebarOption
              label="Reembolsos por registrar"
              pathIcon="/assets/reembolsos_por_aprobar.png"
              link="/check-refunds"
            />
          )}
          {user.userPermissions.includes(
            "submit_reservations" as Permission,
          ) && (
            <SidebarOption
              label="Viajes por reservar"
              pathIcon="/assets/viajes_por_reservar.png"
              link="/bookings"
            />
          )}
          {user.userPermissions.includes(
            "view_assigned_requests_readonly" as Permission,
          ) &&
            user.userPermissions.includes(
              "submit_reservations" as Permission,
            ) && (
              <SidebarOption
                label="Historial de viajes reservados"
                pathIcon="/assets/historial_de_viajes_reservados.png"
                link="/history?scope=travel-agent"
              />
            )}
          {user.userPermissions.includes("import_employees" as Permission) && (
            <SidebarOption
              label="Importar empleados"
              pathIcon="/assets/roles.png"
              link="/company-admin/import-employees"
            />
          )}
          {user.userPermissions.includes("check_budgets" as Permission) && (
            <SidebarOption
              label="Gestión de pólizas"
              pathIcon="/assets/policies.png"
              link="/policies"
            />
          )}
          {isSuperAdmin && (
            <SidebarOption
              label="Empresas"
              pathIcon="/assets/roles.png"
              link="/admin/companies"
            />
          )}
          {isCompanyAdmin && (
            <SidebarOption
              label="Departamentos"
              pathIcon="/assets/building.png"
              link="/admin/departments"
            />
          )}
          {isCompanyAdmin && (
            <SidebarOption
              label="Centro de costos"
              pathIcon="/assets/circle-dollar-sign.png"
              link="/admin/cost-centers"
            />
          )}
          {isCompanyAdmin && (
            <SidebarOption
              label="Cuentas contables"
              pathIcon="/assets/sheet.png"
              link="/admin/accounting-accounts"
            />
          )}
          {isCompanyAdmin && (
            <SidebarOption
              label="Cuentas bancarias"
              pathIcon="/assets/landmark.png"
              link="/admin/bank-accounts"
            />
          )}
          {isApprover && (
            <SidebarOption
              label="Delegaciones de sustitutos"
              pathIcon="/assets/roles.png"
              link="/roles"
            />
          )}
          {isCompanyAdmin && (
            <SidebarOption
              label="Matriz de autorización"
              pathIcon="/assets/matrix.png"
              link="/approval-rules"
            />
          )}
          {isCompanyAdmin && (
            <SidebarOption
              label="Políticas de reembolso"
              pathIcon="/assets/refresh-cw.png"
              link="/admin/refund-policies"
            />
          )}
          {isCompanyAdmin && (
            <SidebarOption
              label="Ver empleados"
              pathIcon="/assets/employeeWatch.png"
              link="/company-admin/view-employees"
            />
          )}
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;

/*
Modification History:

- 2026-02-26 | Santiago Arista | Added file description, JSDoc documentation, and fixed import path.
- 2026-04-09 | Fabrizio | Converted to a responsive drawer with transition effects.
- 2026-04-14 | Fabrizio | Integrated the 'Policy' option, visible only to users with 'check_budgets' permission.
- 2026-04-27 | Juan de Dios Gastélum | Added CompanyAdmin sidebar items with correct icons and isCompanyAdmin guard. Renamed roles item to Delegaciones de sustitutos.
*/
