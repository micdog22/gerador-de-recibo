# Gerador de Recibo — recibos prontos para imprimir ou salvar em PDF (HTML + JS)

Precisa dar um recibo de aluguel, de um serviço ou de uma venda? Preencha quem recebe, quem paga, o valor e a que ele se refere: a página monta o recibo com o valor por extenso, mostra a folha A4 em tempo real e deixa tudo pronto para imprimir ou salvar em PDF.

Roda inteiro no navegador, sem cadastro e sem enviar seus dados para lugar nenhum.

**Acesse online:** https://micdog22.github.io/gerador-de-recibo/

## Recursos
- Valor por extenso em português correto, de um centavo até 999 trilhões ("mil e duzentos reais", "um milhão de reais", "um real e um centavo").
- Pré-visualização da folha A4 enquanto você digita.
- Botão "Imprimir / Salvar PDF" com estilos próprios de impressão: sai só o recibo, sem os campos da página.
- Opção de duas vias na mesma folha, com linha de corte; se o texto for longo, a letra diminui para caber em meia folha.
- Máscara de CPF e CNPJ (inclusive o CNPJ alfanumérico). Os números são só formatados, não validados.
- Forma de pagamento: Pix, dinheiro, transferência, cartão, boleto ou outra.
- Recebedor com CNPJ deixa o texto no plural ("Recebemos de…", "firmamos").
- Botão "Novo recibo", que limpa os dados do pagamento e avança a numeração (001 → 002).
- Lembra nome, CPF/CNPJ e cidade de quem recebe no próprio navegador (dá para desligar e apagar).
- Tema claro e escuro, funciona no celular.

## Como usar
1. Preencha os dados de quem recebe e de quem paga.
2. Digite o valor (aceita `1.234,56`, `1234.56` ou `R$ 10`) e a que o pagamento se refere.
3. Confira a pré-visualização e clique em **Imprimir / Salvar PDF**.
4. Na janela de impressão, escolha a impressora ou "Salvar como PDF". Se aparecerem data e endereço da página nas margens, desmarque "Cabeçalhos e rodapés".

Exemplo de texto gerado:

> Recebi de **Maria Exemplo**, a importância de **R$ 1.234,56** (mil duzentos e trinta e quatro reais e cinquenta e seis centavos), referente a aluguel de outubro de 2026.

## Como rodar localmente
Na pasta do projeto:

```bash
python3 -m http.server 8000
```

Depois abra http://localhost:8000 (módulos ES não carregam via `file://`).

## Testes
```bash
npm test
```

Usa o `node:test` nativo, sem nenhuma dependência. Os testes cobrem uma tabela extensa de valores por extenso, a leitura dos valores digitados e a montagem do recibo.

## Como funciona
O valor por extenso fica em `src/extenso.js` e usa só aritmética de texto e de inteiros pequenos, então não há erro de ponto flutuante nem limite de precisão até 999 trilhões. As regras seguidas:

- 100 é "cem"; de 101 a 199, "cento e …".
- "e" liga centenas, dezenas e unidades: "trezentos e quarenta e cinco".
- Entre os grupos (mil, milhões…), "e" só aparece antes de um grupo menor que 100 ou de uma centena redonda: 1.200 = "mil e duzentos", 1.099 = "mil e noventa e nove", 1.250 = "mil duzentos e cinquenta", 2.300.000 = "dois milhões e trezentos mil".
- 1.000 é "mil", nunca "um mil".
- Milhões, bilhões e trilhões exatos levam "de": "um milhão de reais", mas "um milhão e quinhentos mil reais".
- Grafias: "dezesseis", "dezessete", "dezenove", "quatorze".

A montagem do texto do recibo fica em `src/recibo.js`; a página (`src/app.js`) só desenha o resultado, sempre como texto puro.

## Contribuindo
Issues e pull requests são bem-vindos.

## Licença
MIT — veja [LICENSE](LICENSE).
