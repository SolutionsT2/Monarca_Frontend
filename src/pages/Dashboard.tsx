/*This Dashboard component renders the app’s main home screen and shows different “Mosaic” tiles depending on the logged-in user’s permissions. When it mounts, it sets the global page title using setPageTitle(title), and it also runs the tutorial logic by checking localStorage for previously visited pages—if the dashboard hasn’t been visited before it enables the tutorial (setTutorial(true)) and records the visit with handleVisitPage. In the UI, it wraps everything in a Tutorial step (page="dashboard") and conditionally displays navigation tiles (e.g., create travel request, approvals, voucher uploads, bookings, histories, budget/refund checks) by checking authState.userPermissions from the auth context; each tile links to a specific route and uses an icon image, so the dashboard dynamically adapts to the user’s role/capabilities. */

import { useEffect } from "react";
import { useApp } from "../hooks/app/appContext";
import { Permission, useAuth } from "../hooks/auth/authContext";
import Mosaic from "../components/Mosaic";
import { Tutorial } from "../components/Tutorial";

interface DashboardProps {
  title: string;
}
/**
 * Renders the responsive grid of mosaics based on user permissions.
 * @param title Page title passed from router
 */
export const Dashboard = ({ title }: DashboardProps) => {
  const { setPageTitle } = useApp();
  const { authState } = useAuth();
  const { handleVisitPage, tutorial, setTutorial } = useApp();
  const normalizedRole = (authState.userRole || "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
  const isSuperAdmin = normalizedRole === "superadmin";
  const isCompanyAdmin = normalizedRole === "companyadmin";

  // Set the page title when the component mounts
  useEffect(() => {
    setPageTitle(title);
  }, [title, setPageTitle]);

  useEffect(() => {
    // Get the visited pages from localStorage
    const visitedPages = JSON.parse(
      localStorage.getItem("visitedPages") || "[]",
    );
    // Check if the current page is already in the visited pages
    const isPageVisited = visitedPages.includes(location.pathname);

    // If the page is not visited, set the tutorial to true
    if (!isPageVisited) {
      setTutorial(true);
    }
    // Add the current page to the visited pages
    handleVisitPage();
  }, []);

  return (
    <Tutorial page="dashboard" run={tutorial}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-16 py-10 justify-items-center">
        {authState.userPermissions.includes("create_request" as Permission) && (
          <Mosaic
            title="Crear solicitud de viaje"
            iconPath="/assets/crear_solicitud_de_viaje.png"
            link="/requests/create"
            id="create-request"
          />
        )}
        {authState.userPermissions.includes(
          "view_assigned_requests_readonly" as Permission,
        ) &&
          authState.userPermissions.includes(
            "create_request" as Permission,
          ) && (
            <Mosaic
              title="Historial de viajes"
              iconPath="/assets/historial_de_viajes.png"
              link="/history"
              id="history"
            />
          )}
        {authState.userPermissions.includes(
          "upload_vouchers" as Permission,
        ) && (
          <Mosaic
            title="Comprobar Gastos"
            iconPath="/assets/solicitud_de_reembolso.png"
            link="/refunds"
            id="upload_vouchers"
          />
        )}
        {authState.userPermissions.includes(
          "upload_vouchers" as Permission
        ) && (
          <Mosaic
            title="Historial de comprobantes"
            iconPath="/assets/historial_de_reembolsos_aprobados.png"
            link="/vouchers-history"
            id="vouchers_history"
          />
        )}
        {authState.userPermissions.includes(
          "approve_request" as Permission,
        ) && (
          <Mosaic
            title="Viajes por aprobar"
            iconPath="/assets/viajes_por_aprobar.png"
            link="/approvals"
            id="approve_request"
          />
        )}
        {authState.userPermissions.includes(
          "view_assigned_requests_readonly" as Permission,
        ) &&
          authState.userPermissions.includes(
            "approve_request" as Permission,
          ) && (
            <Mosaic
              title="Historial de viajes aprobados"
              iconPath="/assets/historial_de_viajes_aprobados.png"
              link="/history?scope=approver"
              id="approved_requests"
            />
          )}
        {authState.userPermissions.includes(
          "approve_vouchers" as Permission,
        ) && (
          <Mosaic
            title="Comprobantes de gastos por aprobar"
            iconPath="/assets/comprobantes_de_gastos_por_aprobar.png"
            link="/refunds-review"
            id="approve_vouchers"
          />
        )}
        {/* {authState.userPermissions.includes("approve_vouchers" as Permission) && (
          <Mosaic title="Reembolsos por aprobar" iconPath="/assets/reembolsos_por_aprobar.png" link=""/>
        )} */}
        {authState.userPermissions.includes("check_budgets" as Permission) && (
          <Mosaic
            title="Viajes por registrar"
            iconPath="/assets/historial_de_reembolsos_aprobados.png"
            link="/history?scope=soi-trips"
            id="check_budgets"
          />
        )}
        {authState.userPermissions.includes("check_budgets" as Permission) && (
          <Mosaic
            title="Reembolsos por registrar"
            iconPath="/assets/reembolsos_por_aprobar.png"
            link="/check-refunds"
            id="check_refunds"
          />
        )}
        {authState.userPermissions.includes(
          "submit_reservations" as Permission,
        ) && (
          <Mosaic
            title="Viajes por reservar"
            iconPath="/assets/viajes_por_reservar.png"
            link="/bookings"
            id="bookings"
          />
        )}
        {authState.userPermissions.includes("check_budgets" as Permission) && (
          <Mosaic
            title="Gestión de Pólizas"
            iconPath="/assets/policies.png"
            link="/policies"
            id="policies-card"
          />
        )}
        {/* {authState.userPermissions.includes("submit_reservations" as Permission) && (
          <Mosaic title="Formulario de ingreso de reservación" iconPath="/assets/formulario_de_ingreso_de_reservacion.png" link=""/>
        )} */}
        {authState.userPermissions.includes(
          "view_assigned_requests_readonly" as Permission,
        ) &&
          authState.userPermissions.includes(
            "submit_reservations" as Permission,
          ) && (
            <Mosaic
              title="Historial de viajes reservados"
              iconPath="/assets/historial_de_viajes_reservados.png"
              link="/history?scope=travel-agent"
              id="reserved_requests"
            />
          )}
        {isSuperAdmin && (
          <Mosaic
            title="Crear empresa"
            iconPath="/assets/roles.png"
            link="/admin/companies"
            id="tenant_management"
          />
        )}
        {authState.userPermissions.includes("import_employees" as Permission) && (
          <Mosaic
            title="Importar empleados"
            iconPath="/assets/roles.png"
            link="/company-admin/import-employees"
            id="import_employees"
          />
        )}
        {isCompanyAdmin && (
          <Mosaic
            title="Departamentos"
            iconPath="/assets/building.png"
            link="/admin/departments"
            id="tenant_departments"
          />
        )}
        {isCompanyAdmin && (
          <Mosaic
            title="Centro de costos"
            iconPath="/assets/circle-dollar-sign.png"
            link="/admin/cost-centers"
            id="tenant_cost_centers"
          />
        )}
        {isCompanyAdmin && (
          <Mosaic
            title="Cuentas contables"
            iconPath="/assets/sheet.png"
            link="/admin/accounting-accounts"
            id="tenant_accounting_accounts"
          />
        )}
        {isCompanyAdmin && (
          <Mosaic
            title="Cuentas bancarias"
            iconPath="/assets/sheet.png"
            link="/admin/bank-accounts"
            id="tenant_bank_accounts"
          />
        )}
        {isCompanyAdmin && (
          <Mosaic
            title="Delegaciones de sustitutos"
            iconPath="/assets/roles.png"
            link="/roles"
            id="substitute_delegations"
          />
        )}
        {isCompanyAdmin && (
          <Mosaic
            title="Matriz de autorización"
            iconPath="/assets/matrix.png"
            link="/approval-rules"
            id="approval_rules"
          />
        )}
        {isCompanyAdmin && (
          <Mosaic
            title="Políticas de reembolso"
            iconPath="/assets/refresh-cw.png"
            link="/admin/refund-policies"
            id="refund_policies_admin"
          />
        )}
      </div>
    </Tutorial>
  );
};

/*
Modification History:
- 2026-04-09 | Fabrizio | Refactored grid system to support 1, 2, and 4 columns depending on device width.
- 2026-04-14 | Fabrizio | Added the Policies Management mosaic for the SOI workflow.
- 2026-04-27 | Juan de Dios Gastélum | Added Delegaciones de sustitutos and Matriz de autorización mosaics for CompanyAdmin. Updated asset paths for Departamentos, Centros de costos, and Cuentas contables.
- 2026-05-14 | Added Importar empleados mosaic for users with import_employees (matches sidebar).
*/
