/*
 * Historial.tsx - Travel history page component that displays a list of travel records
 * with minimal data: ID, trip title, travel date, destination, and request date.
 */

import Table from "../../components/Refunds/Table";
import { useState, useEffect, useCallback } from "react";
import { getRequest } from "../../utils/apiService";
import formatDate from "../../utils/formatDate";
import { Permission, useAuth } from "../../hooks/auth/authContext";
import RefreshButton from "../../components/RefreshButton";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../../components/Refunds/Button";
import GoBack from "../../components/GoBack";
import { Tutorial } from "../../components/Tutorial";
import { useApp } from "../../hooks/app/appContext";
import { toast } from "react-toastify";

/**
 * Renders a styled status badge based on the request status.
 * @param {string} status - The current status of the travel request.
 * @returns {JSX.Element} A styled span element with the translated status text.
 */
const renderStatus = (status: string) => {
  let statusText = "";
  let styles = "";
  switch (status) {
    case "Pending Review":
      statusText = "En revisión";
      styles = "text-[#55447a] bg-[#bea8ef]";
      break;
    case "Denied":
      statusText = "Denegado";
      styles = "text-[#680909] bg-[#eca6a6]";
      break;
    case "Cancelled":
      statusText = "Cancelado";
      styles = "text-[#680909] bg-[#eca6a6]";
      break;
    case "Changes Needed":
      statusText = "Cambios necesarios";
      styles = "text-[#755619] bg-[#f1dbb1]";
      break;
    case "Pending Reservations":
      statusText = "Reservas pendientes";
      styles = "text-[#8c5308] bg-[#f1c180]";
      break;
    case "Pending Accounting Approval":
      statusText = "Contabilidad pendiente";
      styles = "text-[var(--dark-blue)] bg-[#99b5e3]";
      break;
    case "Pending Vouchers Approval":
      statusText = "Comprobantes pendientes";
      styles = "text-[var(--dark-blue)] bg-[#c6c4fb]";
      break;
    case "In Progress":
      statusText = "En progreso";
      styles = "text-[var(--dark-blue)] bg-[#b7f1f1]";
      break;
    case "Pending Refund Approval": 
      statusText = "Reembolso pendiente";
      styles = "text-[#575107] bg-[#f0eaa5]";
      break;
    case "Completed": 
      statusText = "Completado";
      styles = "text-[#24390d] bg-[#c7e6ab]";
      break;
    default:
      statusText = status;
      styles = "text-white bg-[#6c757d]";
    }
    return (
      <span className={`text-[10px] sm:text-xs p-1 rounded-sm whitespace-nowrap ${styles}`}>
        {statusText}
      </span>
    )
}

/**
 * Historial component - Displays a paginated table of travel
 * history records. Fetches data based on user permissions and
 * renders status, dates, and action buttons for each record.
 * @returns {JSX.Element} The travel history page layout.
 */
const TRAVEL_AGENT_HISTORY_PAGE_SIZE = 5;

