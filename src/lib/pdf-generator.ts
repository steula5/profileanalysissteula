import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AnalysisResult, ClientProfile } from './analysis-engine';

const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export async function generateClientPDF(client: ClientProfile, topProducts: Array<{ item: string; valor: number; quantidade: number; percentual: number }>, filename: string): Promise<void> {
  const doc = new jsPDF();
  let yPos = 15;

  // Header
  doc.setFontSize(16);
  doc.text('Relatório de Cliente', 15, yPos);
  yPos += 10;

  // Client info
  doc.setFontSize(12);
  doc.text(`Cliente: ${client.nome}`, 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.text([
    `Classificação: Grupo ${client.classificacao}`,
    `Total de Pedidos: ${client.numeroPedidos}`,
    `Itens Únicos: ${client.itensUnicos}`,
  ], 15, yPos);
  yPos += 20;

  // Financial Data
  doc.setFontSize(12);
  doc.text('Dados Financeiros', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.text([
    `Valor Total: ${fmt(client.totalValor)}`,
    `Quantidade Total: ${client.totalQuantidade}`,
    `Ticket Médio: ${fmt(client.ticketMedio)}`,
    `Frequência Média: ${client.frequenciaMediaDias?.toFixed(1) || '?'} dias`,
  ], 15, yPos);
  yPos += 25;

  // Trend
  doc.setFontSize(12);
  doc.text('Tendência', 15, yPos);
  yPos += 7;

  const trendLabel = client.tendencia === 'crescimento' ? '📈 Crescimento' : client.tendencia === 'queda' ? '📉 Queda' : '➡️ Estável';
  doc.setFontSize(10);
  doc.text(`${trendLabel} (Confiança: ${client.confiancaTendencia})`, 15, yPos);
  yPos += 15;

  // Top Products
  doc.setFontSize(12);
  doc.text('3 Produtos Mais Comprados', 15, yPos);
  yPos += 7;

  doc.setFontSize(9);
  topProducts.slice(0, 3).forEach((prod, idx) => {
    doc.text(`${idx + 1}. ${prod.item}`, 15, yPos);
    yPos += 5;
    doc.text(`   Valor: ${fmt(prod.valor)} | Qtd: ${prod.quantidade} | ${prod.percentual.toFixed(1)}%`, 15, yPos);
    yPos += 5;
  });
  yPos += 5;

  // Opportunities
  if (client.inconsistencias && client.inconsistencias.length > 0) {
    doc.setFontSize(12);
    doc.text('Observações', 15, yPos);
    yPos += 7;

    doc.setFontSize(9);
    client.inconsistencias.slice(0, 3).forEach(issue => {
      const lines = doc.splitTextToSize(issue, 180);
      doc.text(lines, 15, yPos);
      yPos += 5 * lines.length;
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 15, 285);

  doc.save(filename);
}

export async function generateSummaryPDF(result: AnalysisResult, filename: string): Promise<void> {
  const doc = new jsPDF();
  let yPos = 15;

  // Title
  doc.setFontSize(18);
  doc.text('Análise Comercial - Resumo Executivo', 15, yPos);
  yPos += 12;

  // Summary
  doc.setFontSize(11);
  result.resumoExecutivo.forEach(line => {
    const lines = doc.splitTextToSize(line, 180);
    doc.text(lines, 15, yPos);
    yPos += 5 * lines.length + 2;
  });
  yPos += 5;

  // Scenarios
  doc.setFontSize(12);
  doc.text('Cenários Financeiros', 15, yPos);
  yPos += 7;

  doc.setFontSize(10);
  doc.text([
    `Cenário Conservador (5%): ${fmt(result.cenarios.conservador)}`,
    `Cenário Potencial (20%): ${fmt(result.cenarios.potencial)}`,
  ], 15, yPos);
  yPos += 20;

  // Top Clients
  doc.setFontSize(12);
  doc.text('Top 5 Clientes', 15, yPos);
  yPos += 7;

  doc.setFontSize(9);
  result.clientes.slice(0, 5).forEach((cliente, idx) => {
    doc.text(`${idx + 1}. ${cliente.nome}`, 15, yPos);
    yPos += 5;
    doc.text(`   Valor: ${fmt(cliente.totalValor)} | Grupo: ${cliente.classificacao} | Tendência: ${cliente.tendencia}`, 15, yPos);
    yPos += 5;
  });
  yPos += 5;

  // Top Products
  doc.setFontSize(12);
  doc.text('Top 5 Produtos', 15, yPos);
  yPos += 7;

  doc.setFontSize(9);
  result.itens.slice(0, 5).forEach((item, idx) => {
    doc.text(`${idx + 1}. ${item.nome}`, 15, yPos);
    yPos += 5;
    doc.text(`   Valor: ${fmt(item.totalValor)} | Clientes: ${item.clientesUnicos} | Freq: ${item.frequenciaGlobal}x`, 15, yPos);
    yPos += 5;
    if (yPos > 270) {
      doc.addPage();
      yPos = 15;
    }
  });
  yPos += 10;

  // Opportunities
  if (result.oportunidades.length > 0) {
    if (yPos > 260) {
      doc.addPage();
      yPos = 15;
    }

    doc.setFontSize(12);
    doc.text('Oportunidades Identificadas', 15, yPos);
    yPos += 7;

    doc.setFontSize(9);
    result.oportunidades.slice(0, 10).forEach(oport => {
      const lines = doc.splitTextToSize(`• ${oport.descricao}`, 180);
      doc.text(lines, 15, yPos);
      yPos += 5 * lines.length;
      if (yPos > 270) {
        doc.addPage();
        yPos = 15;
      }
    });
  }

  // Footer
  doc.setFontSize(8);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 15, 285);

  doc.save(filename);
}

export async function generateHTMLElementToPDF(element: HTMLElement, filename: string): Promise<void> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: [canvas.width * 0.264583, canvas.height * 0.264583],
    });

    pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
    pdf.save(filename);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    throw new Error('Falha ao gerar PDF');
  }
}
