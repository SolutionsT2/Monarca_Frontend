/**
 * TravelRequestForm.tsx
 *
 * Form component for creating and updating travel requests.
 * Handles multi-destination travel requests with validation, submission, and update capabilities.
 */

import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { TextArea } from "../ui/TextArea";
import Switch from "../ui/Switch";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import {
  Control,
  Controller,
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
  useFieldArray,
  useForm,
  useWatch,
} from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Select from "../ui/Select";
import FieldError from "../ui/FieldError";
import { useCreateTravelRequest } from "../../hooks/requests/useCreateRequest";
import { useUpdateTravelRequest } from "../../hooks/requests/useUpdateRequest";
import { useDestinations } from "../../hooks/destinations/useDestinations";
import { Destination } from "../../types/destinations";
import { CreateRequest } from "../../types/requests";
import GoBack from "../GoBack";
import { ConfirmationModal } from "../ui/ConfirmationModal";
import {
  useEffect,
  useMemo,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import formatMoney from "../../utils/formatMoney";
import { useExchangeRate } from "../../hooks/exchange-rate/useExchangeRate";

type Option = { id: number | string; name: string };

const priorityOptions: Option[] = [
  { id: "alta", name: "Alta" },
  { id: "media", name: "Media" },
  { id: "baja", name: "Baja" },
];

const currencyCodes: string[] = ["MXN", "USD", "EUR", "JPY", "CNY"];

const todayInputDate = () => dayjs().format("YYYY-MM-DD");

const ORIGIN_DISPLAY_NAME = "Origen";

/** Etiqueta del campo de salida: mantiene "origen" en minúscula solo en el placeholder. */
const originDepartureLabel = (name: string) =>
  name === ORIGIN_DISPLAY_NAME ? "origen" : name;

const minArrivalInputDate = (departureDate?: string) => {
  const today = todayInputDate();
  if (!departureDate) return today;
  const departure = dayjs(departureDate).format("YYYY-MM-DD");
  return dayjs(departure).isBefore(dayjs(today), "day") ? today : departure;
};

/** Bloquea escritura manual; la fecha se elige solo con el calendario nativo. */
const preventDateTypingProps = {
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
    const navigationKeys = ["Tab", "Escape", "Shift", "Enter"];
    if (
      navigationKeys.includes(e.key) ||
      e.key.startsWith("Arrow") ||
      e.ctrlKey ||
      e.metaKey
    ) {
      return;
    }
    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
    }
  },
  onPaste: (e: ClipboardEvent<HTMLInputElement>) => e.preventDefault(),
  className: "cursor-pointer",
} as const;

const buildDestinationSchema = (blockPastDates: boolean) =>
  z
    .object({
      id_destination: z.string().nullable(),
      id_airport: z.string().nullable().optional(),
      arrival_date: z
        .string()
        .nonempty({ message: "Selecciona fecha de llegada" }),
      departure_date: z
        .string()
        .nonempty({ message: "Selecciona fecha de salida" }),
      stay_days: z.number().int(),
      is_hotel_required: z.boolean(),
      is_plane_required: z.boolean(),
      details: z.string().optional(),
    })
    .superRefine((value, ctx) => {
      if (value.is_plane_required && !value.id_airport) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["id_airport"],
          message: "Selecciona un aeropuerto para el tramo con vuelo",
        });
      }

      if (!value.is_plane_required && value.id_airport) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["id_airport"],
          message: "El aeropuerto debe omitirse cuando no se requiere vuelo",
        });
      }

      const today = dayjs().startOf("day");

      if (blockPastDates) {
        if (
          value.departure_date &&
          dayjs(value.departure_date).startOf("day").isBefore(today)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["departure_date"],
            message: "La fecha de salida no puede ser anterior a hoy",
          });
        }

        if (
          value.arrival_date &&
          dayjs(value.arrival_date).startOf("day").isBefore(today)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["arrival_date"],
            message: "La fecha no puede ser anterior a hoy",
          });
        }
      }

      if (
        value.arrival_date &&
        value.departure_date &&
        dayjs(value.arrival_date)
          .startOf("day")
          .isBefore(dayjs(value.departure_date).startOf("day"))
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["arrival_date"],
          message:
            "La fecha de llegada debe ser igual o posterior a la de salida",
        });
      }
    });

