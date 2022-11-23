# Parser de fatura de cartão de crédito (PDF) da XP Investimentos (PDF2CSV)

O script `src/parser.js` é um script em nodeJS que aceita o parâmetro do arquivo PDF e, opcionalmente, uma senha para abrir o arquivo. Ele retorna a saída CSV no console. Assim, basta executar o script da seguinte forma:

```
node parser.js arquivo_fatura.pdf [senha]
```

Observe no final do arquivo que será feito um ouput da soma de todos os valores encontrados para que você possa comparar com o valor total da fatura e ter certeza que todas as transações foram encontradas.

**Créditos: [Daniel Lafraia](https://www.lafraia.com.br/)** 