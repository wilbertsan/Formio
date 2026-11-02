# Design: Chaveiro sem Relevo (conteúdo elevado fixo em 1mm)

**Data:** 2026-11-02
**Status:** Aprovado
**Ferramenta:** Studio 3D > Chaveiros > Chaveiro

---

## 1. Objetivo

Remover a função de relevo do chaveiro. O conteúdo (textos e ícones SVG) passa a ser sempre elevado, com altura fixa de 1mm. Não há mais seletor Elevado/Gravado nem controle de profundidade.

---

## 2. Requisitos

- Remover `textMode` e `reliefDepth` do schema, dos defaults e do estado.
- Remover o bloco **Relevo** do painel.
- Conteúdo sempre elevado: extrusão de 1mm sobre a face frontal.
- Export STL sempre mescla base + conteúdo quando houver conteúdo.
- Remover o caminho de gravação por CSG do chaveiro (a dependência continua para outras ferramentas).
- Remover `mode` do resultado do build.
- Atualizar testes e documentação.

---

## 3. Schema e Domínio

`src/features/studio/tools/chaveiros/chaveiro/schema.ts`:

- Remover `textMode: z.enum(['raised', 'engraved'])`.
- Remover `reliefDepth: z.number().min(0.4).max(2)`.
- Remover `export type KeychainTextMode`.
- Adicionar:
  ```ts
  export const CONTENT_DEPTH = 1
  ```
- Remover `textMode` e `reliefDepth` de `defaultKeychainParams`.

Não há persistência, então não é necessário migrar dados.

---

## 4. Build e Export

### `autoFit.ts`
Substituir as quatro ocorrências de `ctx.params.reliefDepth` por `CONTENT_DEPTH` (importado de `schema.ts`).

### `buildKeychain.ts`
- Remover `import { Evaluator, SUBTRACTION, Brush } from 'three-bvh-csg'`.
- Remover `ENGRAVE_EPSILON`.
- Remover `mode` de `BuildKeychainResult`.
- Substituir `contentZ(params, surfaceTop)` por `contentZ(surfaceTop)`:
  ```ts
  function contentZ(surfaceTop: number): number {
    return surfaceTop - 0.01
  }
  ```
- Caminho regular: remover todos os ramos `params.textMode === 'raised'` / `engraved`. Sempre retornar:
  ```ts
  mergedBase.computeVertexNormals()
  content?.computeVertexNormals()
  return { base: mergedBase, content, contentItems, pieceBB, hole }
  ```
- Caminho nome: extrudar o conteúdo com `CONTENT_DEPTH`; sempre posicionar em `z = contentZ(params.thickness)` e retornar base/content.
- Manter a subtração do furo da argola na base e no conteúdo.
- `surfaceTop` regular continua `params.thickness + 0.2`; no nome, `params.thickness`.

### `exportStl.ts`
```ts
const geometries = geometry.content ? [geometry.base, geometry.content] : [geometry.base]
```
Remover a checagem de `mode`.

---

## 5. UI

`StudioPanel.tsx`:
- Remover o `Accordion.Item value="relevo"` inteiro.
- Seções restantes: Conteúdo, Formato, Argola, Aparência.
- Adicionar nota no bloco Conteúdo:
  ```tsx
  <Text fontSize="xs" color="font.tertiary">
    Textos e ícones elevados em 1 mm.
  </Text>
  ```

---

## 6. Testes

- `schema.test.ts`: remover testes de `reliefDepth`; adicionar `CONTENT_DEPTH === 1` e ausência de `textMode`/`reliefDepth` nos defaults.
- `autoFit.test.ts`: sem mudanças de comportamento.
- `buildKeychain.test.ts`: remover mock/CSG e cenários `engraved`; adicionar teste de profundidade fixa de 1mm.
- `exportStl.test.ts`: remover cenário `engraved`; manter os casos com/sem conteúdo.
- `useKeychain.test.tsx`: remover `reliefDepth` e `mode` dos mocks.
- `TextPositionEditor.test.tsx`: remover `mode` do mock de geometria.
- `StudioPanel.test.tsx`: remover teste do bloco Relevo; assertar ausência de "Relevo" e presença da nota.

---

## 7. Documentação

Atualizar:
- `src/features/studio/tools/chaveiros/chaveiro/AGENTS.md`
- `src/features/studio/tools/chaveiros/AGENTS.md`
- `docs/frontend/studio.md`

Remover `textMode`, `reliefDepth`, "Elevado/Gravado" e "profundidade do relevo". Documentar altura fixa de 1mm.

---

## 8. Decisões

- Constante única `CONTENT_DEPTH` em `schema.ts` para auto-fit e build.
- Remover o CSG apenas do chaveiro; topo de bolo, placa e marcador continuam usando.
- Export sempre base + conteúdo, pois não existe mais o modo gravado.
- Sem migração/backward compatibility.

## 9. Fora de escopo

- Alterar o comportamento de relevo de outras ferramentas.
- Persistência, backend ou autenticação.