const buildFormSchema = (blockPastDates: boolean) =>
  z.object({
    id_origin_city: z.string().nullable(),
    id_origin_airport: z.string().nullable().optional(),
    motive: z.string().nonempty({ message: "Escribe el motivo del viaje" }),
    title: z.string().nonempty({ message: "Escribe el título del viaje" }),
    priority: z.enum(["alta", "media", "baja"]),
    requirements: z.string().optional(),
    advance_currency: z.enum([...currencyCodes] as [string, ...string[]], {
      message: "Selecciona una divisa válida",
    }),
    advance_money: z
      .number()
      .int()
      .nonnegative({ message: "El dinero adelantado debe ser positivo" }),
    requests_destinations: z
      .array(buildDestinationSchema(blockPastDates))
      .min(1, "Al menos un destino"),
  });

type RawFormValues = z.infer<ReturnType<typeof buildFormSchema>>;

interface TravelRequestFormProps {
  initialData?: CreateRequest;
  requestId?: string;
}

interface DestinationFieldsProps {
  idx: number;
  control: Control<RawFormValues>;
  register: UseFormRegister<RawFormValues>;
  destinationOptions: { id: string | number; name: string }[];
  destinations: Destination[];
  errors: FieldErrors<RawFormValues>["requests_destinations"];
  remove: (index: number) => void;
  setValue: UseFormSetValue<RawFormValues>;
  isLoadingDestinations: boolean;
  legOriginName: string;
  onArrivalDateChange: (date: string) => void;
  isLast: boolean;
  isRoundTrip: boolean;
  originName: string;
  blockPastDates: boolean;
}

