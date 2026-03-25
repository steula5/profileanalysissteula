import { useState } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { DataPreview } from '@/components/DataPreview';
import { AnalysisDashboard } from '@/components/AnalysisDashboard';
import { ClientDetailAnalysis } from '@/components/ClientDetailAnalysis';
import { parseFile, type DataValidationResult, type OrderRecord } from '@/lib/data-parser';
import { runAnalysis, type AnalysisResult } from '@/lib/analysis-engine';
import { BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<DataValidationResult | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [allRecords, setAllRecords] = useState<OrderRecord[]>([]);

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true);
    setAnalysis(null);
    try {
      let combined: OrderRecord[] = [...allRecords];
      let lastPreview: DataValidationResult | null = null;
      const warningsLote: string[] = [];
      const clientesNoLote = new Set<string>();
      const arquivosNoLote = files.length;

      for (const file of files) {
        const result = await parseFile(file);
        lastPreview = result;
        warningsLote.push(...result.warnings);

        const clientesArquivo = [...new Set(result.records.map(r => r.cliente).filter(Boolean))];
        clientesArquivo.forEach(cliente => clientesNoLote.add(cliente));

        if (clientesArquivo.length > 1) {
          warningsLote.push(`${file.name}: contém ${clientesArquivo.length} clientes; esperado 1 por arquivo.`);
        }

        if (result.errors.length > 0) {
          setPreview(result);
          setIsProcessing(false);
          return;
        }
        // Deduplicate by pedido number
        const existingPedidos = new Set(combined.map(r => r.numeroPedido).filter(Boolean));
        const newRecords = result.records.filter(r => !r.numeroPedido || !existingPedidos.has(r.numeroPedido));
        combined = [...combined, ...newRecords];
      }

      combined = combined.filter(record => record.valor > 0 && record.quantidade > 0);

      if (combined.length === 0) {
        setPreview({
          records: [],
          totalRecords: 0,
          periodo: { inicio: new Date(), fim: new Date() },
          clientesUnicos: 0,
          arquivosNoLote,
          clientesNoLote: clientesNoLote.size,
          validacaoArquivoCliente: arquivosNoLote === clientesNoLote.size ? 'ok' : 'divergente',
          warnings: warningsLote,
          errors: ['Nenhum registro válido encontrado para análise.'],
        });
        return;
      }

      setAllRecords(combined);

      const dates = combined.map(r => r.data.getTime());
      const periodoInicio = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
      const periodoFim = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();
      const consolidatedPreview: DataValidationResult = {
        records: combined,
        totalRecords: combined.length,
        periodo: { inicio: periodoInicio, fim: periodoFim },
        clientesUnicos: new Set(combined.map(r => r.cliente)).size,
        arquivosNoLote,
        clientesNoLote: clientesNoLote.size,
        validacaoArquivoCliente: arquivosNoLote === clientesNoLote.size ? 'ok' : 'divergente',
        warnings: warningsLote.slice(0, 30),
        errors: [],
      };
      setPreview(consolidatedPreview);

      const result = runAnalysis(combined);
      setAnalysis(result);
    } catch (err) {
      setPreview({
        records: [], totalRecords: 0,
        periodo: { inicio: new Date(), fim: new Date() },
        clientesUnicos: 0, warnings: [],
        errors: [`Erro ao processar: ${err instanceof Error ? err.message : 'erro desconhecido'}`],
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto max-w-5xl px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Análise Comercial B2B</h1>
            <p className="text-xs text-muted-foreground">Inteligência de vendas e crescimento de carteira</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-5 max-w-5xl">
        <FileUpload onFilesReady={handleFiles} isProcessing={isProcessing} />
        {preview && <DataPreview data={preview} />}
        {analysis && (
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="cliente">Por Cliente</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <AnalysisDashboard result={analysis} records={allRecords} />
            </TabsContent>

            <TabsContent value="cliente" className="mt-6">
              <ClientDetailAnalysis records={allRecords} clienteProfile={analysis.clientes[0]} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Index;
