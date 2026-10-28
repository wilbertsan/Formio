# Studio 3D (Shell)

## Escopo

Shell principal do Studio em `/studio` — orquestra ferramentas de geração 3D.

## Componentes (genéricos — compartilhados por todas as ferramentas)

- `StudioPage.tsx` — monta layout, mantém estado do projeto, lazily carrega a ferramenta ativa
- `StudioTopbar.tsx` — nome do projeto + botões Exportar/Salvar
- `StudioViewport.tsx` — Canvas R3F + OrbitControls + Grid + Environment
- `StudioStatusBar.tsx` — dimensões em mm + dicas de navegação

## Ferramentas

Localizadas em `tools/<categoria>/<ferramenta>/`. Cada ferramenta exporta:
- Componente de painel (parâmetros)
- Schema Zod
- Função de build (gera geometria)
- Componente de preview

## Checklist — Adicionar nova ferramenta

1. Criar pasta em `tools/<categoria>/<nova-ferramenta>/`
2. Criar `AGENTS.md` descrevendo a ferramenta
3. Implementar schema, build, preview, painel
4. Atualizar `StudioPage` para importar e renderizar a nova ferramenta
5. Adicionar testes em `tests/features/studio/tools/<categoria>/<nova-ferramenta>/`
6. Atualizar `docs/frontend/studio.md`

## Decisões

- 1 unidade Three.js = 1 mm
- React.lazy para code-splitting por ferramenta (~600KB Three.js)
- Estado local com useReducer + Zod (sem estado global)
- Tema claro: painéis brancos, bordas neutral-200, ativos brand-600 (#1F6E0B)
- Mock de fiber/drei nos testes (jsdom sem WebGL)

## Fora de escopo

Landing, cadastro, backend/banco.
