import type { OrderRecord } from './data-parser';

export interface ClientProfile {
  nome: string;
  totalValor: number;
  totalQuantidade: number;
  ticketMedio: number;
  numeroPedidos: number;
  itensUnicos: number;
  frequenciaMediaDias: number;
  frequenciaRecenteDias: number | null;
  classificacao: 'A' | 'B' | 'C';
  topItens: { item: string; valor: number; quantidade: number; percentual: number }[];
  tendencia: 'crescimento' | 'queda' | 'estavel';
  confiancaTendencia: 'alta' | 'media' | 'baixa';
  inconsistencias: string[];
}

export interface ItemProfile {
  nome: string;
  totalValor: number;
  totalQuantidade: number;
  clientesUnicos: number;
  frequenciaGlobal: number;
  isAncora: boolean;
}

export interface RepProfile {
  nome: string;
  totalValor: number;
  clientesUnicos: number;
  ticketMedio: number;
  concentracao: number;
  potencialNaoExplorado: string;
}

export interface TemporalComparison {
  periodoInicial: { valor: number; pedidos: number; mixMedio: number };
  periodoRecente: { valor: number; pedidos: number; mixMedio: number };
  mudancas: string[];
}

export interface AnalysisResult {
  resumoExecutivo: string[];
  clientes: ClientProfile[];
  itens: ItemProfile[];
  representantes: RepProfile[];
  temporal: TemporalComparison;
  oportunidades: { 
    descricao: string; 
    topProdutos?: { item: string; valor: number; quantidade: number; percentual: number }[];
    cliente?: string;
    confianca: string; 
    prioridade: number 
  }[];
  riscos: { descricao: string; confianca: string }[];
  cenarios: { conservador: number; potencial: number };
}

function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = key(item);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function calcFrequency(dates: Date[]): number {
  if (dates.length < 2) return 0;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    diffs.push((sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24));
  }
  return diffs.reduce((a, b) => a + b, 0) / diffs.length;
}

function detectTrend(records: OrderRecord[]): { tendencia: 'crescimento' | 'queda' | 'estavel'; confianca: 'alta' | 'media' | 'baixa' } {
  if (records.length < 3) return { tendencia: 'estavel', confianca: 'baixa' };
  const sorted = [...records].sort((a, b) => a.data.getTime() - b.data.getTime());
  const mid = Math.floor(sorted.length / 2);
  const first = sorted.slice(0, mid).reduce((s, r) => s + r.valor, 0);
  const second = sorted.slice(mid).reduce((s, r) => s + r.valor, 0);
  const ratio = second / (first || 1);
  if (ratio > 1.15) return { tendencia: 'crescimento', confianca: ratio > 1.3 ? 'alta' : 'media' };
  if (ratio < 0.85) return { tendencia: 'queda', confianca: ratio < 0.7 ? 'alta' : 'media' };
  return { tendencia: 'estavel', confianca: 'media' };
}

function validateConsistency(records: OrderRecord[]): string[] {
  const issues: string[] = [];
  records.forEach(r => {
    if (r.quantidade > 0 && r.precoUnitario > 0) {
      const avgPrice = records.filter(x => x.item === r.item && x.precoUnitario > 0)
        .reduce((s, x) => s + x.precoUnitario, 0) / records.filter(x => x.item === r.item && x.precoUnitario > 0).length;
      if (avgPrice > 0 && (r.precoUnitario > avgPrice * 3 || r.precoUnitario < avgPrice / 3)) {
        issues.push(`Preço unitário atípico para "${r.item}": R$ ${r.precoUnitario.toFixed(2)} (média: R$ ${avgPrice.toFixed(2)})`);
      }
    }
  });
  return [...new Set(issues)].slice(0, 10);
}

