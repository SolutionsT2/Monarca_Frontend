/**
 * File: ViewEmployees.tsx
 * Description: CompanyAdmin page to view all employees in the company
 *              with both table and organizational chart views
 */

import { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { toast } from 'react-toastify';

import EmployeeViewTable from '../../components/companyadmin/EmployeeViewTable';
import OrgChart from '../../components/companyadmin/OrgChart';
import { useApp } from '../../hooks/app/appContext';
import { useAuth } from '../../hooks/auth/authContext';
import { buildOrgTree } from '../../utils/flatToTree';
import { getRequest, patchRequest } from '../../utils/apiService';

type ViewType = 'table' | 'tree';

interface PreviewEmployee {
  id: string;
  row: number;
  employeeNumber: string;
  name: string;
  lastName: string;
  username: string | null;
  email: string | null;
  supplierNumber: string | null;
  departmentId: string | null;
  departmentName: string | null;
  bossEmployeeNumber: string | null;
  availabilityStatus: string;
  signupDate: string | null;
  lastchangeDate: string | null;
  validationErrors: string[];
  roleName?: string; // Display name of the assigned role
  idRole?: string | null;
  isUpdate: boolean;
  suggestedRoleId: string | null;
}

interface AvailableRole {
  id: string;
  name: string;
}

type ApiErrorBody = { message?: string | string[] };

/**
 * Extracts a user-friendly error message from an Axios error.
 */
const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<ApiErrorBody>;
    const data = axiosError.response?.data;
    if (data?.message) {
      return Array.isArray(data.message) ? data.message.join(', ') : data.message;
    }
  }
  return fallback;
};

/**
 * Main page component. Displays all company employees with table and tree views.
 */
