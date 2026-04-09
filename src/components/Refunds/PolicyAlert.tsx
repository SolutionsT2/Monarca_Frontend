interface Violation {
  policy_code: string;
  message: string;
  severity: 'BLOCKING' | 'WARNING';
  evaluated_value?: any;
}

export const PolicyAlert = ({ violations }: { violations: Violation[] }) => {
  if (!violations || violations.length === 0) return null;

  return (
    <div className="mt-6 space-y-3 animate-fade-in" id="policy-alerts-container">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-red-600">🛡️</span>
        <h4 className="text-sm font-bold text-gray-700 uppercase tracking-tight">
          Validación del Motor de Políticas
        </h4>
      </div>
      
      {violations.map((v, index) => (
        <div 
          key={index} 
          className={`p-4 rounded-lg border-l-4 shadow-sm transition-all ${
            v.severity === 'BLOCKING' 
              ? 'bg-red-50 border-red-500 text-red-900' 
              : 'bg-orange-50 border-orange-400 text-orange-900'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <span className="text-lg">{v.severity === 'BLOCKING' ? '❌' : '⚠️'}</span>
              <div>
                <p className="text-sm font-bold leading-snug">{v.message}</p>
                
                {/* Lógica para mostrar valores evaluados (Lo nuevo del BE) */}
                {v.evaluated_value && (
                  <div className="mt-2 text-xs font-medium opacity-80 bg-white/50 p-2 rounded border border-current/10">
                    {v.policy_code === 'TOTAL_LTE_ADVANCE' && (
                      <p>Total detectado: <span className="font-bold">${v.evaluated_value.total_vouchers}</span> | Límite (Anticipo): <span className="font-bold">${v.evaluated_value.advance_money}</span></p>
                    )}
                    {v.policy_code === 'VOUCHER_DATE_WITHIN_TRIP_WINDOW' && (
                      <p>Rango del viaje: <span className="font-bold">{new Date(v.evaluated_value.trip_start_date).toLocaleDateString()}</span> al <span className="font-bold">{new Date(v.evaluated_value.trip_end_date).toLocaleDateString()}</span></p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-white/50">
                {v.severity}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};