export function runAnalysis(records: OrderRecord[]): AnalysisResult {
  const byClient = groupBy(records, r => r.cliente);
  const byItem = groupBy(records, r => r.item);
  const byVendedor = groupBy(records, r => r.vendedor);
  const totalRevenue = records.reduce((s, r) => s + r.valor, 0);

  // Client profiles
  const clientes: ClientProfile[] = Object.entries(byClient).map(([nome, recs]) => {
    const totalValor = recs.reduce((s, r) => s + r.valor, 0);
    const totalQuantidade = recs.reduce((s, r) => s + r.quantidade, 0);
    const pedidosDatas = [...new Set(recs.map(r => r.dataStr))].map(d => new Date(d));
    const numeroPedidos = pedidosDatas.length;
    const itensUnicos = new Set(recs.map(r => r.item)).size;
    const ticketMedio = numeroPedidos > 0 ? totalValor / numeroPedidos : 0;
    const frequenciaMediaDias = calcFrequency(pedidosDatas);

    const recentDates = pedidosDatas.sort((a, b) => b.getTime() - a.getTime()).slice(0, 3);
    const frequenciaRecenteDias = recentDates.length >= 2 ? calcFrequency(recentDates) : null;

    const itemTotals = Object.entries(groupBy(recs, r => r.item)).map(([item, irecs]) => ({
      item,
      valor: irecs.reduce((s, r) => s + r.valor, 0),
      quantidade: irecs.reduce((s, r) => s + r.quantidade, 0),
      percentual: (irecs.reduce((s, r) => s + r.valor, 0) / totalValor) * 100,
    })).sort((a, b) => b.valor - a.valor);

    const { tendencia, confianca: confiancaTendencia } = detectTrend(recs);
    const inconsistencias = validateConsistency(recs);

    let classificacao: 'A' | 'B' | 'C';
    if (totalValor > totalRevenue * 0.1 && numeroPedidos >= 3) classificacao = 'A';
    else if (totalValor > totalRevenue * 0.03 && itensUnicos <= 3) classificacao = 'B';
    else classificacao = 'C';

    return {
      nome, totalValor, totalQuantidade, ticketMedio, numeroPedidos,
      itensUnicos, frequenciaMediaDias, frequenciaRecenteDias,
      classificacao, topItens: itemTotals.slice(0, 5),
      tendencia, confiancaTendencia, inconsistencias,
    };
  }).sort((a, b) => b.totalValor - a.totalValor);

  // Item profiles
  const allItemClients = Object.entries(byItem).map(([nome, recs]) => {
    const totalValor = recs.reduce((s, r) => s + r.valor, 0);
    return {
      nome,
      totalValor,
      totalQuantidade: recs.reduce((s, r) => s + r.quantidade, 0),
      clientesUnicos: new Set(recs.map(r => r.cliente)).size,
      frequenciaGlobal: recs.length,
      isAncora: totalValor > totalRevenue * 0.15,
    };
  }).sort((a, b) => b.totalValor - a.totalValor);

  // Rep profiles
  const representantes: RepProfile[] = Object.entries(byVendedor)
    .filter(([nome]) => nome.length > 0)
    .map(([nome, recs]) => {
      const totalValor = recs.reduce((s, r) => s + r.valor, 0);
      const clientesSet = new Set(recs.map(r => r.cliente));
      const clienteValores = Object.entries(groupBy(recs, r => r.cliente))
        .map(([, cr]) => cr.reduce((s, r) => s + r.valor, 0))
        .sort((a, b) => b - a);
      const topClienteShare = clienteValores.length > 0 ? clienteValores[0] / totalValor : 0;
      const lowMixClients = [...clientesSet].filter(c => {
        const cr = recs.filter(r => r.cliente === c);
        return new Set(cr.map(r => r.item)).size <= 2;
      }).length;
      return {
        nome, totalValor, clientesUnicos: clientesSet.size,
        ticketMedio: totalValor / clientesSet.size,
        concentracao: topClienteShare * 100,
        potencialNaoExplorado: lowMixClients > 0 ? `${lowMixClients} cliente(s) com mix baixo` : 'Nenhum identificado',
      };
    }).sort((a, b) => b.totalValor - a.totalValor);

  // Temporal
  const sorted = [...records].sort((a, b) => a.data.getTime() - b.data.getTime());
  const mid = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, mid);
  const secondHalf = sorted.slice(mid);
  const calcMixMedio = (recs: OrderRecord[]) => {
    const byC = groupBy(recs, r => r.cliente);
    const mixes = Object.values(byC).map(cr => new Set(cr.map(r => r.item)).size);
    return mixes.length > 0 ? mixes.reduce((a, b) => a + b, 0) / mixes.length : 0;
  };
  const temporal: TemporalComparison = {
    periodoInicial: {
      valor: firstHalf.reduce((s, r) => s + r.valor, 0),
      pedidos: new Set(firstHalf.map(r => r.dataStr)).size,
      mixMedio: calcMixMedio(firstHalf),
    },
    periodoRecente: {
      valor: secondHalf.reduce((s, r) => s + r.valor, 0),
      pedidos: new Set(secondHalf.map(r => r.dataStr)).size,
      mixMedio: calcMixMedio(secondHalf),
    },
    mudancas: [],
  };
  const valChange = temporal.periodoRecente.valor / (temporal.periodoInicial.valor || 1);
  if (valChange > 1.1) temporal.mudancas.push('Aumento de faturamento no período recente');
  else if (valChange < 0.9) temporal.mudancas.push('Queda de faturamento no período recente');
  const mixChange = temporal.periodoRecente.mixMedio - temporal.periodoInicial.mixMedio;
  if (mixChange < -0.5) temporal.mudancas.push('Redução do mix médio de produtos');
  if (mixChange > 0.5) temporal.mudancas.push('Aumento do mix médio de produtos');

  // Opportunities
  const oportunidades = clientes
    .filter(c => c.classificacao === 'B')
    .map(c => {
      const topProdutos = c.topItens.slice(0, 3).map(p => p.item).join(', ');
      return {
        descricao: `${c.nome}: potencial de aumento de mix (atualmente ${c.itensUnicos} itens). Principais produtos: ${topProdutos}`,
        topProdutos: c.topItens.slice(0, 3),
        cliente: c.nome,
        confianca: 'media' as string,
        prioridade: 1,
      };
    });
  clientes.filter(c => c.tendencia === 'crescimento').forEach(c => {
    const topProdutos = c.topItens.slice(0, 3).map(p => p.item).join(', ');
    oportunidades.push({
      descricao: `${c.nome}: em crescimento, consolidar com os principais itens (${topProdutos})`,
      topProdutos: c.topItens.slice(0, 3),
      cliente: c.nome,
      confianca: c.confiancaTendencia,
      prioridade: 2,
    });
  });
  
  // Adicionar oportunidades de novos itens para clientes A e B
  clientes.filter(c => c.classificacao === 'A' && c.itensUnicos < 10).forEach(c => {
    const topProdutos = c.topItens.slice(0, 3).map(p => p.item).join(', ');
    oportunidades.push({
      descricao: `${c.nome}: cliente chave, oportunidade de diversificar mix. Atuais: ${topProdutos}`,
      topProdutos: c.topItens.slice(0, 3),
      cliente: c.nome,
      confianca: 'alta' as string,
      prioridade: 3,
    });
  });

  // Risks
  const riscos = clientes
    .filter(c => c.totalValor > totalRevenue * 0.2)
    .map(c => ({
      descricao: `Concentração: ${c.nome} representa ${((c.totalValor / totalRevenue) * 100).toFixed(1)}% do faturamento`,
      confianca: 'alta',
    }));
  clientes.filter(c => c.tendencia === 'queda').forEach(c => {
    riscos.push({
      descricao: `${c.nome}: tendência de queda identificada`,
      confianca: c.confiancaTendencia,
    });
  });

  // Scenarios
  const currentAnnual = totalRevenue;
  const conservador = currentAnnual * 1.05;
  const potencial = currentAnnual * 1.2 + clientes.filter(c => c.classificacao === 'B').length * (currentAnnual * 0.02);

  // Executive summary
  const resumoExecutivo = [
    `Base com ${records.length} registros, ${clientes.length} clientes, período de ${sorted[0]?.dataStr || '?'} a ${sorted[sorted.length - 1]?.dataStr || '?'}.`,
    `Faturamento total: R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
    `${clientes.filter(c => c.classificacao === 'A').length} clientes Grupo A, ${clientes.filter(c => c.classificacao === 'B').length} Grupo B (potencial), ${clientes.filter(c => c.classificacao === 'C').length} Grupo C.`,
    `${allItemClients.filter(i => i.isAncora).length} produto(s) âncora identificado(s).`,
    temporal.mudancas.length > 0 ? `Mudanças: ${temporal.mudancas.join('; ')}.` : 'Sem mudanças significativas entre períodos.',
  ];

  return {
    resumoExecutivo, clientes, itens: allItemClients,
    representantes, temporal, oportunidades, riscos,
    cenarios: { conservador, potencial },
  };
}