function DestinationFields({
  idx,
  control,
  register,
  destinationOptions,
  destinations,
  errors,
  remove,
  setValue,
  isLoadingDestinations,
  legOriginName,
  onArrivalDateChange,
  isLast,
  isRoundTrip,
  originName,
  blockPastDates,
}: DestinationFieldsProps) {
  const arrivalDate = useWatch({
    control,
    name: `requests_destinations.${idx}.arrival_date`,
  });

  const departureDate = useWatch({
    control,
    name: `requests_destinations.${idx}.departure_date`,
  });

  const destinationId = useWatch({
    control,
    name: `requests_destinations.${idx}.id_destination`,
  });

  const isPlaneRequired = useWatch({
    control,
    name: `requests_destinations.${idx}.is_plane_required`,
  });

  const hideArrival = isLast && !isRoundTrip && isPlaneRequired;

  const currentDestination = destinations.find((d) => d.id === destinationId);
  const destinationName = currentDestination
    ? `${currentDestination.city}, ${currentDestination.country}`
    : "...";

  const airportOptions = (currentDestination?.airports || []).map(
    (airport) => ({
      id: airport.id,
      name: `${airport.iata_code} - ${airport.name}${airport.is_primary ? " (Principal)" : ""}`,
    }),
  );

  const stayDays =
    arrivalDate && departureDate
      ? dayjs(arrivalDate).diff(dayjs(departureDate), "day")
      : 0;

  useEffect(() => {
    setValue(`requests_destinations.${idx}.stay_days`, stayDays);
  }, [arrivalDate, departureDate, idx, setValue, stayDays]);

  useEffect(() => {
    if (hideArrival && departureDate) {
      setValue(`requests_destinations.${idx}.arrival_date`, departureDate);
    }
  }, [hideArrival, departureDate, idx, setValue]);

  const destinationErrors = errors?.[idx];
  const minDepartureDate =
    blockPastDates && idx === 0 ? todayInputDate() : undefined;
  const minArrivalDate = blockPastDates
    ? minArrivalInputDate(departureDate)
    : departureDate
      ? dayjs(departureDate).format("YYYY-MM-DD")
      : undefined;

  return (
    <div className="rounded-md p-4 mb-6 space-y-4 bg-white shadow-sm">
      <div className="flex justify-between items-center">
        <span className="font-medium">
          Tramo #{idx + 1}: {legOriginName} → {destinationName}
        </span>
        {idx > 0 && (
          <Button type="button" onClick={() => remove(idx)}>
            Quitar
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`destination-${idx}`}
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            Destino
          </label>
          <Controller
            control={control}
            name={`requests_destinations.${idx}.id_destination`}
            render={({ field }) => (
              <Select
                id={`destination-${idx}`}
                options={destinationOptions}
                value={
                  field.value
                    ? destinationOptions.find((o) => o.id === field.value)
                    : null
                }
                onChange={(opt) => {
                  field.onChange(opt.id);
                  setValue(`requests_destinations.${idx}.id_airport`, null);
                }}
                isLoading={isLoadingDestinations}
                placeholder="Selecciona destino"
              />
            )}
          />
          <FieldError msg={destinationErrors?.id_destination?.message} />
        </div>

        <div>
          <label
            htmlFor={`airport-${idx}`}
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            Aeropuerto
          </label>
          <Controller
            control={control}
            name={`requests_destinations.${idx}.id_airport`}
            render={({ field }) => (
              <Select
                id={`airport-${idx}`}
                options={airportOptions}
                value={
                  field.value
                    ? airportOptions.find((o) => o.id === field.value)
                    : null
                }
                onChange={(opt) => field.onChange(opt.id)}
                isDisabled={!destinationId || !isPlaneRequired}
                placeholder={
                  !destinationId
                    ? "Selecciona destino primero"
                    : isPlaneRequired
                      ? "Selecciona aeropuerto"
                      : "No aplica sin vuelo"
                }
              />
            )}
          />
          <FieldError msg={destinationErrors?.id_airport?.message} />
        </div>

        <div>
          <label
            htmlFor={`details-${idx}`}
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            Detalles{" "}
            <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <Input
            id={`details-${idx}`}
            {...register(`requests_destinations.${idx}.details`)}
          />
          <FieldError msg={destinationErrors?.details?.message} />
        </div>

        <div>
          <label
            htmlFor={`departure-${idx}`}
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            Salida de {originDepartureLabel(legOriginName)}
          </label>
          <Controller
            control={control}
            name={`requests_destinations.${idx}.departure_date`}
            render={({ field }) => (
              <Input
                id={`departure-${idx}`}
                type="date"
                min={minDepartureDate}
                value={
                  field.value ? dayjs(field.value).format("YYYY-MM-DD") : ""
                }
                onChange={(e) => field.onChange(e.target.value)}
                {...(idx === 0 ? preventDateTypingProps : {})}
                className={
                  idx > 0
                    ? "bg-gray-100 cursor-not-allowed text-gray-500"
                    : preventDateTypingProps.className
                }
              />
            )}
          />
          {idx > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              Fecha fijada por la llegada del tramo anterior.
            </p>
          )}
          <FieldError msg={destinationErrors?.departure_date?.message} />
        </div>

        {!hideArrival && (
          <div>
            <label
              htmlFor={`arrival-${idx}`}
              className="block mb-2 text-sm font-medium text-gray-900"
            >
              {isLast
                ? isRoundTrip
                  ? `Fecha de regreso a ${originName}`
                  : `Llegada a ${destinationName}`
                : `Salida de ${destinationName}`}
            </label>
            <Controller
              control={control}
              name={`requests_destinations.${idx}.arrival_date`}
              render={({ field }) => (
                <Input
                  id={`arrival-${idx}`}
                  type="date"
                  min={minArrivalDate}
                  value={
                    field.value ? dayjs(field.value).format("YYYY-MM-DD") : ""
                  }
                  onChange={(e) => {
                    field.onChange(e.target.value);
                    onArrivalDateChange(e.target.value);
                  }}
                  {...preventDateTypingProps}
                />
              )}
            />
            <FieldError msg={destinationErrors?.arrival_date?.message} />
          </div>
        )}

        {!hideArrival && (
          <div>
            <label
              htmlFor={`stay-days-${idx}`}
              className="block mb-2 text-sm font-medium text-gray-900"
            >
              No. días estancia
            </label>
            <Input
              id={`stay-days-${idx}`}
              type="number"
              value={stayDays}
              readOnly
            />
          </div>
        )}

        <div>
          <label
            htmlFor={`hotel-${idx}`}
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            ¿Necesita hotel?
          </label>
          <Controller
            control={control}
            name={`requests_destinations.${idx}.is_hotel_required`}
            render={({ field }) => (
              <Switch
                id={`hotel-${idx}`}
                checked={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div>
          <label
            htmlFor={`plane-${idx}`}
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            ¿Necesita vuelo?
          </label>
          <Controller
            control={control}
            name={`requests_destinations.${idx}.is_plane_required`}
            render={({ field }) => (
              <Switch
                id={`plane-${idx}`}
                checked={field.value}
                onChange={(checked) => {
                  field.onChange(checked);
                  if (!checked) {
                    setValue(`requests_destinations.${idx}.id_airport`, null);
                  }
                }}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
}

function TravelRequestForm({ initialData, requestId }: TravelRequestFormProps) {
  const navigate = useNavigate();
  const {
    destinations,
    destinationOptions,
    isLoading: isLoadingDestinations,
  } = useDestinations();
  const { createTravelRequestMutation, isPending: isCreating } =
    useCreateTravelRequest();
  const { updateTravelRequestMutation, isPending: isUpdating } =
    useUpdateTravelRequest();

  const isEditing = !!requestId;
  const isPending = isEditing ? isUpdating : isCreating;
  const blockPastDates = !isEditing;
  const formSchema = useMemo(
    () => buildFormSchema(blockPastDates),
    [blockPastDates],
  );

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<RawFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          advance_currency: "MXN",
        }
      : {
          id_origin_city: null,
          id_origin_airport: null,
          motive: "",
          title: "",
          priority: "media",
          advance_currency: "MXN",
          advance_money: 0,
          requirements: "",
          requests_destinations: [
            {
              id_destination: null,
              id_airport: null,
              arrival_date: "",
              departure_date: "",
              stay_days: 1,
              is_hotel_required: true,
              is_plane_required: true,
              details: "",
            },
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "requests_destinations",
  });

  const originCityId = useWatch({
    control,
    name: "id_origin_city",
  });

  const advanceCurrency = useWatch({
    control,
    name: "advance_currency",
  });

  const advanceMoney = useWatch({
    control,
    name: "advance_money",
  });

  const currencySelectOptions = useMemo<Option[]>(
    () => currencyCodes.map((code) => ({ id: code, name: code })),
    [],
  );

  const normalizedAdvanceMoney = Number.isFinite(advanceMoney)
    ? advanceMoney
    : 0;

  const exchangeRateDate = useMemo(() => dayjs().format("YYYY-MM-DD"), []);
  const shouldFetchRate =
    !!advanceCurrency &&
    advanceCurrency !== "MXN" &&
    normalizedAdvanceMoney > 0;
  const {
    data: exchangeRate,
    isLoading: isRateLoading,
    error: exchangeRateError,
  } = useExchangeRate(
    exchangeRateDate,
    advanceCurrency || "MXN",
    shouldFetchRate,
  );

  const advanceMoneyMxn = useMemo(() => {
    if (advanceCurrency === "MXN") {
      return normalizedAdvanceMoney;
    }
    if (normalizedAdvanceMoney === 0) {
      return 0;
    }
    if (!exchangeRate?.rate) {
      return null;
    }
    return Number((normalizedAdvanceMoney * exchangeRate.rate).toFixed(2));
  }, [advanceCurrency, normalizedAdvanceMoney, exchangeRate?.rate]);

  const originAirportOptions =
    destinations
      .find((d) => d.id === originCityId)
      ?.airports?.map((airport) => ({
        id: airport.id,
        name: `${airport.iata_code} - ${airport.name}${airport.is_primary ? " (Principal)" : ""}`,
      })) || [];

  const getDestinationName = (id: string | null | undefined): string => {
    const d = destinations.find((dest) => dest.id === id);
    return d ? `${d.city}, ${d.country}` : "";
  };

  const [isRoundTrip, setIsRoundTrip] = useState(false);

  const watchedDestinations = useWatch({
    control,
    name: "requests_destinations",
  });

  // Holds validated form data between the validation step and the user's confirmation.
  const [pendingFormData, setPendingFormData] = useState<RawFormValues | null>(
    null,
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  /**
   * Validates the form data and opens the confirmation modal.
   * The actual API call is deferred to submitConfirmed.
   * @param data - Raw validated form values from React Hook Form.
   */
  const onSubmit = (data: RawFormValues) => {
    if (!data.id_origin_city) {
      toast.error("Selecciona una ciudad de origen");
      return;
    }

    if (data.advance_currency !== "MXN" && data.advance_money > 0) {
      if (isRateLoading) {
        toast.info("Cargando tipo de cambio...");
        return;
      }
      if (!exchangeRate?.rate) {
        toast.error("No se pudo obtener el tipo de cambio a MXN");
        return;
      }
    }

    const hasInvalidStay = data.requests_destinations.some((d, idx, arr) => {
      const isLastDest = idx === arr.length - 1;
      if (isLastDest && d.is_plane_required && !isRoundTrip) return false;
      const diff = dayjs(d.arrival_date).diff(dayjs(d.departure_date), "day");
      return diff <= 0;
    });

    if (hasInvalidStay) {
      toast.error("Los días de estancia deben ser positivos", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    // Origin and destination cities must be different.
    const hasDuplicateCity = data.requests_destinations.some(
      (d) => d.id_destination === data.id_origin_city,
    );

    if (hasDuplicateCity) {
      toast.error(
        "La ciudad de destino no puede ser igual a la ciudad de origen",
        {
          position: "top-right",
          autoClose: 4000,
        },
      );
      return;
    }

    // Departure of leg N must not be before arrival of leg N-1.
    for (let i = 1; i < data.requests_destinations.length; i++) {
      const prevArrival = data.requests_destinations[i - 1]?.arrival_date ?? "";
      const currDeparture = data.requests_destinations[i]?.departure_date ?? "";
      if (dayjs(currDeparture).diff(dayjs(prevArrival), "day") < 0) {
        toast.error(
          `La salida del tramo ${i + 1} no puede ser antes de la llegada del tramo ${i}`,
          { position: "top-right", autoClose: 4000 },
        );
        return;
      }
    }

    setPendingFormData(data);
    setShowConfirmModal(true);
  };

  /**
   * Executes the travel request create or update API call after user confirmation.
   * Reads from pendingFormData set during the onSubmit validation phase.
   */
  const submitConfirmed = async () => {
    if (!pendingFormData) return;
    setShowConfirmModal(false);
    const data = pendingFormData;

    const requests_destinations = data.requests_destinations.map(
      (d, idx, arr) => {
        if (!d.id_destination) {
          throw new Error("Selecciona un destino");
        }

        return {
          id_destination: d.id_destination,
          ...(d.is_plane_required && d.id_airport
            ? { id_airport: d.id_airport }
            : {}),
          destination_order: idx + 1,
          stay_days: d.stay_days,
          arrival_date: dayjs(d.arrival_date).toISOString(),
          departure_date: dayjs(d.departure_date).toISOString(),
          is_hotel_required: d.is_hotel_required,
          is_plane_required: d.is_plane_required,
          is_last_destination: idx === arr.length - 1,
          details: d.details,
        };
      },
    );

    const payload = {
      id_origin_city: data.id_origin_city!,
      id_origin_airport: data.id_origin_airport || undefined,
      title: data.title,
      motive: data.motive,
      requirements: data.requirements || "",
      priority: data.priority,
      advance_money:
        data.advance_currency === "MXN"
          ? data.advance_money
          : Number((data.advance_money * (exchangeRate?.rate || 0)).toFixed(2)),
      is_round_trip: isRoundTrip,
      requests_destinations,
    };

    try {
      const response =
        isEditing && requestId
          ? await updateTravelRequestMutation({ requestId, payload })
          : await createTravelRequestMutation(payload);

      const emailWarnings = Array.isArray(response.emailWarnings)
        ? response.emailWarnings
        : [];

      if (emailWarnings.length > 0) {
        toast.warning(
          isEditing
            ? "Solicitud actualizada. No se pudo enviar la notificación por correo."
            : "Solicitud creada. No se pudo enviar la notificación por correo.",
          {
            position: "top-right",
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
          },
        );
      } else {
        toast.success(
          isEditing
            ? "¡Solicitud de viaje actualizada exitosamente!"
            : "¡Solicitud de viaje creada exitosamente!",
        );
      }

      reset();
      navigate("/dashboard");
    } catch (error) {
      let errorMessage = isEditing
        ? "Error al actualizar la solicitud de viaje"
        : "Error al crear la solicitud de viaje";

      if (error instanceof AxiosError && error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <GoBack />
      <div className="flex gap-6 items-start">
        <section className="bg-gray-200 rounded-md mb-10 flex-1 min-w-0">
          <div className="p-10 mx-auto">
            <h2 className="text-2xl font-bold text-[var(--blue)] mt-0 mb-4">
              {isEditing ? "Editar Viaje" : "Datos del Viaje"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div
                className="grid gap-4 sm:grid-cols-2 sm:gap-6"
                id="travel_request_info"
              >
                <div className="sm:col-span-2">
                  <label
                    htmlFor="title"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Título
                  </label>
                  <Input
                    id="title"
                    {...register("title")}
                    placeholder="Viaje a CDMX"
                  />
                  <FieldError msg={errors.title?.message} />
                </div>

                <div>
                  <label
                    htmlFor="motive"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Motivo
                  </label>
                  <Input
                    id="motive"
                    {...register("motive")}
                    placeholder="Viaje de Negocios"
                  />
                  <FieldError msg={errors.motive?.message} />
                </div>

                <div>
                  <label
                    htmlFor="id_origin_city"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Ciudad de origen
                  </label>
                  <Controller
                    control={control}
                    name="id_origin_city"
                    render={({ field }) => (
                      <Select
                        id="id_origin_city"
                        options={destinationOptions}
                        value={
                          field.value
                            ? destinationOptions.find(
                                (o) => o.id === field.value,
                              )
                            : null
                        }
                        onChange={(opt) => {
                          field.onChange(opt.id);
                          setValue("id_origin_airport", null);
                        }}
                        isLoading={isLoadingDestinations}
                        placeholder="Selecciona ciudad de origen"
                      />
                    )}
                  />
                  <FieldError msg={errors.id_origin_city?.message} />
                </div>

                <div>
                  <label
                    htmlFor="id_origin_airport"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Aeropuerto de origen
                  </label>
                  <Controller
                    control={control}
                    name="id_origin_airport"
                    render={({ field }) => (
                      <Select
                        id="id_origin_airport"
                        options={originAirportOptions}
                        value={
                          field.value
                            ? originAirportOptions.find(
                                (o) => o.id === field.value,
                              )
                            : null
                        }
                        onChange={(opt) => field.onChange(opt.id)}
                        isDisabled={!originCityId}
                        placeholder={
                          originCityId
                            ? "Selecciona aeropuerto de origen (opcional)"
                            : "Selecciona ciudad primero"
                        }
                      />
                    )}
                  />
                  <FieldError msg={errors.id_origin_airport?.message} />
                </div>

                <div className="sm:col-span-2 flex items-center gap-4">
                  <label className="text-sm font-medium text-gray-900">
                    ¿Es viaje redondo?
                  </label>
                  <Switch
                    id="is_round_trip"
                    checked={isRoundTrip}
                    onChange={setIsRoundTrip}
                  />
                </div>

                <div>
                  <label
                    htmlFor="priority"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Prioridad
                  </label>
                  <Controller
                    control={control}
                    name="priority"
                    render={({ field }) => (
                      <Select
                        id="priority"
                        options={priorityOptions}
                        value={priorityOptions.find(
                          (o) => o.id === field.value,
                        )}
                        onChange={(opt) => field.onChange(opt.id)}
                        placeholder="Selecciona prioridad"
                      />
                    )}
                  />
                  <FieldError msg={errors.priority?.message} />
                </div>

                <div>
                  <label
                    htmlFor="advance_money"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Dinero adelantado
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="advance_money"
                      type="number"
                      min={0}
                      className="flex-1"
                      onWheel={(e) => e.currentTarget.blur()}
                      {...register("advance_money", { valueAsNumber: true })}
                    />
                    <div className="min-w-[120px]">
                      <label htmlFor="advance_currency" className="sr-only">
                        Divisa
                      </label>
                      <Controller
                        control={control}
                        name="advance_currency"
                        render={({ field }) => (
                          <Select
                            id="advance_currency"
                            options={currencySelectOptions}
                            value={
                              currencySelectOptions.find(
                                (o) => o.id === field.value,
                              ) || null
                            }
                            onChange={(opt) => field.onChange(opt.id)}
                            placeholder="Divisa"
                          />
                        )}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {advanceCurrency === "MXN"
                      ? `Se guardará en MXN: ${formatMoney(
                          normalizedAdvanceMoney,
                        )}.`
                      : isRateLoading
                        ? "Consultando tipo de cambio a MXN..."
                        : exchangeRateError || advanceMoneyMxn === null
                          ? "No se pudo obtener el tipo de cambio a MXN."
                          : `Equivalente en MXN: ${formatMoney(advanceMoneyMxn)}.`}
                  </p>
                  <FieldError msg={errors.advance_money?.message} />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="requirements"
                    className="block mb-2 text-sm font-medium text-gray-900"
                  >
                    Requisitos adicionales
                  </label>
                  <TextArea
                    id="requirements"
                    {...register("requirements")}
                    placeholder="Requisitos adicionales del viaje"
                  />
                </div>
              </div>

              <div id="destination_info">
                <h3 className="mt-8 mb-4 text-lg font-semibold">Destinos</h3>
                {fields.map((field, idx) => {
                  const legOriginId =
                    idx === 0
                      ? originCityId
                      : watchedDestinations[idx - 1]?.id_destination;
                  const legOriginName =
                    getDestinationName(legOriginId) ||
                    (idx === 0 ? ORIGIN_DISPLAY_NAME : `Destino ${idx}`);

                  return (
                    <DestinationFields
                      key={field.id}
                      idx={idx}
                      legOriginName={legOriginName}
                      control={control}
                      register={register}
                      destinationOptions={destinationOptions}
                      destinations={destinations}
                      errors={errors.requests_destinations}
                      remove={remove}
                      setValue={setValue}
                      isLoadingDestinations={isLoadingDestinations}
                      isLast={idx === fields.length - 1}
                      isRoundTrip={isRoundTrip}
                      originName={
                        getDestinationName(originCityId) || ORIGIN_DISPLAY_NAME
                      }
                      blockPastDates={blockPastDates}
                      onArrivalDateChange={(date) => {
                        if (idx < fields.length - 1) {
                          setValue(
                            `requests_destinations.${idx + 1}.departure_date`,
                            date,
                          );
                        }
                      }}
                    />
                  );
                })}
              </div>
              {isRoundTrip &&
                fields.length > 0 &&
                (() => {
                  const lastDestId =
                    watchedDestinations[fields.length - 1]?.id_destination;
                  const lastDestName =
                    getDestinationName(lastDestId) || "Último destino";
                  const originName =
                    getDestinationName(originCityId) || ORIGIN_DISPLAY_NAME;
                  return (
                    <div className="rounded-md p-4 mb-6 bg-blue-50 border border-blue-200">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-blue-800">
                          Tramo #{fields.length + 1}: {lastDestName} →{" "}
                          {originName}
                        </span>
                        <span className="text-xs text-white bg-blue-500 px-2 py-0.5 rounded-full">
                          Vuelo de regreso
                        </span>
                      </div>
                      <p className="text-sm text-blue-600 mt-1">
                        La agencia de viajes buscará un vuelo de regreso al
                        origen.
                      </p>
                    </div>
                  );
                })()}

              <Button
                id="new_destination"
                type="button"
                onClick={() => {
                  const lastArrival =
                    watchedDestinations[fields.length - 1]?.arrival_date || "";
                  append({
                    id_destination: null,
                    id_airport: null,
                    arrival_date: "",
                    departure_date: lastArrival,
                    stay_days: 1,
                    is_hotel_required: false,
                    is_plane_required: true,
                    details: "",
                  });
                }}
              >
                + Añadir destino
              </Button>

              <Button
                type="submit"
                className="mt-4 sm:mt-6"
                disabled={isPending}
                id={
                  isEditing ? "update_travel_request" : "create_travel_request"
                }
              >
                {isPending
                  ? isEditing
                    ? "Actualizando..."
                    : "Creando..."
                  : isEditing
                    ? "Actualizar viaje"
                    : "Crear viaje"}
              </Button>
            </form>
          </div>
        </section>

        {watchedDestinations.length > 0 && (
          <div className="sticky top-32 w-72 shrink-0 rounded-md border border-gray-200 bg-white overflow-hidden shadow-sm">
            <h4 className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-700">
              Resumen del itinerario
            </h4>
            <div className="divide-y divide-gray-100">
              {watchedDestinations.map((dest, idx) => {
                const legOriginId =
                  idx === 0
                    ? originCityId
                    : watchedDestinations[idx - 1]?.id_destination;
                const legOriginName =
                  getDestinationName(legOriginId) ||
                  (idx === 0 ? ORIGIN_DISPLAY_NAME : "—");
                const destName =
                  getDestinationName(dest?.id_destination) || "—";
                const dep = dest?.departure_date;
                const arr = dest?.arrival_date;
                const stayDays =
                  dep && arr ? dayjs(arr).diff(dayjs(dep), "day") : null;
                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-y-1 px-4 py-3 text-sm"
                  >
                    <span className="text-gray-400 text-xs">
                      Tramo {idx + 1}
                    </span>
                    <span className="font-medium">
                      {legOriginName} → {destName}
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 text-xs">
                        {dep ? dayjs(dep).format("DD/MM/YY") : "—"} –{" "}
                        {arr ? dayjs(arr).format("DD/MM/YY") : "—"}
                        {stayDays !== null && stayDays > 0
                          ? ` (${stayDays}d)`
                          : ""}
                      </span>
                      <div className="flex gap-1">
                        {dest?.is_plane_required && (
                          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                            ✈ Vuelo
                          </span>
                        )}
                        {dest?.is_hotel_required && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            Hotel
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {isRoundTrip &&
                (() => {
                  const lastDestId =
                    watchedDestinations[watchedDestinations.length - 1]
                      ?.id_destination;
                  const lastDestName = getDestinationName(lastDestId) || "—";
                  const originName =
                    getDestinationName(originCityId) || ORIGIN_DISPLAY_NAME;
                  return (
                    <div className="flex flex-col gap-y-1 px-4 py-3 text-sm bg-blue-50">
                      <span className="text-blue-400 text-xs">
                        Tramo {watchedDestinations.length + 1}
                      </span>
                      <span className="font-medium text-blue-800">
                        {lastDestName} → {originName}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full w-fit">
                        ✈ Regreso
                      </span>
                    </div>
                  );
                })()}
            </div>
          </div>
        )}
      </div>
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={submitConfirmed}
        title={
          isEditing
            ? "Guardar cambios en la solicitud"
            : "Enviar solicitud de viaje"
        }
        description={
          isEditing
            ? "Los cambios realizados reemplazarán la información anterior de la solicitud y serán enviados nuevamente al aprobador para su revisión."
            : "Estás a punto de enviar tu solicitud de viaje para revisión y aprobación. Verifica que todos los destinos y fechas sean correctos antes de continuar."
        }
        warningNote={
          isEditing
            ? "El aprobador deberá revisar y aprobar los cambios nuevamente antes de continuar con el proceso."
            : "Una vez enviada, no podrás modificar los destinos ni las fechas sin solicitar cambios al aprobador."
        }
        confirmText={isEditing ? "Sí, guardar cambios" : "Sí, enviar solicitud"}
        isDestructive={false}
      />
    </div>
  );
}

export default TravelRequestForm;

/*
Modification History:
- 2026-02-26 | Santiago Arista | Added file description, JSDoc documentation, and translated validation messages to English.
- 2026-04-18 | Juan de Dios Gastélum Flores | Added pre-submission confirmation modal. Split onSubmit into validation and submitConfirmed phases.
- 2026-04-22 | Juan de Dios Gastélum Flores | Improved multi-destination flow: sequential leg headers, round trip toggle, return leg indicator, auto-fill dates between legs, cross-leg date validation, and itinerary summary.
- 2026-04-23 | Juan de Dios Gastélum | Replaced inline itinerary summary with sticky sidebar for better visibility during form navigation.
- 2026-04-29 | Juan de Dios Gastélum Flores | Added warning toast when request creation or update succeeds but email notification delivery fails.
- 2026-04-29 | Fabrizio | Integrated currency selection and real-time MXN conversion using useWatch and useExchangeRate.
*/
