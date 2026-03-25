import * as XLSX from 'xlsx';

export interface OrderRecord {
  cliente: string;
  dataStr: string;
  data: Date;
  valor: number;
  item: string;
  quantidade: number;
  vendedor: string;
  numeroPedido: string;
  precoUnitario: number;
}

export interface DataValidationResult {
  records: OrderRecord[];
  totalRecords: number;
  periodo: { inicio: Date; fim: Date };
  clientesUnicos: number;
  warnings: string[];
  errors: string[];
}

const COLUMN_MAP: Record<string, string[]> = {
  cliente: ['cliente', 'nome cliente', 'razão social', 'razao social', 'customer', 'nome', 'client', 'cod cliente', 'código cliente'],
  data: ['data', 'data pedido', 'data do pedido', 'dt pedido', 'date', 'emissão', 'emissao', 'dt emissão'],
  valor: ['valor', 'total', 'total pedido', 'valor total', 'vlr total', 'amount', 'valor pedido', 'vlr pedido', 'vl total'],
  item: ['item', 'produto', 'descrição', 'descricao', 'product', 'desc produto', 'material', 'desc item', 'nome produto'],
  quantidade: ['quantidade', 'qtd', 'qty', 'qtde', 'quant', 'quantity'],
  vendedor: ['vendedor', 'representante', 'rep', 'seller', 'salesperson', 'consultor', 'cod vendedor'],
  numeroPedido: ['pedido', 'numero pedido', 'nro pedido', 'num pedido', 'order', 'nº pedido', 'nr pedido', 'cod pedido'],
};

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function matchColumn(header: string, candidates: string[]): boolean {
  const h = normalize(header);
  return candidates.some(c => normalize(c) === h);
}

function mapHeaders(headers: string[]): Record<string, number> {
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    for (const [field, candidates] of Object.entries(COLUMN_MAP)) {
      if (!map[field] && matchColumn(h, candidates)) {
        map[field] = i;
      }
    }
  });
  return map;
}

