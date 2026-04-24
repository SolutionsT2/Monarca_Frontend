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
  FieldErrors,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";
import { useForm, Controller, useFieldArray, useWatch } from "react-hook-form";
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
import { useEffect, useState } from "react";

type Option = { id: number | string; name: string };

const priorityOptions: Option[] = [
  { id: "alta", name: "Alta" },
  { id: "media", name: "Media" },
  { id: "baja", name: "Baja" },
];

const destinationSchema = z
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
    // .positive({ message: "Number of days must be positive" }),
    is_hotel_required: z.boolean(),
    is_plane_required: z.boolean(),
    details: z.string().nonempty({ message: "Agrega detalles" }),
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
  });

const formSchema = z.object({
  id_origin_city: z.string().nullable(),
  id_origin_airport: z.string().nullable().optional(),
  motive: z.string().nonempty({ message: "Escribe el motivo del viaje" }),
  title: z.string().nonempty({ message: "Escribe el título del viaje" }),
  priority: z.enum(["alta", "media", "baja"]),
  requirements: z.string().optional(),
  advance_money: z
    .number()
    .int()
    .nonnegative({ message: "El dinero adelantado debe ser positivo" }),
  requests_destinations: z
    .array(destinationSchema)
    .min(1, "Al menos un destino"),
});

type RawFormValues = z.infer<typeof formSchema>;

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

  const airportOptions = (
    destinations.find((d) => d.id === destinationId)?.airports || []
  ).map((airport) => ({
    id: airport.id,
    name: `${airport.iata_code} - ${airport.name}${airport.is_primary ? " (Principal)" : ""}`,
  }));

  const stayDays =
    arrivalDate && departureDate
      ? dayjs(arrivalDate).diff(dayjs(departureDate), "day")
      : 0;

  useEffect(() => {
    setValue(`requests_destinations.${idx}.stay_days`, stayDays);
  }, [arrivalDate, departureDate, idx, setValue, stayDays]);

  const destinationErrors = errors?.[idx];

  return (
    <div className="rounded-md p-4 mb-6 space-y-4 bg-white shadow-sm">
      <div className="flex justify-between items-center">
        <span className="font-medium">Destino #{idx + 1}</span>
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
            Detalles
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
            Fecha salida
          </label>
          <Controller
            control={control}
            name={`requests_destinations.${idx}.departure_date`}
            render={({ field }) => (
              <Input
                id={`departure-${idx}`}
                type="date"
                value={
                  field.value ? dayjs(field.value).format("YYYY-MM-DD") : ""
                }
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
          <FieldError msg={destinationErrors?.departure_date?.message} />
        </div>

        <div>
          <label
            htmlFor={`arrival-${idx}`}
            className="block mb-2 text-sm font-medium text-gray-900"
          >
            Fecha llegada
          </label>
          <Controller
            control={control}
            name={`requests_destinations.${idx}.arrival_date`}
            render={({ field }) => (
              <Input
                id={`arrival-${idx}`}
                type="date"
                value={
                  field.value ? dayjs(field.value).format("YYYY-MM-DD") : ""
                }
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
          <FieldError msg={destinationErrors?.arrival_date?.message} />
        </div>

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

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<RawFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {
      id_origin_city: null,
      id_origin_airport: null,
      motive: "",
      title: "",
      priority: "media",
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

  const originAirportOptions =
    destinations
      .find((d) => d.id === originCityId)
      ?.airports?.map((airport) => ({
        id: airport.id,
        name: `${airport.iata_code} - ${airport.name}${airport.is_primary ? " (Principal)" : ""}`,
      })) || [];

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

    const hasInvalidStay = data.requests_destinations.some((d) => {
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

    if (!data.id_origin_city) {
      toast.error("Selecciona una ciudad de origen");
      return;
    }

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

    const payload: CreateRequest = {
      id_origin_city: data.id_origin_city,
      id_origin_airport: data.id_origin_airport || undefined,
      title: data.motive,
      motive: data.motive,
      requirements: data.requirements || "",
      priority: data.priority,
      advance_money: data.advance_money,
      requests_destinations,
    };

    try {
      if (isEditing && requestId) {
        await updateTravelRequestMutation({ requestId, payload });
        toast.success("¡Solicitud de viaje actualizada exitosamente!");
      } else {
        await createTravelRequestMutation(payload);
        toast.success("¡Solicitud de viaje creada exitosamente!");
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
    <div className="max-w-5xl mx-auto">
      <GoBack />
      <section className="bg-gray-200 rounded-md mb-10">
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
                  htmlFor="id_origin_city"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Ciudad Origen
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
                          ? destinationOptions.find((o) => o.id === field.value)
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
                      value={priorityOptions.find((o) => o.id === field.value)}
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
                <Input
                  id="advance_money"
                  type="number"
                  {...register("advance_money", { valueAsNumber: true })}
                />
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
              {fields.map((field, idx) => (
                <DestinationFields
                  key={field.id}
                  idx={idx}
                  control={control}
                  register={register}
                  destinationOptions={destinationOptions}
                  destinations={destinations}
                  errors={errors.requests_destinations}
                  remove={remove}
                  setValue={setValue}
                  isLoadingDestinations={isLoadingDestinations}
                />
              ))}
            </div>
            <Button
              id="new_destination"
              type="button"
              onClick={() =>
                append({
                  id_destination: null,
                  id_airport: null,
                  arrival_date: "",
                  departure_date: "",
                  stay_days: 1,
                  is_hotel_required: false,
                  is_plane_required: true,
                  details: "",
                })
              }
            >
              + Añadir destino
            </Button>

            <Button
              type="submit"
              className="mt-4 sm:mt-6"
              disabled={isPending}
              id={isEditing ? "update_travel_request" : "create_travel_request"}
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
*/