const ViewEmployees = () => {
  const { setPageTitle } = useApp();
  const { authState } = useAuth();
  const [employees, setEmployees] = useState<PreviewEmployee[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [roleByEmpNo, setRoleByEmpNo] = useState<Record<string, string>>({});
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [view, setView] = useState<ViewType>('table');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    setPageTitle('Ver empleados');
  }, [setPageTitle]);

  // Fetch employees and departments from backend
  useEffect(() => {
    const fetchEmployeesAndDepts = async () => {
      try {
        setIsLoading(true);
        const companyId = authState.userCompanyId;

        const [usersResponse, rolesResponse, deptsResponse] = await Promise.all([
          getRequest('/users'),
          getRequest('/roles'),
          companyId ? getRequest(`/companies/${companyId}/departments`) : Promise.resolve([]),
        ]);
        
        // Build role map for quick lookup
        const rolesArray = Array.isArray(rolesResponse) ? rolesResponse : rolesResponse?.roles || [];
        const roleMap = new Map<string, string>();
        rolesArray.forEach((role: any) => {
          roleMap.set(role.id, role.name);
        });

        // Parse and set departments
        const rawDepts = Array.isArray(deptsResponse)
          ? deptsResponse
          : deptsResponse?.departments || deptsResponse?.data || [];
        const mappedDepts = rawDepts
          .map((d: any) => ({
            id: String(d.id || d.departmentId || '').trim(),
            name: String(d.name || '').trim(),
          }))
          .filter((d: any) => d.id && d.name);
        setDepartments(mappedDepts);

        // Transform response to PreviewEmployee type - only include employees with employee numbers
        const employeeList = Array.isArray(usersResponse) ? usersResponse : usersResponse?.users || [];
        
        // Create a map from employee ID to employee number for converting idManager to bossEmployeeNumber
        const idToEmployeeNumberMap = new Map<string, string>();
        employeeList.forEach((emp: any) => {
          if (emp.id && emp.employeeNumber) {
            idToEmployeeNumberMap.set(emp.id, emp.employeeNumber);
          }
        });
        
        const mapped: PreviewEmployee[] = employeeList
          .filter((emp: any) => emp.employeeNumber && emp.employeeNumber.trim() !== '') // Filter out rows without employee numbers
          .map((emp: any, idx: number) => {
            const roleName = roleMap.get(emp.idRole) || 'Sin rol asignado';
            return {
              id: emp.id,
              row: idx + 1,
              employeeNumber: emp.employeeNumber || '',
              name: emp.name || '',
              lastName: emp.lastName || '',
              username: emp.username || null,
              email: emp.email || null,
              supplierNumber: emp.supplierNumber || null,
              departmentId: emp.idDepartment || null,
              departmentName: emp.department?.name || emp.departmentName || null,
              bossEmployeeNumber: emp.idManager ? idToEmployeeNumberMap.get(emp.idManager) || null : null,
              availabilityStatus: emp.availabilityStatus || 'active',
              signupDate: emp.signupDate || null,
              lastchangeDate: emp.lastchangeDate || null,
              validationErrors: [],
              roleName: roleName,
              idRole: emp.idRole || null,
              isUpdate: false,
              suggestedRoleId: null,
            };
          });
        
        // Create roleByEmpNo mapping for OrgChart
        const empNoToRoleId: Record<string, string> = {};
        mapped.forEach((emp) => {
          if (emp.employeeNumber && emp.idRole) {
            empNoToRoleId[emp.employeeNumber] = emp.idRole;
          }
        });
        setEmployees(mapped);
        const filteredRoles = rolesArray
          .filter((role: any) => {
            const normalizedName = role.name?.toLowerCase().replace(/\s+/g, '') ?? '';
            return normalizedName !== 'administrador' && normalizedName !== 'superadmin';
          })
          .map((r: any) => ({ id: r.id, name: r.name }));
        setAvailableRoles(filteredRoles);
        setRoleByEmpNo(empNoToRoleId);
      } catch (error) {
        console.error('Error fetching employees:', error);
        toast.error(
          extractErrorMessage(
            error,
            'No se pudieron cargar los empleados.',
          ),
        );
        setEmployees([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployeesAndDepts();
  }, [refreshTrigger, authState.userCompanyId]);

  const handleUpdateEmployee = async (
    employeeId: string,
    departmentId: string | null,
    bossId: string | null,
    roleId: string,
  ) => {
    try {
      await patchRequest(`/users/${employeeId}`, {
        idDepartment: departmentId,
        idManager: bossId,
        idRole: roleId,
      });
      toast.success('Información del empleado actualizada correctamente');
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error('Error updating employee:', error);
      toast.error(extractErrorMessage(error, 'No se pudo actualizar el empleado.'));
      throw error;
    }
  };

  const tree = useMemo(
    () => buildOrgTree(employees),
    [employees],
  );

  return (
    <div className="px-6 md:px-16 pt-32 flex-1 pb-12">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Ver empleados
          </h1>
          <p className="text-sm text-gray-500">
            Visualiza todos los empleados de tu empresa en formato tabla u organigrama.
          </p>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <p className="text-gray-600">Cargando empleados...</p>
            </div>
          </div>
        ) : employees.length === 0 ? (
          <div className="border border-dashed border-gray-300 rounded-lg p-12 text-center">
            <p className="text-gray-600 mb-2">No hay empleados registrados</p>
            <p className="text-sm text-gray-500">
              Importa empleados desde Excel para comenzar a visualizarlos aquí.
            </p>
          </div>
        ) : (
          <>
            <EmployeeSummary
              totalEmployees={employees.length}
            />

            <div className="flex items-center gap-2">
              <ViewToggleButton
                label="Tabla"
                active={view === 'table'}
                onClick={() => setView('table')}
              />
              <ViewToggleButton
                label="Organigrama"
                active={view === 'tree'}
                onClick={() => setView('tree')}
              />
            </div>

            {view === 'table' ? (
              <EmployeeViewTable
                employees={employees}
                departments={departments}
                availableRoles={availableRoles}
                onUpdateEmployee={handleUpdateEmployee}
              />
            ) : tree && tree.roots && tree.roots.length > 0 ? (
              <OrgChart
                tree={tree}
                availableRoles={availableRoles}
                roleByEmpNo={roleByEmpNo}
              />
            ) : (
              <div className="border border-amber-200 bg-amber-50 rounded-lg p-6 text-center">
                <p className="text-amber-900 font-medium mb-2">
                  Organigrama no disponible
                </p>
                <p className="text-sm text-amber-700">
                  Los empleados aún no tienen definidas sus relaciones jerárquicas (jefe inmediato).
                  Asigna un jefe inmediato a los empleados para ver el organigrama.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const EmployeeSummary = ({ totalEmployees }: { totalEmployees: number }) => (
  <div className="border border-gray-200 rounded-lg px-4 py-3 bg-gray-50">
    <p className="text-sm text-gray-600">
      <span className="font-semibold text-gray-900">{totalEmployees}</span> empleado{totalEmployees !== 1 ? 's' : ''} registrado{totalEmployees !== 1 ? 's' : ''}
    </p>
  </div>
);

const ViewToggleButton = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
      active
        ? 'bg-[var(--blue)] text-white border-[var(--blue)]'
        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
    }`}
  >
    {label}
  </button>
);

export default ViewEmployees;