export const Historial = () => {
  const [dataWithActions, setDataWithActions] = useState([]);
  const [travelAgentTotal, setTravelAgentTotal] = useState(0);
  const [travelAgentPage, setTravelAgentPage] = useState(1);
  const [travelAgentLoading, setTravelAgentLoading] = useState(false);
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { handleVisitPage, tutorial, setTutorial } = useApp();
  const scope = searchParams.get("scope");
  
  const isApproverHistoryView =
    scope === "approver" ||
    (authState.userPermissions.includes("approve_request" as Permission) &&
      authState.userPermissions.includes(
        "view_assigned_requests_readonly" as Permission
      ) &&
      !authState.userPermissions.includes("create_request" as Permission));
  const isSoiTripsToRegisterView =
    scope === "soi-trips" ||
    (authState.userPermissions.includes("check_budgets" as Permission) &&
      !authState.userPermissions.includes("create_request" as Permission) &&
      !isApproverHistoryView);
  const isTravelAgentReservedHistoryView =
    scope === "travel-agent" ||
    (authState.userPermissions.includes("submit_reservations" as Permission) &&
      authState.userPermissions.includes("view_assigned_requests_readonly" as Permission) &&
      !authState.userPermissions.includes("create_request" as Permission) &&
      !isApproverHistoryView);
  const pageTitle = isSoiTripsToRegisterView
    ? "Viajes por registrar"
    : isApproverHistoryView
      ? "Historial"
      : isTravelAgentReservedHistoryView
        ? "Historial"
        : "Historial de viajes";

  useEffect(() => {
    setTravelAgentPage(1);
  }, [scope]);

  const mapRecordToRow = useCallback(
    (record: any, index: number) => ({
      ...record,
      status: renderStatus(record.status),
      createdAt: formatDate(record.createdAt),
      country: record.destination.city,
      departureDate: formatDate(
        record.requests_destinations.sort(
          (a: any, b: any) => a.destination_order - b.destination_order
        )[0].departure_date
      ),
      index,
      action: (
        <Button
          className="bg-[var(--white)] text-[var(--blue)] px-2 py-1 text-xs sm:text-sm rounded-sm hover:bg-gray-100 transition-colors"
          label="Ver detalles"
          id={`details-${record.id}`}
          driver-id="details"
          onClickFunction={() => {
            navigate(`/requests/${record.id}`);
          }}
        />
      ),
    }),
    [navigate]
  );

  useEffect(() => {
    if (!isTravelAgentReservedHistoryView) return;

    const fetchTravelAgentHistoryPage = async () => {
      setTravelAgentLoading(true);
      try {
        const res = await getRequest("/requests/travel-agent/history", {
          page: travelAgentPage,
          limit: TRAVEL_AGENT_HISTORY_PAGE_SIZE,
        });
        const list = res?.data ?? [];
        const total = typeof res?.total === "number" ? res.total : 0;
        setTravelAgentTotal(total);
        setDataWithActions(
          list.map((record: any, index: number) =>
            mapRecordToRow(record, index)
          )
        );
      } catch (error) {
        console.error("Error fetching travel agent history:", error);
        toast.error("Error al obtener el historial de viajes.");
        setDataWithActions([]);
        setTravelAgentTotal(0);
      } finally {
        setTravelAgentLoading(false);
      }
    };

    fetchTravelAgentHistoryPage();
  }, [
    isTravelAgentReservedHistoryView,
    travelAgentPage,
    authState.userId,
    mapRecordToRow,
  ]);

  useEffect(() => {
    if (isTravelAgentReservedHistoryView) return;

    const fetchTravelRecords = async () => {
      try {
        const endpoint = authState.userPermissions.includes(
          "create_request" as Permission
        )
          ? "/requests/user"
          : authState.userPermissions.includes("check_budgets" as Permission)
            ? "/requests/to-approve-SOI"
            : "/requests/all";
        let response = await getRequest(endpoint);
        if (
          authState.userPermissions.includes("approve_request" as Permission)
        ) {
          response = response.filter(
            (record: any) =>
              !["Pending Review", "Denied", "Cancelled"].includes(
                record.status
              ) && record.id_admin === authState.userId
          );
        }
        if (
          authState.userPermissions.includes(
            "submit_reservations" as Permission
          )
        ) {
          const travelAgentsIds = response
            .map((request: any) =>
              request.travel_agency.users.map((user: any) => user.id)
            )
            .flat();
          response = response.filter(
            (record: any) =>
              ![
                "Pending Review",
                "Denied",
                "Cancelled",
                "Changes Needed",
                "Pending Accounting Approval",
                "Pending Reservations",
              ].includes(record.status) &&
              travelAgentsIds.includes(authState.userId)
          );
        }
        if (
          authState.userPermissions.includes("check_budgets" as Permission)
        ) {
          response = response.filter(
            (record: any) =>
              ["Pending Accounting Approval"].includes(record.status) &&
              record.id_SOI === authState.userId
          );
        }
        setDataWithActions(
          response?.map((record: any, index: number) =>
            mapRecordToRow(record, index)
          )
        );
      } catch (error) {
        console.error("Error fetching travel records:", error);
        toast.error("Error al obtener el historial de viajes.");
      }
    };

    fetchTravelRecords();
  }, [isTravelAgentReservedHistoryView, authState.userId, mapRecordToRow]);

  useEffect(() => {
      // Get the visited pages from localStorage
      const visitedPages = JSON.parse(localStorage.getItem("visitedPages") || "[]");
      // Check if the current page is already in the visited pages
      const isPageVisited = visitedPages.includes(location.pathname);
  
      // If the page is not visited, set the tutorial to true
      if (!isPageVisited) {
        setTutorial(true);
      }
      // Add the current page to the visited pages
      return () => handleVisitPage();
    }, []);

  // Columns schema for travel history table
  const COLUMNS_SCHEMA = [
    { key: "status", header: "Estado" },
    { key: "title", header: "Viaje" },
    { key: "motive", header: "Motivo" },
    { key: "departureDate", header: "Fecha del viaje" },
    { key: "country", header: "Lugar de Salida" },
    { key: "createdAt", header: "Fecha de solicitud" },
    { key: "action", header: "Detalles" },
  ];

  return (
    <>
    <Tutorial page="history" run={tutorial}>
      <div className="flex-1 max-w-full">
        <GoBack />
        <div className="p-4 sm:p-6 bg-[#eaeced] rounded-lg shadow-xl overflow-hidden">
          <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl sm:text-2xl font-bold text-[#0a2c6d]">
                {pageTitle}
              </h2>
              <RefreshButton />
          </div>

          {/* Travel history table component */}
          <div id="list_requests">
            {isTravelAgentReservedHistoryView && travelAgentLoading && (
              <p className="text-sm text-[#0a2c6d] mb-2" aria-live="polite">
                Cargando historial…
              </p>
            )}
            <Table
              columns={COLUMNS_SCHEMA}
              data={dataWithActions}
              itemsPerPage={
                isTravelAgentReservedHistoryView
                  ? TRAVEL_AGENT_HISTORY_PAGE_SIZE
                  : 5
              }
              serverPagination={
                isTravelAgentReservedHistoryView
                  ? {
                      totalItems: travelAgentTotal,
                      currentPage: travelAgentPage,
                      onPageChange: setTravelAgentPage,
                      isLoading: travelAgentLoading,
                    }
                  : undefined
              }
            />
          </div>
          <p className="block sm:hidden text-center text-gray-500 text-[10px] mt-2 italic">
            Desliza hacia los lados para ver toda la información
          </p>
        </div>
      </div>
    </Tutorial>
    </>
  );
};

export default Historial;

/*
 * Modification History:
 *
 * - 2026-02-26 | Diego Flores| Standardized documentation,error handling, and constant naming conventions.
 * - 2026-04-09 | Fabrizio | Cleaned up container structure to support native table scrolling and consistent layout.
 */