function parseDate(val: unknown): Date | null {
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) return new Date(d.y, d.m - 1, d.d);
  }
  if (typeof val === 'string') {
    const parts = val.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (parts) {
      const y = parts[3].length === 2 ? 2000 + parseInt(parts[3]) : parseInt(parts[3]);
      return new Date(y, parseInt(parts[2]) - 1, parseInt(parts[1]));
    }
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function parseNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function detectSteulaFormat(raw: unknown[][]): boolean {
  if (raw.length < 12) return false;
  const header = String(raw[0]?.[0] || '').toLowerCase();
  const lineWithCodProd = raw.slice(0, 20).some(row => 
    String(row?.[0] || '').toLowerCase().includes('cod.prod') || 
    String(row?.[0] || '').toLowerCase() === 'cod.prod.'
  );
  return header.includes('steula') && lineWithCodProd;
}

function parseSteulaFormat(raw: unknown[][]): DataValidationResult {
  const records: OrderRecord[] = [];
  const warnings: string[] = [];
  let currentCliente = '';
  let currentClienteNum = '';

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i] as string[];
    if (!row) continue;

    const col0 = String(row[0] || '').trim();

    // Detectar linha de cliente
    if (col0 === 'Cliente') {
      const clienteRow = raw[i + 1] as string[];
      if (clienteRow) {
        currentClienteNum = String(clienteRow[0] || '').trim();
        // Cliente pode estar em col 0 com nome na mesma string ou em col 2
        const clienteStr = String(clienteRow[0] || '');
        const partes = clienteStr.split(' ');
        currentClienteNum = partes[0]; // Número
        // Tentar pegar nome em col 2
        const clienteName = String(clienteRow[2] || '').trim();
        currentCliente = clienteName || clienteStr;
      }
      continue;
    }

    // Detectar cabeçalho de itens e extrair valores relacionados
    if (col0 === 'Cod.Prod.' || col0 === 'Cod.Prod') {
      // Procurar informações de pedido antes desta seção (até 12 linhas atrás)
      let pedidoData: Date | null = null;
      let numeroPedido = '';
      let vendedor = '';

      for (let k = Math.max(0, i - 12); k < i; k++) {
        const scanRow = raw[k] as string[];
        const scanCol0 = String(scanRow?.[0] || '').trim();
        
        // Procurar data em "Data Emissão:" na coluna 5 (índice 5)
        if (scanCol0 === 'Data Emissão:' || scanCol0.includes('Data Emissão')) {
          // Tentar múltiplas colunas
          let dataStr = String(scanRow[7] || '').trim() || String(scanRow[5] || '').trim() || String(scanRow[6] || '').trim();
          const parsed = parseDate(dataStr);
          if (parsed) pedidoData = parsed;
        }
        
        // Procurar número do documento em "Documento:"
        if (scanCol0 === 'Documento:' || scanCol0 === 'Nº NF') {
          numeroPedido = String(scanRow[2] || '').trim();
        }
        
        // Procurar vendedor
        if (scanCol0 === 'Vendedor:' || scanCol0.includes('Vendedor')) {
          vendedor = String(scanRow[5] || '').trim() || String(scanRow[1] || '').trim();
        }
      }

      // Se não encontrou data, usar hoje
      if (!pedidoData) {
        pedidoData = new Date();
        warnings.push(`Seção sem data em linha ${i}, usando data atual`);
      }

      // Processar itens
      for (let j = i + 1; j < raw.length; j++) {
        const itemRow = raw[j] as string[];
        if (!itemRow) break;

        const itemCod = String(itemRow[0] || '').trim();
        
        // Para de ler quando encontra a próxima seção ou cliente
        if (!itemCod || itemCod === 'Cod.Prod.' || itemCod === 'Cliente' || 
            itemCod.toLowerCase().includes('total de cr') || itemCod === 'Documento:') {
          break;
        }
        
        const itemNome = String(itemRow[2] || '').trim();
        const qtdStr = String(itemRow[9] || '').trim();
        const totalStr = String(itemRow[13] || '').trim();

        const quantidade = parseNumber(qtdStr);
        const valor = parseNumber(totalStr);

        if (itemNome && (quantidade > 0 || valor > 0)) {
          records.push({
            cliente: currentCliente || 'Desconhecido',
            dataStr: pedidoData.toISOString().split('T')[0],
            data: pedidoData,
            valor,
            item: itemNome,
            quantidade,
            vendedor: vendedor,
            numeroPedido: numeroPedido,
            precoUnitario: quantidade !== 0 ? valor / quantidade : 0,
          });
        }
      }
    }
  }

  const dates = records.length > 0 ? records.map(r => r.data.getTime()) : [Date.now()];
  const clientes = new Set(records.map(r => r.cliente));

  return {
    records,
    totalRecords: records.length,
    periodo: { 
      inicio: new Date(Math.min(...dates)), 
      fim: new Date(Math.max(...dates)) 
    },
    clientesUnicos: clientes.size,
    warnings,
    errors: records.length === 0 ? ['Nenhum registro encontrado no arquivo STEULA'] : [],
  };
}

