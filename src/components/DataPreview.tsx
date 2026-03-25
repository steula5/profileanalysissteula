import { AlertCircle, CheckCircle, Info, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { DataValidationResult } from '@/lib/data-parser';
import { exportToCSV, exportToExcel } from '@/lib/data-parser';

interface DataPreviewProps {
  data: DataValidationResult;
}

export function DataPreview({ data }: DataPreviewProps) {
  const handleDownloadCSV = () => {
    const csv = exportToCSV(data.records);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dados_${new Date().toISOString().split('T')[0]}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = () => {
    exportToExcel(data.records, `dados_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          Pré-visualização dos Dados
        </CardTitle>
        {data.errors.length === 0 && data.totalRecords > 0 && (
          <div className="flex gap-2">
            <Button onClick={handleDownloadCSV} variant="outline" size="sm" className="gap-2">
              <Download className="w-3 h-3" /> CSV
            </Button>
            <Button onClick={handleDownloadExcel} variant="outline" size="sm" className="gap-2">
              <Download className="w-3 h-3" /> Excel
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <div className="p-3 rounded-md bg-secondary/50">
            <p className="text-lg font-semibold text-foreground">{data.totalRecords.toLocaleString('pt-BR')}</p>
            <p className="text-xs text-muted-foreground">Registros</p>
          </div>
          <div className="p-3 rounded-md bg-secondary/50">
            <p className="text-lg font-semibold text-foreground">{data.clientesUnicos}</p>
            <p className="text-xs text-muted-foreground">Clientes Únicos</p>
          </div>
          <div className="p-3 rounded-md bg-secondary/50">
            <p className="text-sm font-medium text-foreground">
              {data.periodo.inicio.toLocaleDateString('pt-BR')} — {data.periodo.fim.toLocaleDateString('pt-BR')}
            </p>
            <p className="text-xs text-muted-foreground">Período</p>
          </div>
          <div className="p-3 rounded-md bg-secondary/50">
            <p className="text-sm font-medium text-foreground">
              {(data.clientesNoLote ?? 0).toLocaleString('pt-BR')} cliente(s) / {(data.arquivosNoLote ?? 0).toLocaleString('pt-BR')} arquivo(s)
            </p>
            <p className="text-xs text-muted-foreground">Validação Arquivo x Cliente</p>
          </div>
        </div>

        {data.arquivosNoLote !== undefined && data.clientesNoLote !== undefined && (
          <div className={`p-3 rounded-md border mb-3 ${data.validacaoArquivoCliente === 'ok' ? 'bg-accent/10 border-accent/30' : 'bg-destructive/10 border-destructive/20'}`}>
            <p className={`text-sm flex items-center gap-2 ${data.validacaoArquivoCliente === 'ok' ? 'text-foreground' : 'text-destructive'}`}>
              {data.validacaoArquivoCliente === 'ok' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {data.validacaoArquivoCliente === 'ok'
                ? `OK: ${data.arquivosNoLote} arquivo(s) no lote e ${data.clientesNoLote} cliente(s) identificados.`
                : `Divergência: ${data.arquivosNoLote} arquivo(s) no lote para ${data.clientesNoLote} cliente(s) identificados.`}
            </p>
          </div>
        )}

        {data.errors.length > 0 && (
          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 mb-3">
            {data.errors.map((e, i) => (
              <p key={i} className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" /> {e}
              </p>
            ))}
          </div>
        )}

        {data.warnings.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {data.warnings.length} aviso(s)
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {data.warnings.map((w, i) => <li key={i}>• {w}</li>)}
            </ul>
          </details>
        )}

        {data.errors.length === 0 && (
          <p className="text-sm text-foreground flex items-center gap-2 mt-2">
            <CheckCircle className="w-4 h-4 text-accent" /> Dados validados com sucesso
          </p>
        )}
      </CardContent>
    </Card>
  );
}
