// ***************** images *****************
import logo from "../assets/logo.png";

// ***************** components *****************
import SidebarOption from "./SiderbarOption";

import { AuthState, Permission } from "../hooks/auth/authContext";

interface SidebarProps {
  user: AuthState;
  isOpen: boolean; // Indica si el menú está desplegado en móvil
}

function Sidebar({ user, isOpen }: SidebarProps) {
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
          <p className="text-[var(--blue)] font-bold truncate w-full">{user.userName} {user.userLastName} </p>
          <p className="text-[var(--ultra-light-blue)] text-xs font-medium uppercase tracking-wider">{user.userRole}</p>
        </div>
        <ul className="space-y-2 font-medium">
            <SidebarOption 
              label="Inicio"
              pathIcon="/assets/dashboard.png"
              link="/dashboard"
            />
            {user.userPermissions.includes("create_request" as Permission) && (
              <SidebarOption label="Crear solicitud de viaje" pathIcon="/assets/crear_solicitud_de_viaje.png" link="/requests/create"/>
            )}
            {user.userPermissions.includes("view_assigned_requests_readonly" as Permission) && user.userPermissions.includes("create_request" as Permission) && (
              <SidebarOption label="Historial de viajes" pathIcon="/assets/historial_de_viajes.png" link="/history"/>
            )}
            {user.userPermissions.includes("upload_vouchers" as Permission) && (
              <SidebarOption label="Comprobar Gastos" pathIcon="/assets/solicitud_de_reembolso.png" link="/refunds"/>
            )}
            {user.userPermissions.includes("approve_request" as Permission) && (
              <SidebarOption label="Viajes por aprobar" pathIcon="/assets/viajes_por_aprobar.png" link="/approvals"/>
            )}
            {user.userPermissions.includes("view_assigned_requests_readonly" as Permission) && user.userPermissions.includes("approve_request" as Permission) && (
              <SidebarOption label="Historial de viajes aprobados" pathIcon="/assets/historial_de_viajes_aprobados.png" link="/history"/>
            )}
            {user.userPermissions.includes("approve_vouchers" as Permission) && (
              <SidebarOption label="Comprobantes de gastos por aprobar" pathIcon="/assets/comprobantes_de_gastos_por_aprobar.png" link="/refunds-review"/>
            )}
            {user.userPermissions.includes("request_history" as Permission) && (
              <SidebarOption label="Viajes por registrar" pathIcon="/assets/historial_de_reembolsos_aprobados.png" link="/history"/>
            )}
            {user.userPermissions.includes("check_budgets" as Permission) && (
              <SidebarOption label="Reembolsos por registrar" pathIcon="/assets/reembolsos_por_aprobar.png" link="/check-refunds"/>
            )}
            {user.userPermissions.includes("submit_reservations" as Permission) && (
              <SidebarOption label="Viajes por reservar" pathIcon="/assets/viajes_por_reservar.png" link="/bookings"/>
            )}
            {/* {user.userPermissions.includes("submit_reservations" as Permission) && (
              <SidebarOption label="Formulario de ingreso de reservación" pathIcon="/assets/formulario_de_ingreso_de_reservacion.png" link=""/>
            )} */}
            {user.userPermissions.includes("view_assigned_requests_readonly" as Permission) && user.userPermissions.includes("submit_reservations" as Permission) && (
              <SidebarOption label="Historial de viajes reservados" pathIcon="/assets/historial_de_viajes_reservados.png" link="/history"/>
            )}
        </ul>
      </div>
    </aside>
  );
}

export default Sidebar;