import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, X, Users } from 'lucide-react';
import type { OrderRecord } from '@/lib/data-parser';
import { exportToCSV, exportToExcel } from '@/lib/data-parser';

interface Props {
  records: OrderRecord[];
}

export function RepresentativeFilter({ records }: Props) {
  const [selectedRep, setSelectedRep] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Get unique representatives
  const uniqueReps = [...new Set(records.map(r => r.vendedor).filter(Boolean))].sort();
  const filteredReps = uniqueReps.filter(r => 
    r.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const repRecords = selectedRep ? records.filter(r => r.vendedor === selectedRep) : [];

  // Stats for representative
  const repStats = selectedRep ? {
    totalValor: repRecords.reduce((sum, r) => sum + r.valor, 0),
    totalQtd: repRecords.reduce((sum, r) => sum + r.quantidade, 0),
    pedidos: new Set(repRecords.map(r => r.dataStr)).size,
    clientesUnicos: new Set(repRecords.map(r => r.cliente)).size,
    itensUnicos: new Set(repRecords.map(r => r.item)).size,
    clientes: [...new Set(repRecords.map(r => r.cliente))],
  } : null;

  const handleDownloadCSV = () => {
    if (selectedRep) {
      const csv = exportToCSV(repRecords);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `representante_${selectedRep.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleDownloadExcel = () => {
    if (selectedRep) {
      exportToExcel(repRecords, `representante_${selectedRep.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
    }
  };

  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Representative Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" />
            Filtrar por Representante
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar Representante</label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite o nome do representante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              {searchTerm && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Representantes Disponíveis ({filteredReps.length})</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto p-2 border border-border rounded-md bg-secondary/20">
              {filteredReps.length > 0 ? (
                filteredReps.map(rep => (
                  <Button
                    key={rep}
                    onClick={() => setSelectedRep(rep)}
                    variant={selectedRep === rep ? 'default' : 'outline'}
                    className="justify-start h-auto py-2 px-3 text-xs text-left"
                  >
                    <span className="truncate">{rep}</span>
                  </Button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground col-span-3 text-center py-4">
                  {searchTerm ? 'Nenhum representante encontrado' : 'Sem representantes'}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Representative Statistics */}
      {repStats && selectedRep && (
        <>
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{selectedRep}</CardTitle>
                <div className="flex gap-2">
                  <Button onClick={handleDownloadCSV} variant="outline" size="sm" className="gap-1">
                    <Download className="w-3 h-3" /> CSV
                  </Button>
                  <Button onClick={handleDownloadExcel} variant="outline" size="sm" className="gap-1">
                    <Download className="w-3 h-3" /> Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-3 rounded-md bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <p className="text-lg font-bold text-foreground">{fmt(repStats.totalValor)}</p>
                </div>
                <div className="p-3 rounded-md bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Clientes</p>
                  <p className="text-lg font-bold text-foreground">{repStats.clientesUnicos}</p>
                </div>
                <div className="p-3 rounded-md bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                  <p className="text-lg font-bold text-foreground">{repStats.pedidos}</p>
                </div>
                <div className="p-3 rounded-md bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Itens Únicos</p>
                  <p className="text-lg font-bold text-foreground">{repStats.itensUnicos}</p>
                </div>
                <div className="p-3 rounded-md bg-secondary/50">
                  <p className="text-xs text-muted-foreground">Qtd Total</p>
                  <p className="text-lg font-bold text-foreground">{repStats.totalQtd}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Clientes do Representante */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Clientes ({repStats.clientes.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {repStats.clientes.map((cliente, i) => (
                  <Badge key={i} variant="outline">
                    {cliente}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Detalhes de Pedidos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pedidos do Representante ({repRecords.length})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Preço Unitário</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {repRecords.slice(0, 50).map((record, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm">{record.dataStr}</TableCell>
                      <TableCell className="text-sm max-w-[150px] truncate">{record.cliente}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{record.item}</TableCell>
                      <TableCell className="text-right text-sm">{record.quantidade}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(record.valor)}</TableCell>
                      <TableCell className="text-right text-sm">{fmt(record.precoUnitario)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {repRecords.length > 50 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Mostrando 50 de {repRecords.length} pedidos
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
