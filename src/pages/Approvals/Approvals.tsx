/**
 * File: Approvals.tsx
 * Description: This file contains the Approvals page component. It is responsible for
 * displaying a list of travel requests that require approval. It fetches data from the API,
 * formats the status badges, handles the tutorial walkthrough logic, and renders the
 * data in a table format.
 */

import React, { useCallback, useEffect, useState } from "react";
import Table from "../../components/Approvals/Table";
import { getRequest } from "../../utils/apiService";
import RefreshButton from "../../components/RefreshButton";
import formatDate from "../../utils/formatDate";
import GoBack from "../../components/GoBack";
import { Tutorial } from "../../components/Tutorial";
import { useLocation } from "react-router-dom";
import { useApp } from "../../hooks/app/appContext";

const COLUMNS = [
  { key: "status", header: "Estado" },
  { key: "title", header: "Título" },
  { key: "motive", header: "Motivo" },
  { key: "departureDate", header: "Fecha Salida" },
  { key: "country", header: "Lugar de Salida" },
];

/**
 * Renders the visual badge for a specific request status based on the API response.
 * It maps the status string to a specific text and Tailwind CSS color class.
 *
 * @param status - The raw status string received from the backend.
 * @returns A JSX element containing the styled status badge.
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
    <span className={`text-xs p-1 rounded-sm ${styles}`}>{statusText}</span>
  );
};

/**
 * Main component for the Approvals page.
 * Fetches pending travel requests, formats the data for the table, and handles
 * the page-specific tutorial logic using localStorage.
 *
 * @returns The rendered Approvals page structure.
 */
export const Approvals: React.FC = () => {
  const [dataWithActions, setDataWithActions] = useState([]);
  const location = useLocation();
  const { handleVisitPage, tutorial, setTutorial } = useApp();

  const fetchTravelRecords = useCallback(async () => {
    try {
      const response = await getRequest("/requests/to-approve");
      setDataWithActions(
        response.map((trip: any) => ({
          ...trip,
          status: renderStatus(trip.status),
          country: trip.destination.city,
          departureDate: formatDate(
            trip.requests_destinations.sort(
              (a: any, b: any) => a.destination_order - b.destination_order,
            )[0].departure_date,
          ),
        })),
      );
    } catch (error) {
      console.error("Error fetching travel records:", error);
    }
  }, []);

  useEffect(() => {
    fetchTravelRecords();
  }, [fetchTravelRecords]);

  // Handle tutorial visibility based on visited pages history
  useEffect(() => {
    // Retrieve visited pages from local storage to prevent repeated tutorials
    const visitedPages = JSON.parse(
      localStorage.getItem("visitedPages") || "[]",
    );
    const isPageVisited = visitedPages.includes(location.pathname);

    if (!isPageVisited) {
      setTutorial(true);
    }

    // Register the current page as visited on unmount/update
    return () => handleVisitPage();
  }, []);

  return (
    <>
      <Tutorial page="approvals" run={tutorial}>
        <GoBack />
        <div className="flex-1 p-6 bg-[#eaeced] rounded-lg shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-[var(--blue)]">
              Viajes por Aprobar
            </h2>
            <RefreshButton onClick={fetchTravelRecords} />
          </div>

          <div id="list_requests">
            <Table
              columns={COLUMNS}
              data={dataWithActions}
              itemsPerPage={5}
              link={"/requests"}
              linkState={{ from: "approvals" }}
            />
          </div>
        </div>
      </Tutorial>
    </>
  );
};

export default Approvals;

/*
Modification History:

- 2025-05-20 | Fabrizio Barrios | Refactored code to meet naming conventions and added documentation.

*/
