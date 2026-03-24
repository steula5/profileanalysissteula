# 📋 Guia de Uso - Parser de Arquivos Excel

## Problema Resolvido

O aplicativo estava retornando erro ao tentar processar o arquivo `3791.xlsx`:
```
Coluna obrigatória não encontrada: CLIENTE. Colunas disponíveis: STEULA, , , , ...
```

**Causa**: O arquivo tinha um formato especial de relatório da STEULA, não um formato tabular simples.

## Solução Implementada

O parser agora suporta **dois formatos** de arquivo:

### 1️⃣ Formato Simples (Recomendado Padrão)

Para novos uploads, use este formato tabular:

```
| CLIENTE      | DATA       | ITEM        | QUANTIDADE | VALOR   |
|--------------|------------|-------------|-----------|---------|
| Cliente A    | 01/01/2024 | Produto 1   | 10        | 100,00  |
| Cliente A    | 15/01/2024 | Produto 2   | 5         | 250,00  |
| Cliente B    | 20/01/2024 | Produto 3   | 15        | 75,50   |
```

**Nomes de Coluna Aceitos:**
- `CLIENTE`: cliente, nome cliente, razão social, customer, nome, code cliente
- `DATA`: data, data pedido, data do pedido, dt pedido, emissão
- `ITEM`: item, produto, descrição, product, material
- `QUANTIDADE`: quantidade, qtd, qty, qtde, quant
- `VALOR`: valor, total, total pedido, valor total, vlr total, amount

**Arquivo Exemplo:** `exemplo-formato-simples.xlsx` (gerado automaticamente)

---

### 2️⃣ Formato STEULA (Relatórios Importados)

Agora também aceita relatórios em formato STEULA com estrutura complexa:
- ✅ Múltiplos clientes em um arquivo
- ✅ Múltiplos pedidos por cliente
- ✅ Metadata de cliente (contato, localização)
- ✅ Informações de pedido (data, vendedor, NF)

**Exemplo:** Arquivo `3791.xlsx` now works! ✓

---

## Como Usar

### Upload de Arquivo
1. Acesse o aplicativo em `http://localhost:8080`
2. Clique em **"Selecionar Arquivos"** ou arraste e solte um `.xlsx` ou `.csv`
3. Clique em **"Analisar Base de Pedidos"**
4. O sistema detectará automaticamente o formato

### Validação
- Se a detecção falhar, verifique se as colunas obrigatórias estão presentes
- Para formato STEULA: não altere a estrutura do relatório

---

## Validação de Dados

O parser verifica:
- ✅ Datas válidas (formatos: DD/MM/YY, DD/MM/YYYY, DD-MM-YY)
- ✅ Números com separadores (R$ 1.000,00 → 1000,00)
- ✅ Registros duplicados ou inválidos
- ✅ Período de data (início e fim)
- ✅ Contagem de clientes únicos

---

## Formato de Saída

Após processamento, você verá:
```
Registros: 82
Clientes Únicos: X
Período: 01/01/2024 — 31/03/2024
```

Com dados estruturados:
```typescript
{
  cliente: string;
  data: Date;
  item: string;
  quantidade: number;
  valor: number;
  precoUnitario: number;
  vendedor?: string;
  numeroPedido?: string;
}
```

---

## Troubleshooting

### "Coluna não encontrada"
→ Use o formato simples ou verifique nomes de coluna

### "0 Registros"
→ Arquivo pode estar vazio ou com formato não reconhecido

### Datas inválidas
→ Use formato DD/MM/YYYY ou deixe como data no Excel

### Quantidades zeradas
→ Linhas com qty=0 e valor=0 serão ignoradas

---

## Próximos Passos

- [ ] Adicionar suporte para múltiplas abas Excel
- [ ] Validação customizável de regras
- [ ] Export em CSV/PDF
- [ ] Análise avançada de tendências
