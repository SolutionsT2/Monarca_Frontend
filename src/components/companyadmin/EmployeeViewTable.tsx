/**
 * File: EmployeeViewTable.tsx
 * Description: Interactive table view of employees showing their assigned roles and departments,
 *              with capability for CompanyAdmins to edit their departments, bosses, and roles inline.
 */

import React, { useMemo, useState } from 'react';
import { Button } from '../ui/Button';

interface Employee {
  id: string;
  row: number;
  employeeNumber: string;
  name: string;
  lastName: string;
  username: string | null;
  email: string | null;
  departmentId: string | null;
  departmentName?: string | null;
  bossEmployeeNumber: string | null;
  availabilityStatus: string;
  roleName?: string;
  idRole?: string | null;
}

type EmployeeViewTableProps = {
  employees: Employee[];
  departments: { id: string; name: string }[];
  availableRoles: { id: string; name: string }[];
  onUpdateEmployee: (
    employeeId: string,
    departmentId: string | null,
    bossId: string | null,
    roleId: string
  ) => Promise<void>;
};

const EmployeeViewTable = ({
  employees,
  departments = [],
  availableRoles = [],
  onUpdateEmployee,
}: EmployeeViewTableProps) => {
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [isRowUpdating, setIsRowUpdating] = useState(false);

  const handleStartEdit = (employeeId: string) => {
    setEditingEmployeeId(employeeId);
  };

  const handleCancelEdit = () => {
    setEditingEmployeeId(null);
  };

  const handleSaveEmployeeUpdate = async (
    employeeId: string,
    nextDeptId: string | null,
    nextBossId: string | null,
    nextRoleId: string
  ) => {
    try {
      setIsRowUpdating(true);
      await onUpdateEmployee(employeeId, nextDeptId, nextBossId, nextRoleId);
      setEditingEmployeeId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRowUpdating(false);
    }
  };

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide border-b border-gray-200">
          <tr>
            <th className="px-4 py-3.5 text-left font-semibold">No. Empleado</th>
            <th className="px-4 py-3.5 text-left font-semibold">Nombre</th>
            <th className="px-4 py-3.5 text-left font-semibold">Usuario</th>
            <th className="px-4 py-3.5 text-left font-semibold">Correo</th>
            <th className="px-4 py-3.5 text-left font-semibold">Departamento</th>
            <th className="px-4 py-3.5 text-left font-semibold">Jefe inmediato</th>
            <th className="px-4 py-3.5 text-left font-semibold">Estado</th>
            <th className="px-4 py-3.5 text-left font-semibold">Rol asignado</th>
            <th className="px-4 py-3.5 text-left font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {(employees || []).length === 0 && (
            <tr>
              <td
                colSpan={9}
                className="px-4 py-8 text-center text-gray-400 text-sm"
              >
                No hay empleados registrados.
              </td>
            </tr>
          )}
          {(employees || []).map((employee) => {
            const fullName = `${employee.name}${
              employee.lastName ? ` ${employee.lastName}` : ''
            }`.trim();
            const isEditingEmployee = editingEmployeeId === employee.id;

            return (
              <React.Fragment key={`${employee.employeeNumber}-${employee.row}`}>
                <tr className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {employee.employeeNumber || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{fullName || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {employee.username ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {employee.email ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {employee.departmentName ?? 'Sin departamento'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {employee.bossEmployeeNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 capitalize">
                    {employee.availabilityStatus}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {employee.roleName || 'Sin rol'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-blue-600">
                    <button
                      type="button"
                      onClick={() => {
                        if (isEditingEmployee) {
                          handleCancelEdit();
                        } else {
                          handleStartEdit(employee.id);
                        }
                      }}
                      disabled={isRowUpdating}
                      className="text-[var(--blue)] hover:underline disabled:opacity-50"
                    >
                      {isEditingEmployee ? 'Cerrar' : 'Editar'}
                    </button>
                  </td>
                </tr>

                {isEditingEmployee && (
                  <EmployeeEditRow
                    employee={employee}
                    departments={departments}
                    availableRoles={availableRoles}
                    allEmployees={employees}
                    onSave={(nextDeptId, nextBossId, nextRoleId) =>
                      handleSaveEmployeeUpdate(employee.id, nextDeptId, nextBossId, nextRoleId)
                    }
                    onCancel={handleCancelEdit}
                    isUpdating={isRowUpdating}
                  />
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

type EmployeeEditRowProps = {
  employee: Employee;
  departments: { id: string; name: string }[];
  availableRoles: { id: string; name: string }[];
  allEmployees: Employee[];
  onSave: (nextDeptId: string | null, nextBossId: string | null, nextRoleId: string) => Promise<void>;
  onCancel: () => void;
  isUpdating: boolean;
};

const EmployeeEditRow = ({
  employee,
  departments,
  availableRoles,
  allEmployees,
  onSave,
  onCancel,
  isUpdating,
}: EmployeeEditRowProps) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(employee.departmentId);
  const [typedBossEmpNo, setTypedBossEmpNo] = useState<string>(employee.bossEmployeeNumber || '');
  const [selectedRoleId, setSelectedRoleId] = useState<string>(employee.idRole || '');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const fullName = `${employee.name}${
    employee.lastName ? ` ${employee.lastName}` : ''
  }`.trim();

  // Filter boss suggestions in real time
  const suggestions = useMemo(() => {
    const val = typedBossEmpNo.trim().toLowerCase();
    if (!val) return [];
    return allEmployees.filter(
      (emp) =>
        emp.id !== employee.id &&
        (emp.employeeNumber.toLowerCase().includes(val) ||
          `${emp.name} ${emp.lastName}`.toLowerCase().includes(val))
    );
  }, [typedBossEmpNo, allEmployees, employee.id]);

  // Real-time validation of immediate boss employee number input
  const validation = useMemo(() => {
    const val = typedBossEmpNo.trim();
    if (!val) {
      return { isValid: true, bossId: null, message: null };
    }

    if (val.toLowerCase() === employee.employeeNumber.trim().toLowerCase()) {
      return {
        isValid: false,
        bossId: null,
        message: 'Un empleado no puede ser su propio jefe.',
      };
    }

    const match = allEmployees.find(
      (emp) =>
        emp.id !== employee.id &&
        emp.employeeNumber.trim().toLowerCase() === val.toLowerCase()
    );

    if (match) {
      return { isValid: true, bossId: match.id, message: null };
    }

    return {
      isValid: false,
      bossId: null,
      message: 'El número de empleado ingresado no existe.',
    };
  }, [typedBossEmpNo, allEmployees, employee.id, employee.employeeNumber]);

  const handleBlur = () => {
    // Delay hiding suggestions list to let click handlers on suggestion items fire
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const isChanged =
    selectedDeptId !== employee.departmentId ||
    typedBossEmpNo.trim() !== (employee.bossEmployeeNumber || '') ||
    selectedRoleId !== (employee.idRole || '');

  const handleSaveClick = () => {
    if (!validation.isValid) return;
    onSave(selectedDeptId, validation.bossId, selectedRoleId);
  };

  return (
    <tr className="border-b border-gray-100 bg-gray-50">
      <td colSpan={9} className="py-3 px-4">
        <div className="flex flex-wrap items-end gap-6 pl-4">
          {/* Department Select Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Departamento:
            </label>
            <select
              aria-label={`Seleccionar departamento para ${fullName}`}
              value={selectedDeptId || ''}
              onChange={(event) => {
                const val = event.target.value;
                setSelectedDeptId(val === '' ? null : val);
              }}
              disabled={isUpdating}
              className="rounded-lg p-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--blue)] disabled:bg-gray-100 min-w-[200px] shadow-sm transition-all"
            >
              <option value="">Sin departamento</option>
              {departments.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          {/* Role Select Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Rol Asignado:
            </label>
            <select
              aria-label={`Seleccionar rol para ${fullName}`}
              value={selectedRoleId}
              onChange={(event) => {
                setSelectedRoleId(event.target.value);
              }}
              disabled={isUpdating || availableRoles.length === 0}
              className="rounded-lg p-2 text-sm text-gray-900 ring-1 ring-inset ring-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-[var(--blue)] disabled:bg-gray-100 min-w-[200px] shadow-sm transition-all"
            >
              {availableRoles.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}
                </option>
              ))}
            </select>
          </div>

          {/* Manager Autocomplete Search Field */}
          <div className="flex flex-col gap-1.5 min-w-[280px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Jefe inmediato (No. Empleado):
            </label>
            <div className="relative">
              <input
                type="text"
                aria-label={`Ingresar número de empleado del jefe para ${fullName}`}
                placeholder="Ej. Emp001"
                value={typedBossEmpNo}
                onChange={(event) => {
                  setTypedBossEmpNo(event.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={handleBlur}
                disabled={isUpdating}
                className={`w-full rounded-lg p-2 text-sm text-gray-900 ring-1 ring-inset bg-white focus:outline-none focus:ring-2 disabled:bg-gray-100 shadow-sm transition-all ${
                  !validation.isValid && validation.message
                    ? 'ring-red-300 focus:ring-red-500'
                    : 'ring-gray-300 focus:ring-[var(--blue)]'
                }`}
              />
              {/* Autocomplete suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg bg-white py-1 text-sm shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none border border-gray-200">
                  {suggestions.map((suggestion) => {
                    const matchLabel = `${suggestion.employeeNumber} - ${suggestion.name} ${suggestion.lastName}`;
                    return (
                      <li
                        key={suggestion.id}
                        className="cursor-pointer select-none py-2 px-3 text-gray-800 hover:bg-indigo-600 hover:text-white transition-colors"
                        onMouseDown={() => {
                          setTypedBossEmpNo(suggestion.employeeNumber);
                          setShowSuggestions(false);
                        }}
                      >
                        {matchLabel}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {!validation.isValid && validation.message && (
              <span className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                ⚠️ {validation.message}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleSaveClick}
              disabled={isUpdating || !validation.isValid || !isChanged}
              className="shadow-sm"
            >
              {isUpdating ? 'Guardando...' : 'Guardar cambios'}
            </Button>

            <Button
              type="button"
              onClick={onCancel}
              disabled={isUpdating}
              className="!bg-gray-200 !text-gray-900 hover:!bg-gray-300 border border-gray-300 shadow-sm"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </td>
    </tr>
  );
};

export default EmployeeViewTable;
