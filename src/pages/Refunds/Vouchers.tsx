import { Link, useNavigate } from "react-router-dom";
import DynamicTable, {
  TableRow as DynamicTableRow,
  CellValueType,
} from "../../components/Refunds/DynamicTable";
import { useState, useEffect } from "react";
import InputField from "../../components/Refunds/InputField";
import Dropdown from "../../components/Refunds/DropDown";
import { spendOptions, taxIndicatorOptions } from "./local/dummyData";
import { getRequest, patchRequest, postRequest } from "../../utils/apiService";
import { useParams } from "react-router-dom";
import formatMoney from "../../utils/formatMoney";
import { toast } from "react-toastify";
import GoBack from "../../components/GoBack";
import { Tutorial } from "../../components/Tutorial";
import { PolicyAlert } from "../../components/Refunds/PolicyAlert";

interface FormDataRow extends DynamicTableRow {
  spentClass: string;
  amount: number;
  taxIndicator: string;
  date: string;
  XMLFile?: File;
  PDFFile?: File;
}
interface Trip {
  id: number | string;
  title: string;
  advance_money: number;
  destination: {
    city: string;
  };
}

export const Vouchers = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState<FormDataRow[]>([]);
  const [trip, setTrip] = useState<Trip>({
    id: 0,
    title: "",
    advance_money: 0,
    destination: {
      city: "",
    },
  });
  const [commentValue, setCommentValue] = useState<string>("");
  const [policyViolations, setPolicyViolations] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const response = await getRequest(`/requests/${id}`);
        setTrip(response);
      } catch (err) {
        console.error(
          "Error al cargar el viaje: ",
          err instanceof Error ? err.message : err
        );
      }
    };
    fetchTrip();
  }, []);

  const handleSubmitRefund = async () => {
    setPolicyViolations([]);
    setIsSubmitting(true);
    try {
      // comprobante_pendiente, comprobante_denegado, comprobante_aprobado
      
      for (const rowData of formData) {
        const formDataToSend = new FormData();

        formDataToSend.append(
          "id_request",
          trip.id.toString()
        );
        //formDataToSend.append("comment", commentDescriptionOfSpend);
        formDataToSend.append("date", rowData.date);
        formDataToSend.append("class", rowData.spentClass);
        formDataToSend.append("amount", rowData.amount.toString());
        formDataToSend.append("tax_type", rowData.taxIndicator);
        formDataToSend.append("status", "comprobante_pendiente");
        formDataToSend.append("currency", "MXN");
        formDataToSend.append("id_approver", "");
        if (rowData.XMLFile) {
          formDataToSend.append("file_url_xml", rowData.XMLFile);
        }

        if (rowData.PDFFile) {
          formDataToSend.append("file_url_pdf", rowData.PDFFile);
        }

        await postRequest("/vouchers/upload", formDataToSend);
      }
      await patchRequest(`/requests/finished-uploading-vouchers/${id}`, {});
      toast.success("Solicitud de reembolso enviada con éxito.");
      navigate("/refunds");
    } catch (err: any) {
      if (err.response?.status === 422) {
        const summary = err.response.data.policy_summary;
        
        setPolicyViolations(summary.violations); 
        
        toast.error("El comprobante no cumple con las políticas.");
      } else if (err.response?.status === 403) {
        toast.error("No tienes permiso para realizar esta acción.");
    } else {
      console.error("Error inesperado:", err);
      toast.error("Error al procesar la solicitud. Revisa tu conexión.");
    }
  } finally {
    setIsSubmitting(false);
  }
  };
  const columnsSchemaVauchers = [
    {
      key: "spentClass",
      header: "Clase de gasto",
      defaultValue: "",
      /*
       * An fast example of how the renderCell function works:
       * 1. When change the option in the dropdown, the native OnChange function of the dropdown is called.
       * 2. OnChangeComponentFunction is acually the function passed as a prop to the renderCell function,
       *    in this case (newValue) => handleFieldChange(rowIndex, column.key, newValue) in the DynamicTable component.
       * 3. This function is used to update the component from child to parent, so it will update the value of the
       *   column in the row with the new value selected in the dropdown.
       *
       */
      renderCell: (
        value: CellValueType,
        onChangeComponentFunction: (newValue: CellValueType) => void,
        _rowIndex?: number,
        _cellIndex?: number
      ) => (
        <Dropdown
          id={`spend_class-${_rowIndex}-${_cellIndex}`}
          options={spendOptions}
          value={value as string}
          onChange={(e) => onChangeComponentFunction(e.target.value)}
          placeholder="Seleccione"
        />
      ),
    },
    {
      key: "amount",
      header: "Monto MXN",
      defaultValue: 0,
      renderCell: (
        value: CellValueType,
        onChangeComponentFunction: (newValue: CellValueType) => void,
        _rowIndex?: number,
        _cellIndex?: number
      ) => (
        <InputField
          id={`amount-${_rowIndex}-${_cellIndex}`}
          type="number"
          value={value as string}
          onChange={(e) => onChangeComponentFunction(Number(e.target.value))}
          placeholder="Ingrese"
        />
      ),
    },
    {
      key: "taxIndicator",
      header: "Indicador de impuesto",
      defaultValue: "",
      renderCell: (
        value: CellValueType,
        onChangeComponentFunction: (newValue: CellValueType) => void,
        _rowIndex?: number,
        _cellIndex?: number
      ) => (
        <Dropdown
          id={`tax_indicator-${_rowIndex}-${_cellIndex}`}
          options={taxIndicatorOptions}
          value={value as string}
          onChange={(e) => onChangeComponentFunction(e.target.value)}
          placeholder="Seleccione"
        />
      ),
    },
    {
      key: "date",
      header: "Fecha del comprobante",
      defaultValue: "",
      renderCell: (
        value: CellValueType,
        onChangeComponentFunction: (newValue: CellValueType) => void,
        _rowIndex?: number,
        _cellIndex?: number
      ) => (
        <InputField
          id={`date-${_rowIndex}-${_cellIndex}`}
          type="date"
          value={value as string}
          onChange={(e) => onChangeComponentFunction(e.target.value)}
        />
      ),
    },
    {
      key: "XMLFile",
      header: "Archivo XML",
      defaultValue: "",
      renderCell: (
        _value: CellValueType,
        onChangeComponentFunction: (newValue: CellValueType) => void,
        rowIndex?: number,
        _cellIndex?: number
      ) => (
        <InputField
          id={`xml_file-${rowIndex}-${_cellIndex}`}
          selectedFileName={formData[rowIndex || 0]?.XMLFile?.name || ""}
          type="file"
          accept=".xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onChangeComponentFunction(file);
              if (rowIndex !== undefined) {
                const updatedFormData = [...formData];

                if (updatedFormData[rowIndex]) {
                  updatedFormData[rowIndex].XMLFile = file;
                  setFormData(updatedFormData);
                }
              }
            }
          }}
          placeholder="Subir archivo XML"
        />
      ),
    },
    {
      key: "PDFFile",
      header: "Archivo PDF",
      defaultValue: "",
      renderCell: (
        _value: CellValueType,
        onChangeComponentFunction: (newValue: CellValueType) => void,
        rowIndex?: number,
        _cellIndex?: number
      ) => (
        <InputField
          id={`pdf_file-${rowIndex}-${_cellIndex}`}
          selectedFileName={formData[rowIndex || 0]?.PDFFile?.name || ""}
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onChangeComponentFunction(file);

              if (rowIndex !== undefined) {
                const updatedFormData = [...formData];
                if (updatedFormData[rowIndex]) {
                  updatedFormData[rowIndex].PDFFile = file;
                  setFormData(updatedFormData);
                }
              }
            }
          }}
          placeholder="Subir archivo PDF"
        />
      ),
    },
  ];

  const handleFormDataChange = (newData: FormDataRow[]) => {
    setFormData(newData);
  };

  // Wrapper function to handle the type conversion
  const handleDynamicTableDataChange = (data: DynamicTableRow[]) => {
    // Convert DynamicTableRow[] to FormDataRow[]
    handleFormDataChange(data as FormDataRow[]);
  };

  return (
    <>
    <Tutorial page="vouchers">
      <GoBack />
      <div className="max-w-full p-6 bg-[#eaeced] rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-[#0a2c6d] mb-1">
          Formato de solicitud de reembolso
        </h2>
        <div className="mb-4">
          {/*
          * Display general information about the trip, such as ID, name, destination,
          */}
          <h3 className="text-lg font-bold text-[#0a2c6d] mb-2">
            Información del viaje
          </h3>
          <p>
            <strong>ID del viaje:</strong> {trip.id}
          </p>
          <p>
            <strong>Nombre del viaje:</strong> {trip.title}
          </p>
          <p>
            <strong>Destino:</strong> {trip.destination.city}
          </p>
          <p>
            <strong>Anticipo:</strong> {formatMoney(trip.advance_money)}
          </p>
        </div>
        {/*
        * which contains the schema of the table.
        * The table is created initially with initially empty data,
        * and the user can add new rows to the table.
        * The formData array is updated with the handleFormDataChange function,
        * which is passed as a prop to the DynamicTable component.
        * The handleFormDataChange function updates the formData state with the new data.
        */}
        <div id="vouchers">
          <DynamicTable
            columns={columnsSchemaVauchers}
            initialData={formData}
            onDataChange={handleDynamicTableDataChange}
          />
          {policyViolations.length > 0 && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-xl mr-2">🚫</span>
                <h4 className="font-bold">No se puede enviar la solicitud por los siguientes motivos:</h4>
              </div>
              <ul className="list-disc list-inside ml-4">
                {policyViolations.map((violation, index) => (
                  <li key={index} className="text-sm py-1">
                    {violation.message} 
                    <span className="ml-2 text-[10px] bg-red-200 px-1 rounded font-bold uppercase">
                      {violation.severity}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs italic">
                * Por favor corrige los montos o sube los archivos faltantes para continuar.
              </p>
            </div>
          )}
        </div>
        {/*
        * Display a field to add a comment to the refund request.
        * The comment is stored in the commentDescriptionOfSpend state,
        * and is updated with the setCommentDescriptionOfSpend function.
        */}
        <PolicyAlert violations={policyViolations} />
        
        <h3 className="text-lg font-bold text-[#0a2c6d] mt-4 mb-2">Comentario</h3>
        <InputField 
          id="comment-refund"
          type="text"
          value={commentValue}
          placeholder="Ingrese un comentario"
          onChange={(e) => setCommentValue(e.target.value)}
        />
        <div className="mt-6 flex justify-between">
          <Link
            to="/refunds"
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors hover:cursor-pointer"
          >
            Cancelar
          </Link>
          <button
            id="submit-refund"
            disabled={isSubmitting}
            className={`px-4 py-2 text-white rounded-md transition-colors ${
                isSubmitting ? 'bg-gray-400' : 'bg-[#0a2c6d] hover:bg-[#0d3d94] hover:cursor-pointer'
            }`}
            onClick={handleSubmitRefund}
          >
            E{isSubmitting ? "Procesando..." : "Enviar Solicitud"}
          </button>
        </div>
      </div>
    </Tutorial>
    </>
  );
};
