import { Download, TrendingUp, TrendingDown, Minus, Users, Package, UserCheck, AlertTriangle, Target, BarChart3, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { AnalysisResult } from '@/lib/analysis-engine';
import type { OrderRecord } from '@/lib/data-parser';
import { generateSummaryPDF, generateClientPDF } from '@/lib/pdf-generator';

interface Props {
  result: AnalysisResult;
  records?: OrderRecord[];
}

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const classBadge = (c: 'A' | 'B' | 'C') => {
  const map = { A: 'default', B: 'secondary', C: 'outline' } as const;
  return <Badge variant={map[c]}>Grupo {c}</Badge>;
};
const trendIcon = (t: string) => {
  if (t === 'crescimento') return <TrendingUp className="w-4 h-4 text-accent" />;
  if (t === 'queda') return <TrendingDown className="w-4 h-4 text-destructive" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
};
const confBadge = (c: string) => {
  const colors = { alta: 'default', media: 'secondary', baixa: 'outline' } as const;
  return <Badge variant={colors[c as keyof typeof colors] || 'outline'} className="text-xs">{c}</Badge>;
};

export function AnalysisDashboard({ result }: Props) {
  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analise_comercial_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadSummaryPDF = async () => {
    try {
      await generateSummaryPDF(result, `resumo_executivo_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  const handleDownloadClientPDF = async (clienteNome: string) => {
    try {
      const cliente = result.clientes.find(c => c.nome === clienteNome);
      if (cliente) {
        await generateClientPDF(cliente, cliente.topItens, `cliente_${clienteNome.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-foreground">Análise Comercial</h2>
        <div className="flex gap-2">
          <Button onClick={handleDownloadSummaryPDF} variant="outline" className="gap-2">
            <FileText className="w-4 h-4" /> PDF Resumo
          </Button>
          <Button onClick={handleDownloadJson} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> JSON
          </Button>
        </div>
      </div>

      {/* Executive Summary */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Resumo Executivo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm text-foreground">
            {result.resumoExecutivo.map((r, i) => <li key={i}>• {r}</li>)}
          </ul>
        </CardContent>
      </Card>

      {/* Scenarios */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Cenário Conservador</p>
            <p className="text-xl font-bold text-foreground">{fmt(result.cenarios.conservador)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Cenário Potencial</p>
            <p className="text-xl font-bold text-primary">{fmt(result.cenarios.potencial)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="clientes">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="clientes" className="gap-1"><Users className="w-3 h-3" /> Clientes</TabsTrigger>
          <TabsTrigger value="itens" className="gap-1"><Package className="w-3 h-3" /> Itens</TabsTrigger>
          <TabsTrigger value="reps" className="gap-1"><UserCheck className="w-3 h-3" /> Representantes</TabsTrigger>
          <TabsTrigger value="oport" className="gap-1"><Target className="w-3 h-3" /> Oportunidades</TabsTrigger>
        </TabsList>

        <TabsContent value="clientes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">Pedidos</TableHead>
                    <TableHead className="text-right">Mix</TableHead>
                    <TableHead>Tendência</TableHead>
                    <TableHead className="text-right">Freq. (dias)</TableHead>
                    <TableHead className="text-center">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.clientes.slice(0, 20).map((c, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium max-w-[200px] truncate">{c.nome}</TableCell>
                      <TableCell>{classBadge(c.classificacao)}</TableCell>
                      <TableCell className="text-right">{fmt(c.totalValor)}</TableCell>
                      <TableCell className="text-right">{fmt(c.ticketMedio)}</TableCell>
                      <TableCell className="text-right">{c.numeroPedidos}</TableCell>
                      <TableCell className="text-right">{c.itensUnicos}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-1">
                          {trendIcon(c.tendencia)}
                          <span className="text-xs">{c.tendencia}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{c.frequenciaMediaDias > 0 ? c.frequenciaMediaDias.toFixed(0) : '—'}</TableCell>
                      <TableCell className="text-center">
                        <Button 
                          onClick={() => handleDownloadClientPDF(c.nome)} 
                          variant="ghost" 
                          size="sm"
                          className="h-6 px-2"
                        >
                          <FileText className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="itens" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Clientes</TableHead>
                    <TableHead className="text-right">Frequência</TableHead>
                    <TableHead>Âncora</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.itens.slice(0, 20).map((item, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium max-w-[250px] truncate">{item.nome}</TableCell>
                      <TableCell className="text-right">{fmt(item.totalValor)}</TableCell>
                      <TableCell className="text-right">{item.totalQuantidade.toLocaleString('pt-BR')}</TableCell>
                      <TableCell className="text-right">{item.clientesUnicos}</TableCell>
                      <TableCell className="text-right">{item.frequenciaGlobal}</TableCell>
                      <TableCell>{item.isAncora ? <Badge>Âncora</Badge> : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reps" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {result.representantes.length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">Dados de representante não encontrados na base.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Representante</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                      <TableHead className="text-right">Clientes</TableHead>
                      <TableHead className="text-right">Ticket/Cliente</TableHead>
                      <TableHead className="text-right">Concentração</TableHead>
                      <TableHead>Potencial</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.representantes.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell className="text-right">{fmt(r.totalValor)}</TableCell>
                        <TableCell className="text-right">{r.clientesUnicos}</TableCell>
                        <TableCell className="text-right">{fmt(r.ticketMedio)}</TableCell>
                        <TableCell className="text-right">{r.concentracao.toFixed(1)}%</TableCell>
                        <TableCell className="text-sm">{r.potencialNaoExplorado}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="oport" className="mt-4 space-y-4">
          {/* Temporal */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Análise Temporal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Período Inicial</p>
                  <p>Valor: {fmt(result.temporal.periodoInicial.valor)}</p>
                  <p>Pedidos: {result.temporal.periodoInicial.pedidos}</p>
                  <p>Mix médio: {result.temporal.periodoInicial.mixMedio.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs mb-1">Período Recente</p>
                  <p>Valor: {fmt(result.temporal.periodoRecente.valor)}</p>
                  <p>Pedidos: {result.temporal.periodoRecente.pedidos}</p>
                  <p>Mix médio: {result.temporal.periodoRecente.mixMedio.toFixed(1)}</p>
                </div>
              </div>
              {result.temporal.mudancas.length > 0 && (
                <div className="mt-3 space-y-1">
                  {result.temporal.mudancas.map((m, i) => (
                    <p key={i} className="text-sm flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-primary" /> {m}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Opportunities */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Oportunidades Identificadas</CardTitle></CardHeader>
            <CardContent>
              {result.oportunidades.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma oportunidade clara identificada.</p>
              ) : (
                <ul className="space-y-4">
                  {result.oportunidades.map((o, i) => (
                    <li key={i} className="text-sm border-l-4 border-primary pl-3 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{o.cliente || 'Geral'}</p>
                          <p className="text-xs text-muted-foreground mt-1">{o.descricao}</p>
                          {o.topProdutos && o.topProdutos.length > 0 && (
                            <div className="mt-2 bg-secondary/30 p-2 rounded">
                              <p className="text-xs font-semibold mb-1">Top 3 Produtos:</p>
                              <ul className="text-xs space-y-1">
                                {o.topProdutos.map((p, j) => (
                                  <li key={j} className="text-muted-foreground">
                                    {j + 1}. {p.item} - {fmt(p.valor)} ({p.quantidade} un.)
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          {confBadge(o.confianca)}
                          {o.prioridade === 1 && <Badge className="bg-destructive/20 text-destructive">P1</Badge>}
                          {o.prioridade === 2 && <Badge className="bg-yellow-500/20 text-yellow-600">P2</Badge>}
                          {o.prioridade === 3 && <Badge className="bg-blue-500/20 text-blue-600">P3</Badge>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
