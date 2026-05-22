/*This component renders a voucher review (“RefundsAcceptance”) page for a specific travel request, loading the request details from the API and letting an approver approve or deny each uploaded voucher. When it mounts, it reads the request id from the URL, calls GET /requests/{id}, and builds a UI-friendly data object by formatting the creation date and advance amount (formatDate, formatMoney), concatenating the admin’s full name, setting the origin city from the request destination, and joining all destination cities into a single string. It displays the request info as read-only fields (with the status translated to Spanish via renderStatus), and shows the vouchers in a Swiper carousel with pagination and custom “Anterior/Siguiente” buttons driven by refs; each slide uses FilePreviewer and includes “Aprobar/Denegar” actions that call PATCH /vouchers/{id}/approve or /deny and update local state immediately. It also computes totals for approved vouchers, the advance amount, and the combined total, and only enables the “Completar Comprobación” button once there are no pending vouchers; clicking it calls PATCH /requests/finished-approving-vouchers/{id}, shows a success toast, and redirects the user to the dashboard, all wrapped inside a Tutorial flow and with page-visit tracking through useApp.*/

import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getRequest, postRequest } from "../../utils/apiService";
import formatMoney from "../../utils/formatMoney";
import formatDate from "../../utils/formatDate";
import GoBack from "../../components/GoBack";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import FilePreviewer from "../../components/Refunds/FilePreviewer";
import { patchRequest } from "../../utils/apiService";
import { Tutorial } from "../../components/Tutorial";
import { PolicyAlert } from "../../components/Refunds/PolicyAlert";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { toast } from "react-toastify";
import { useApp } from "../../hooks/app/appContext";
import { ConfirmationModal } from "../../components/ui/ConfirmationModal";

interface RequestData {
  id?: string;
  admin?: string;
  id_origin_city?: string;
  destinations?: string;
  motive?: string;
  advance_money?: string | number;
  status?: string;
  requirements?: string;
  priority?: string;
  createdAt?: string;
  advance_money_str?: string;
  destination?: {
    city: string;
  };
  requests_destinations?: Array<{
    destination: {
      city: string;
    };
  }>;
  vouchers?: Array<{
    id: string;
    file_url_pdf: string;
    file_url_xml: string;
    status: string;
    class: string;
    amount: number;
    amount_mxn?: number;
    date: string;
  }>;
}

interface Dest {
  destination: {
    city: string;
  };
  arrival_date?: string;
  departure_date?: string;
}

interface PolicyPreviewViolation {
  policy_code: string;
  message: string;
  severity: "BLOCKING" | "WARNING";
  evaluated_value?: Record<string, unknown>;
  voucher_id?: string;
}

const normalizePolicyDate = (rawDate?: string): string => {
  if (!rawDate) {
    return "";
  }

  const trimmedDate = rawDate.trim();
  if (!trimmedDate) {
    return "";
  }

  // The policy engine expects a plain YYYY-MM-DD date for trip-window checks.
  return trimmedDate.includes("T") ? trimmedDate.split("T")[0] : trimmedDate;
};

const resolveVoucherPolicyDate = (voucher: Record<string, unknown>): string => {
  const candidateFields = [
    voucher.date,
    voucher.voucher_date,
    voucher.issue_date,
    voucher.createdAt,
    voucher.created_at,
  ];

  for (const candidate of candidateFields) {
    if (typeof candidate === "string") {
      const normalized = normalizePolicyDate(candidate);
      if (normalized) {
        return normalized;
      }
    }
  }

  return "";
};

