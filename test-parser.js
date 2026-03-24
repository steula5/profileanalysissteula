// Teste simples do parser STEULA
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Copiar as funções do parser
function parseDate(val) {
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Simular XLSX SSF parse
    return new Date(2000 + Math.floor(val / 365), (val % 12), val % 28);
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

function parseNumber(val) {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

// Ler arquivo
const wb = XLSX.readFile('src/3791.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('\n=== TESTE DO PARSER STEULA ===\n');
console.log(`Total de linhas no arquivo: ${raw.length}`);

// Simular detecção
const header = String(raw[0]?.[0] || '').toLowerCase();
const lineWithCodProd = raw.slice(0, 20).some(row => 
  String(row?.[0] || '').toLowerCase().includes('cod.prod')
);

console.log(`Cabeçalho: "${raw[0]?.[0]}"`);
console.log(`Detecta formato STEULA? ${header.includes('steula') && lineWithCodProd}`);

// Contar clientes e itens
let clientCount = 0;
let itemCount = 0;
let recordCount = 0;
let clientes = new Set();

for (let i = 0; i < raw.length; i++) {
  const row = raw[i];
  const col0 = String(row?.[0] || '').trim();

  if (col0 === 'Cliente') {
    clientCount++;
    const clienteRow = raw[i + 1];
    const clienteName = String(clienteRow?.[2] || '').trim();
    clientes.add(clienteName || String(clienteRow?.[0] || ''));
    console.log(`\nCliente encontrado: ${clienteName}`);
  }

  if (col0 === 'Cod.Prod.' || col0 === 'Cod.Prod') {
    // Procurar pedido anterior
    let dataStr = '';
    for (let k = Math.max(0, i - 10); k < i; k++) {
      const scanRow = raw[k];
      if (String(scanRow?.[0] || '').trim() === 'Data Emissão:') {
        dataStr = String(scanRow[7] || '').trim();
        break;
      }
    }

    // Contar itens nesta seção
    for (let j = i + 1; j < raw.length; j++) {
      const itemRow = raw[j];
      const itemCod = String(itemRow?.[0] || '').trim();
      
      if (!itemCod || itemCod === 'Cod.Prod.' || itemCod === 'Cliente' || 
          itemCod.toLowerCase().includes('total')) {
        break;
      }
      
      const itemNome = String(itemRow[2] || '').trim();
      const qtdStr = String(itemRow[9] || '').trim();
      const totalStr = String(itemRow[13] || '').trim();

      if (itemNome) {
        itemCount++;
        const quantidade = parseNumber(qtdStr);
        const valor = parseNumber(totalStr);
        if (dataStr && quantidade > 0) {
          recordCount++;
          if (recordCount <= 5) {
            console.log(`  - ${itemNome} | Qtd: ${quantidade} | Val: R$ ${valor}`);
          }
        }
      }
    }
  }
}

console.log(`\n=== RESUMO ===`);
console.log(`Clientes únicos: ${clientes.size}`);
console.log(`Total de linhas "Cod.Prod.": ${clientCount}`);
console.log(`Total de itens processados: ${itemCount}`);
console.log(`Total de registros válidos: ${recordCount}`);
console.log(`\nClientes: ${Array.from(clientes).join(', ')}`);