export function parseFile(file: File): Promise<DataValidationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (raw.length < 2) {
          reject(new Error('Arquivo vazio ou sem dados suficientes'));
          return;
        }

        // Verificar se é formato STEULA
        if (detectSteulaFormat(raw)) {
          const result = parseSteulaFormat(raw);
          resolve(result);
          return;
        }

        const headers = (raw[0] as string[]).map(String);
        const colMap = mapHeaders(headers);
        const warnings: string[] = [];
        const errors: string[] = [];

        const required = ['cliente', 'data', 'valor', 'item', 'quantidade'];
        for (const f of required) {
          if (colMap[f] === undefined) {
            errors.push(`Coluna obrigatória não encontrada: ${f.toUpperCase()}. Colunas disponíveis: ${headers.join(', ')}`);
          }
        }
        if (errors.length > 0) {
          resolve({ records: [], totalRecords: 0, periodo: { inicio: new Date(), fim: new Date() }, clientesUnicos: 0, warnings, errors });
          return;
        }

        const records: OrderRecord[] = [];
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i] as unknown[];
          if (!row || row.every(c => c === '' || c === null || c === undefined)) continue;

          const clienteVal = row[colMap.cliente];
          const dataVal = row[colMap.data];
          const valorVal = row[colMap.valor];
          const itemVal = row[colMap.item];
          const qtdVal = row[colMap.quantidade];
          const vendedorVal = colMap.vendedor !== undefined ? row[colMap.vendedor] : '';
          const pedidoVal = colMap.numeroPedido !== undefined ? row[colMap.numeroPedido] : '';

          const parsedDate = parseDate(dataVal);
          if (!parsedDate) {
            warnings.push(`Linha ${i + 1}: data inválida "${dataVal}"`);
            continue;
          }

          const valor = parseNumber(valorVal);
          const quantidade = parseNumber(qtdVal);

          if (valor === 0 && quantidade === 0) {
            warnings.push(`Linha ${i + 1}: valor e quantidade zerados`);
            continue;
          }
          if (quantidade < 0) {
            warnings.push(`Linha ${i + 1}: quantidade negativa (${quantidade})`);
          }

          const precoUnitario = quantidade !== 0 ? valor / quantidade : 0;

          records.push({
            cliente: String(clienteVal || '').trim(),
            dataStr: parsedDate.toISOString().split('T')[0],
            data: parsedDate,
            valor,
            item: String(itemVal || '').trim(),
            quantidade,
            vendedor: String(vendedorVal || '').trim(),
            numeroPedido: String(pedidoVal || '').trim(),
            precoUnitario,
          });
        }

        const dates = records.map(r => r.data.getTime());
        const clientes = new Set(records.map(r => r.cliente));
        if (records.length === 0 && errors.length === 0) {
          errors.push('Nenhum registro válido encontrado no arquivo. Verifique colunas e conteúdo.');
        }
        const periodoInicio = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
        const periodoFim = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

        resolve({
          records,
          totalRecords: records.length,
          periodo: { inicio: periodoInicio, fim: periodoFim },
          clientesUnicos: clientes.size,
          warnings: warnings.slice(0, 20),
          errors,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsArrayBuffer(file);
  });
}

export function exportToCSV(records: OrderRecord[]): string {
  const headers = ['Cliente', 'Data', 'Item', 'Quantidade', 'Valor', 'Preço Unitário', 'Vendedor', 'Número Pedido'];
  const rows = records.map(r => [
    r.cliente,
    r.dataStr,
    r.item,
    r.quantidade.toString().replace('.', ','),
    r.valor.toFixed(2).replace('.', ','),
    r.precoUnitario.toFixed(2).replace('.', ','),
    r.vendedor || '',
    r.numeroPedido || '',
  ]);
  
  const csvContent = [
    headers.join(';'),
    ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';')),
  ].join('\n');
  
  return csvContent;
}

export function exportToExcel(records: OrderRecord[], filename: string = 'export.xlsx'): void {
  const data = records.map(r => ({
    Cliente: r.cliente,
    Data: r.dataStr,
    Item: r.item,
    Quantidade: r.quantidade,
    Valor: r.valor,
    'Preço Unitário': r.precoUnitario,
    Vendedor: r.vendedor,
    'Número Pedido': r.numeroPedido,
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');
  
  // Ajustar largura das colunas
  ws['!cols'] = [
    { wch: 25 },
    { wch: 12 },
    { wch: 30 },
    { wch: 12 },
    { wch: 12 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 },
  ];

  XLSX.writeFile(wb, filename);
}