const parseDateSafe = (rawDate?: string): Date | null => {
  const normalized = normalizePolicyDate(rawDate);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(`${normalized}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const buildTripWindowFallbackViolation = (
  vouchers: Array<Record<string, unknown>>,
  destinations: Dest[] = [],
): PolicyPreviewViolation | null => {
  const destinationDates = destinations
    .flatMap((dest) => [dest.arrival_date, dest.departure_date])
    .map((date) => parseDateSafe(date))
    .filter((date): date is Date => Boolean(date));

  if (destinationDates.length === 0) {
    return null;
  }

  const tripStartDate = new Date(
    Math.min(...destinationDates.map((date) => date.getTime())),
  );
  const tripEndDate = new Date(
    Math.max(...destinationDates.map((date) => date.getTime())),
  );

  const outOfWindowVoucherIds = vouchers
    .map((voucher, index) => {
      const voucherDate = parseDateSafe(resolveVoucherPolicyDate(voucher));
      if (!voucherDate) {
        return null;
      }

      const isOutOfWindow =
        voucherDate.getTime() < tripStartDate.getTime() ||
        voucherDate.getTime() > tripEndDate.getTime();

      return isOutOfWindow ? `preview-${index + 1}` : null;
    })
    .filter((id): id is string => Boolean(id));

  if (outOfWindowVoucherIds.length === 0) {
    return null;
  }

  return {
    policy_code: "VOUCHER_DATE_WITHIN_TRIP_WINDOW",
    message:
      "Comprobante fuera del periodo del viaje (validación de respaldo).",
    severity: "BLOCKING",
    evaluated_value: {
      trip_start_date: tripStartDate.toISOString().split("T")[0],
      trip_end_date: tripEndDate.toISOString().split("T")[0],
      out_of_window_voucher_ids: outOfWindowVoucherIds,
    },
  };
};

/**
 * Shows a warning toast when the API response includes email delivery warnings.
 * Otherwise, shows the normal success toast for the completed operation.
 *
 * @param response API response that may include emailWarnings.
 * @param successMessage Message shown when no email warning exists.
 * @param warningMessage Message shown when email delivery failed.
 */
const showEmailAwareToast = (
  response: unknown,
  successMessage: string,
  warningMessage: string,
) => {
  const responseData = response as { emailWarnings?: unknown };
  const emailWarnings = Array.isArray(responseData.emailWarnings)
    ? responseData.emailWarnings
    : [];

  if (emailWarnings.length > 0) {
    toast.warning(warningMessage, {
      position: "top-right",
      autoClose: 6000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
    });
    return;
  }

  toast.success(successMessage);
};

export const renderStatus = (status: string) => {
  let statusText = "";
  switch (status) {
    case "Pending Review":
      statusText = "En revisión";
      break;
    case "Denied":
      statusText = "Denegado";
      break;
    case "Cancelled":
      statusText = "Cancelado";
      break;
    case "Changes Needed":
      statusText = "Cambios necesarios";
      break;
    case "Pending Reservations":
      statusText = "Reservas pendientes";
      break;
    case "Pending Accounting Approval":
      statusText = "Contabilidad pendiente";
      break;
    case "Pending Vouchers Approval":
      statusText = "Comprobantes pendientes";
      break;
    case "In Progress":
      statusText = "En progreso";
      break;
    case "Pending Refund Approval":
      statusText = "Reembolso pendiente";
      break;
    case "Completed":
      statusText = "Completado";
      break;
    default:
      statusText = status;
  }
  return statusText;
};

const RefundsAcceptance: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RequestData>({});
  const [_loading, setLoading] = useState(true);

  const [currentIndex, setCurrentIndex] = useState(0);

  const prevRef = useRef<HTMLButtonElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);

  const { handleVisitPage, tutorial } = useApp();

  const [policyViolations, setPolicyViolations] = useState<
    PolicyPreviewViolation[]
  >([]);
  // Single modal state drives all voucher approval/denial confirmations on this page.
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    warningNote?: string;
    confirmText: string;
    isDestructive: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "Confirm",
    isDestructive: false,
    onConfirm: () => {},
  });

  const approvedVouchersTotal = (data?.vouchers ?? []).reduce(
    (
      acc: number,
      file: { status: string; amount: number; amount_mxn?: number },
    ) => {
      if (file.status !== "comprobante_aprobado") {
        return acc;
      }

      const rawAmount = file.amount_mxn ?? file.amount;
      const normalizedAmount = Number(rawAmount);
      return acc + (Number.isFinite(normalizedAmount) ? normalizedAmount : 0);
    },
    0,
  );

  /**
   * Opens the confirmation modal with the provided configuration.
   * @param config - Modal content and the callback to invoke on confirmation.
   */
  const openConfirm = (config: Omit<typeof confirmModal, "isOpen">) => {
    setConfirmModal({ ...config, isOpen: true });
  };

  /**
   * Closes the confirmation modal without executing any action.
   */
  const closeConfirm = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await getRequest(`/requests/${id}`);
        console.log("Response from API:", response);
        setData({
          ...response,
          createdAt: formatDate(response.createdAt),
          advance_money_str: formatMoney(response.advance_money),
          admin: response.admin.name + " " + response.admin.lastName,
          id_origin_city: response.destination.city,
          destinations: response.requests_destinations
            .map((dest: Dest) => dest.destination.city)
            .join(", "),
        });

        let previewViolations: PolicyPreviewViolation[] = [];
        try {

        const rawVouchers = (response.vouchers || []) as Array<
          Record<string, unknown>
        >;

        const previewPayload = {
          vouchers: rawVouchers.map((voucher: any) => ({
            class: voucher.class,
            amount: voucher.amount,
            amount_mxn: voucher.amount_mxn ?? voucher.amount,
            currency: voucher.currency || "MXN",
            date: resolveVoucherPolicyDate(voucher),
            has_xml: Boolean(voucher.file_url_xml),
            has_pdf: Boolean(voucher.file_url_pdf),
          })),
        };
        const previewRes = await postRequest(
          `/requests/${id}/vouchers-policy-preview`,
          previewPayload,
        );
        console.log("Preview policy summary:", previewRes?.policy_summary);
        if (previewRes && previewRes.policy_summary?.violations) {
          previewViolations = previewRes.policy_summary.violations;
        }

        const hasTripWindowViolation = previewViolations.some(
          (violation) =>
            violation?.policy_code === "VOUCHER_DATE_WITHIN_TRIP_WINDOW",
        );

        if (!hasTripWindowViolation) {
          const fallbackTripWindowViolation = buildTripWindowFallbackViolation(
            rawVouchers,
            response.requests_destinations,
          );

          if (fallbackTripWindowViolation) {
            previewViolations = [
              ...previewViolations,
              fallbackTripWindowViolation,
            ];
          }
        }
        } catch (previewError) {
          console.error("Error fetching preview violations:", previewError);
        }

        if (previewViolations.length > 0) {
          setPolicyViolations(previewViolations);
        } else {
          try {
            const persistedRes = await getRequest(
              `/requests/${id}/policy-violations`,
            );
            const persistedViolations = Array.isArray(persistedRes?.violations)
              ? persistedRes.violations
              : [];
            setPolicyViolations(
              persistedViolations.map((violation: any) => ({
                policy_code:
                  violation.id_policy_rule ||
                  violation.rule?.operator ||
                  "POLICY",
                message: violation.detail || "Advertencia de politica.",
                severity:
                  violation.rule?.consequence?.toUpperCase() === "WARNING"
                    ? "WARNING"
                    : "BLOCKING",
                evaluated_value: violation.rule
                  ? {
                      expense_class: violation.rule.expense_class,
                      operator: violation.rule.operator,
                      threshold_value: violation.rule.threshold_value,
                      threshold_unit: violation.rule.threshold_unit,
                    }
                  : undefined,
                voucher_id: violation.id_voucher,
              })),
            );
          } catch (persistedError) {
            console.error(
              "Error fetching persisted violations:",
              persistedError,
            );
            setPolicyViolations([]);
          }
        }
      } catch (error) {
        console.error("Error fetching request data:", error);
      } finally {
        setLoading(false);
        console.log("Data fetched successfully");
      }
    };

    fetchData();
  }, [id]);

  useEffect(() => {
    // Get the visited pages from localStorage
    const visitedPages = JSON.parse(
      localStorage.getItem("visitedPages") || "[]",
    );
    // Check if the current page is already in the visited pages
    const isPageVisited = visitedPages.includes(location.pathname);

    // If the page is not visited, set the tutorial to true
    if (!isPageVisited) {
      // setTutorial(true);
    }
    // Add the current page to the visited pages
    handleVisitPage();
  }, []);

  const labels: { key: keyof RequestData; label: string }[] = [
    { key: "id", label: "ID solicitud" },
    { key: "admin", label: "Aprobador" },
    { key: "id_origin_city", label: "Ciudad de Origen" },
    { key: "destinations", label: "Destinos" },
    { key: "motive", label: "Motivo" },
    { key: "advance_money_str", label: "Anticipo" },
    { key: "status", label: "Estado" },
    { key: "requirements", label: "Requerimientos" },
    { key: "priority", label: "Prioridad" },
    { key: "createdAt", label: "Fecha de creación" },
  ];

  const getVoucherViolations = (voucherId?: string, index?: number) => {
    if (!voucherId && typeof index !== "number") {
      return [];
    }

    const previewId =
      typeof index === "number" ? `preview-${index + 1}` : undefined;

    return policyViolations.filter((violation) => {
      const outOfWindowIds = violation.evaluated_value
        ?.out_of_window_voucher_ids as string[] | undefined;

      if (outOfWindowIds && previewId) {
        return outOfWindowIds.includes(previewId);
      }

      if (!violation.voucher_id) {
        return true;
      }

      return (
        violation.voucher_id === voucherId ||
        (previewId && violation.voucher_id === previewId)
      );
    });
  };

  const approveVoucher = async (id: string) => {
    try {
      await patchRequest(`/vouchers/${id}/approve`, {});
      const updatedVouchers = data?.vouchers?.map((voucher) => {
        if (voucher.id === id) {
          return { ...voucher, status: "comprobante_aprobado" };
        }
        return voucher;
      });
      setData({ ...data, vouchers: updatedVouchers });
    } catch (error) {
      console.error("Error approving voucher:", error);
    }
  };

  const denyVoucher = async (id: string) => {
    try {
      await patchRequest(`/vouchers/${id}/deny`, {});
      const updatedVouchers = data?.vouchers?.map((voucher) => {
        if (voucher.id === id) {
          return { ...voucher, status: "comprobante_rechazado" };
        }
        return voucher;
      });
      setData({ ...data, vouchers: updatedVouchers });
    } catch (error) {
      console.error("Error denying voucher:", error);
    }
  };

  const completeRequest = async () => {
    try {
      const response = await patchRequest(
        `/requests/finished-approving-vouchers/${id}`,
        {},
      );

      showEmailAwareToast(
        response,
        "Comprobación de solicitud completada",
        "Comprobación completada. Falló el envío de una o más notificaciones.",
      );

      setTimeout(() => {
        navigate("/dashboard");
      }, 800);
    } catch (error) {
      console.error("Error completing request:", error);
    }
  };

  return (
    <Tutorial page="refundReview" run={tutorial}>
      <div className="pb-10">
        <GoBack />
        <main className="max-w-6xl mx-auto rounded-lg shadow-lg overflow-hidden">
          <div className="px-8 py-10 flex flex-col">
            <div className="w-fit bg-[var(--blue)] text-white px-4 py-2 rounded-full mb-6">
              Información de Solicitud: <span>{id}</span>
            </div>

            <section
              className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8"
              id="request-info"
            >
              {labels.map(({ key, label }) => (
                <div key={key}>
                  <label
                    htmlFor={key}
                    className="block text-xs font-semibold text-gray-500 mb-1"
                  >
                    {label}
                  </label>

                  {key === "status" ? (
                    <input
                      id={key}
                      type="text"
                      readOnly
                      value={
                        data[key] !== undefined
                          ? String(renderStatus(data.status ?? ""))
                          : ""
                      }
                      className="w-full bg-gray-100 text-gray-800 rounded-lg px-3 py-2 border border-gray-200"
                    />
                  ) : (
                    <input
                      id={key}
                      type="text"
                      readOnly
                      value={data[key] !== undefined ? String(data[key]) : ""}
                      className="w-full bg-gray-100 text-gray-800 rounded-lg px-3 py-2 border border-gray-200"
                    />
                  )}
                </div>
              ))}
            </section>

            <div className="mb-4">
              <div
                className="bg-white p-4 rounded-lg shadow-md relative"
                id="vouchers"
              >
                <section className="mb-10">
                  <h1 className="text-2xl font-bold text-gray-800 mb-4">
                    Información importante
                  </h1>
                  <p className="text-sm text-gray-600">
                    - Se debe aprobar o denegar individualmente cada uno de los
                    comprobantes
                  </p>
                  <p className="text-sm text-gray-600">
                    - Al finalizar la aprobación de comprobantes, se debe dar
                    click en el botón "Completar Comprobación"
                  </p>
                </section>
                <h2 className="text-lg font-semibold text-gray-700 mb-4">
                  Comprobante de Solicitud {currentIndex + 1} de{" "}
                  {data?.vouchers?.length}
                </h2>
                {/* Display the existing PDF using an iframe */}
                <Swiper
                  modules={[Navigation, Pagination]}
                  spaceBetween={50}
                  slidesPerView={1}
                  pagination={{ clickable: true }}
                  onBeforeInit={(swiper: any) => {
                    if (typeof swiper.params.navigation !== "boolean") {
                      swiper.params.navigation.prevEl = prevRef.current;
                      swiper.params.navigation.nextEl = nextRef.current;
                    }
                  }}
                  onSlideChange={(swiper: any) =>
                    setCurrentIndex(swiper.activeIndex)
                  }
                >
                  {data?.vouchers?.map((file, index) => (
                    <SwiperSlide key={index}>
                      <FilePreviewer file={file} fileIndex={index} />
                      {getVoucherViolations(file.id, index).length > 0 && (
                        <section className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <MagnifyingGlassIcon className="h-6 w-6 text-orange-700" />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold text-orange-700">
                                Observaciones de políticas
                              </h3>
                              <p className="text-xs text-gray-600">
                                Revisa estas alertas antes de aprobar o denegar.
                              </p>
                            </div>
                          </div>
                          <PolicyAlert
                            violations={getVoucherViolations(file.id, index)}
                          />
                        </section>
                      )}
                      <div className="flex space-x-4 justify-end mt-6">
                        <button
                          disabled={file?.status !== "comprobante_pendiente"}
                          className={`px-4 py-2 text-white rounded-md  hover:cursor-pointer 
                              ${
                                file?.status !== "comprobante_pendiente"
                                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                  : "bg-red-600 hover:bg-red-700"
                              }`}
                          onClick={() =>
                            openConfirm({
                              title: "Denegar comprobante",
                              description:
                                "Estás rechazando este comprobante de gasto. El viajero será notificado y deberá corregirlo o eliminarlo.",
                              warningNote: "Esta acción es irreversible.",
                              confirmText: "Sí, denegar",
                              isDestructive: true,
                              onConfirm: () => denyVoucher(file?.id),
                            })
                          }
                          id="deny-button"
                        >
                          Denegar
                        </button>
                        <button
                          disabled={file?.status !== "comprobante_pendiente"}
                          className={`px-4 py-2  text-white rounded-md  hover:cursor-pointer
                                ${
                                  file?.status !== "comprobante_pendiente"
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    : "bg-green-600 hover:bg-green-700"
                                }`}
                          onClick={() =>
                            openConfirm({
                              title: "Aprobar comprobante",
                              description:
                                "Confirmas que este comprobante de gasto es válido. El monto será contabilizado para el cálculo del reembolso.",
                              warningNote: "Esta acción es irreversible.",
                              confirmText: "Sí, aprobar",
                              isDestructive: false,
                              onConfirm: () => approveVoucher(file?.id),
                            })
                          }
                          id="approve-button"
                        >
                          Aprobar
                        </button>
                      </div>
                    </SwiperSlide>
                  ))}
                </Swiper>
                <div className="flex space-x-4 absolute z-10 top-2 right-4 bg-white">
                  <button
                    ref={prevRef}
                    disabled={currentIndex === 0}
                    className={`px-4 py-2 rounded-md hover:cursor-pointer ${
                      currentIndex === 0
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-[var(--blue)] text-white hover:bg-[var(--light-blue)]"
                    }`}
                  >
                    Anterior
                  </button>
                  <button
                    disabled={
                      currentIndex === (data?.vouchers?.length ?? 0) - 1
                    }
                    ref={nextRef}
                    className={`px-4 py-2 rounded-md hover:cursor-pointer ${
                      currentIndex === (data?.vouchers?.length ?? 0) - 1
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-[var(--blue)] text-white hover:bg-[var(--light-blue)]"
                    }`}
                    id="next-voucher"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
              <section className="grid grid-cols-3 gap-5" id="refund-review">
                <div className="my-5">
                  <label
                    htmlFor={"total"}
                    className="block text-xs font-semibold text-gray-500 mb-1"
                  >
                    Total de Comprobantes
                  </label>
                  <input
                    id={"total"}
                    type="text"
                    readOnly
                    value={formatMoney(
                      approvedVouchersTotal,
                    )}
                    className="w-full bg-gray-100 text-gray-800 rounded-lg px-3 py-2 border border-gray-200"
                  />
                </div>
                <div className="my-5">
                  <label
                    htmlFor={"advance_money"}
                    className="block text-xs font-semibold text-gray-500 mb-1"
                  >
                    Anticipo
                  </label>
                  <input
                    id={"advance_money"}
                    type="text"
                    readOnly
                    value={formatMoney(Number(data?.advance_money) || 0)}
                    className="w-full bg-gray-100 text-gray-800 rounded-lg px-3 py-2 border border-gray-200"
                  />
                </div>
                <div className="my-5">
                  <label
                    htmlFor={"total"}
                    className="block text-xs font-semibold text-gray-500 mb-1"
                  >
                    Total
                  </label>
                  <input
                    id={"total"}
                    type="text"
                    readOnly
                    value={formatMoney(
                      approvedVouchersTotal +
                        (typeof data?.advance_money === "number"
                          ? data.advance_money
                          : Number(data?.advance_money) || 0),
                    )}
                    className="w-full bg-gray-100 text-gray-800 rounded-lg px-3 py-2 border border-gray-200"
                  />
                </div>
              </section>

              <div className="flex space-x-4 justify-end mt-6">
                <button
                  className={`px-4 py-2 text-white rounded-md hover:cursor-pointer 
                      ${
                        data?.vouchers?.some(
                          (file) => file.status === "comprobante_pendiente",
                        )
                          ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                          : "bg-[var(--blue)] hover:bg-[var(--dark-blue)]"
                      }`}
                  disabled={data?.vouchers?.some(
                    (file) => file.status === "comprobante_pendiente",
                  )}
                  onClick={() =>
                    openConfirm({
                      title: "Completar revisión de comprobantes",
                      description:
                        "Confirmas que todos los comprobantes han sido revisados. Se cerrará el proceso de reembolso y se generará el balance final entre el anticipo otorgado y los gastos aprobados.",
                      warningNote:
                        "Esta acción es irreversible y cierra definitivamente el proceso de reembolso para esta solicitud.",
                      confirmText: "Sí, completar revisión",
                      isDestructive: false,
                      onConfirm: completeRequest,
                    })
                  }
                  id="complete-refund"
                >
                  Completar Comprobación
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirm}
        onConfirm={() => {
          closeConfirm();
          confirmModal.onConfirm();
        }}
        title={confirmModal.title}
        description={confirmModal.description}
        warningNote={confirmModal.warningNote}
        confirmText={confirmModal.confirmText}
        isDestructive={confirmModal.isDestructive}
      />
    </Tutorial>
  );
};

export default RefundsAcceptance;

/*
Modification History:
- 2026-04-18 | Juan de Dios Gastélum Flores | Added confirmation modals for approve, deny, and complete voucher review actions.
- 2026-04-29 | Juan de Dios Gastélum Flores | Added email warning toast handling after completing voucher approval.
*/
