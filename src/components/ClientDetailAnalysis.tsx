import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart3, Search, X } from 'lucide-react';
import type { OrderRecord } from '@/lib/data-parser';
import type { ClientProfile as ClientProfileType } from '@/lib/analysis-engine';
import { generateClientPDF } from '@/lib/pdf-generator';

interface Props {
  records: OrderRecord[];
  clienteProfile?: ClientProfileType;
}

export function ClientDetailAnalysis({ records, clienteProfile }: Props) {
  const [selectedClienteName, setSelectedClienteName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Get unique clients
  const uniqueClients = [...new Set(records.map(r => r.cliente))].sort();
  const filteredClients = uniqueClients.filter(c => 
    c.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedClient = selectedClienteName || filteredClients[0];
  const clientRecords = selectedClient ? records.filter(r => r.cliente === selectedClient) : [];

  // Análise do cliente selecionado
  const stats = selectedClient ? {
    totalValor: clientRecords.reduce((sum, r) => sum + r.valor, 0),
    totalQtd: clientRecords.reduce((sum, r) => sum + r.quantidade, 0),
    pedidos: new Set(clientRecords.map(r => r.dataStr)).size,
    itensUnicos: new Set(clientRecords.map(r => r.item)).size,
    datasPedidos: [...new Set(clientRecords.map(r => r.dataStr))].sort().reverse(),
    representantes: [...new Set(clientRecords.map(r => r.vendedor).filter(Boolean))],
    topItens: Object.entries(
      clientRecords.reduce((acc, r) => {
        acc[r.item] = (acc[r.item] || { valor: 0, qtd: 0 });
        acc[r.item].valor += r.valor;
        acc[r.item].qtd += r.quantidade;
        return acc;
      }, {} as Record<string, { valor: number; qtd: number }>)
    )
      .map(([item, data]) => ({
        item,
        valor: data.valor,
        quantidade: data.qtd,
        percentual: (data.valor / clientRecords.reduce((s, r) => s + r.valor, 0)) * 100,
      }))
      .sort((a, b) => b.valor - a.valor),
  } : null;

  const handleDownloadPDF = async () => {
    if (clienteProfile && selectedClient) {
      try {
        await generateClientPDF(clienteProfile, clienteProfile.topItens, `cliente_${selectedClient.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (error) {
        console.error('Erro ao gerar PDF:', error);
      }
    }
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Client Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="w-4 h-4" />
            Análise Detalhada por Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar Cliente</label>
            <Input
              placeholder="Digite para filtrar clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Selecionar Cliente</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
              {filteredClients.map(cliente => (
                <Button
                  key={cliente}
                  onClick={() => {
                    setSelectedClienteName(cliente);
                    setSearchTerm('');
                  }}
                  variant={selectedClient === cliente ? 'default' : 'outline'}
                  className="justify-start h-auto py-2 px-3 text-xs text-left"
                >
                  <span className="truncate">{cliente}</span>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Client Statistics */}
      {stats && selectedClient && (
        <>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{selectedClient}</CardTitle>
                <Button onClick={handleDownloadPDF} variant="outline" size="sm" className="gap-1">
                  📄 PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 rounded-md bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-lg font-bold text-foreground">{fmt(stats.totalValor)}</p>
                </div>
                <div className="p-3 rounded-md bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                  <p className="text-lg font-bold text-foreground">{stats.pedidos}</p>
                </div>
                <div className="p-3 rounded-md bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Itens Únicos</p>
                  <p className="text-lg font-bold text-foreground">{stats.itensUnicos}</p>
                </div>
                <div className="p-3 rounded-md bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Quantidade Total</p>
                  <p className="text-lg font-bold text-foreground">{stats.totalQtd}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Produtos Mais Comprados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topItens.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium max-w-[300px] truncate">{item.item}</TableCell>
                      <TableCell className="text-right">{fmt(item.valor)}</TableCell>
                      <TableCell className="text-right">{item.quantidade}</TableCell>
                      <TableCell className="text-right">{item.percentual.toFixed(1)}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Representantes */}
          {stats.representantes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Representantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stats.representantes.map((rep, i) => (
                    <Badge key={i} variant="outline">
                      {rep || 'Sem representante'}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Orders */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico de Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Representante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientRecords.slice(0, 20).map((record, i) => (
                    <TableRow key={i}>
                      <TableCell>{record.dataStr}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{record.item}</TableCell>
                      <TableCell className="text-right">{record.quantidade}</TableCell>
                      <TableCell className="text-right">{fmt(record.valor)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{record.vendedor || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
