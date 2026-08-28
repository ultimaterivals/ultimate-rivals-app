# ADR-ATH-015 — Mobile como referência e desktop como adaptação

- **Status:** Accepted
- **Data:** 2026-08-28

## Contexto

A rotina principal do atleta acontece em dispositivos móveis. O desktop pode oferecer mais espaço para organização e descoberta, mas não deve comandar a arquitetura da experiência.

## Decisão

Usar o mobile como referência de UX e tratar o desktop como adaptação funcional do produto mobile. No desktop, a navegação pode expandir Carreira e Ecossistema sem substituir os cinco destinos principais do modelo móvel.

## Consequências

- Decisões de hierarquia, fluxo e interação devem ser validadas primeiro no mobile.
- O desktop pode ampliar composição e navegação, mas não criar um produto administrativo paralelo.
- UAT deve avaliar separadamente mobile e desktop, preservando o mesmo modelo de produto.
