# CadQuery

# Objetivo

Este documento define os padrões oficiais para geração de modelos 3D no projeto 3DFormio.

Todo modelo deve ser construído utilizando CadQuery.

O objetivo é produzir modelos:

- Paramétricos
- Robustos
- Manifold
- Imprimíveis
- Escaláveis
- Rápidos de gerar

Nunca gerar modelos apenas para visualização.

Todo sólido deve estar pronto para impressão 3D.

---

# Filosofia

Todo modelo é um conjunto de parâmetros.

Nunca utilizar medidas fixas quando puderem ser parametrizadas.

Sempre escrever código reutilizável.

Modelos devem ser previsíveis.

Modelos devem aceitar diferentes tamanhos.

---

# Fluxo de Geração

Receber parâmetros

↓

Validar

↓

Normalizar unidades

↓

Criar Sketch

↓

Extrusão

↓

Operações booleanas

↓

Acabamentos

↓

Validação

↓

Exportar STL

↓

Salvar

---

# Estrutura Recomendada

Cada modelo deve possuir

class BaseModel

↓

Validação

↓

Construção

↓

Exportação

↓

Metadata

Nunca misturar geração e API.

---

# Organização

cad/

base.py

models/

services/

validators/

exporters/

utils/

tests/

---

# Unidade

Todas as medidas são em milímetros.

Nunca utilizar centímetros.

Nunca utilizar polegadas.

---

# Origem

Preferir origem no centro da peça.

Sempre manter orientação consistente.

Plano XY

Vista Superior

Eixo Z

Altura

---

# Sketch

Sempre iniciar pelo menor sketch possível.

Evitar sketches complexos.

Preferir união de sólidos.

---

# Extrusão

Utilizar extrude sempre que possível.

Evitar loft quando não necessário.

Extrusão deve ser positiva.

---

# Revolução

Utilizar revolve apenas para peças cilíndricas.

Exemplos

Copos

Anéis

Tubos

Roldanas

---

# Loft

Utilizar apenas quando necessário.

Loft aumenta tempo de geração.

Loft pode gerar STL inválido.

---

# Sweep

Utilizar para

Cabos

Tubulações

Perfis

Nunca utilizar sweep em curvas extremamente complexas.

---

# Fillet

Utilizar para melhorar impressão.

Evitar fillets muito pequenos.

Raio mínimo recomendado

0.5 mm

---

# Chamfer

Preferir chamfer quando possível.

Mais rápido que fillet.

Mais fácil de imprimir.

---

# Boolean

Operações

union

cut

intersect

Sempre minimizar quantidade de operações.

---

# Espessura

Nunca gerar paredes menores que

0.8 mm

Ideal

1.2 mm

Peças estruturais

2 mm ou mais

---

# Texto

Texto deve utilizar fontes simples.

Evitar fontes extremamente detalhadas.

Texto pequeno

mínimo

4 mm

Altura mínima

0.6 mm

---

# Furos

Sempre atravessar completamente a peça.

Nunca deixar furos parcialmente fechados.

---

# Tolerâncias

Peças de encaixe

Folga mínima

0.20 mm

Folga ideal

0.30 mm

Peças móveis

0.40 mm

---

# STL

Sempre exportar binário.

Nunca ASCII.

---

# Malha

Utilizar resolução suficiente.

Evitar STL gigantes.

Objetivo

menos de

10 MB

---

# Preview

Preview deve utilizar malha simplificada.

Nunca gerar STL completo apenas para preview.

---

# Performance

Prioridades

Menor tempo

Menor memória

Menor STL

Menor quantidade de boolean

---

# Modelos Paramétricos

Todo parâmetro deve possuir

Nome

Descrição

Valor mínimo

Valor máximo

Valor padrão

Tipo

---

# Validação

Nunca aceitar

Altura negativa

Espessura negativa

Texto vazio

Escala zero

Valores infinitos

NaN

---

# Exceções

Sempre retornar mensagens amigáveis.

Nunca retornar traceback.

---

# Regras

Sempre validar parâmetros antes da geração.

Nunca gerar sólido inválido.

Nunca exportar STL vazio.

Nunca salvar arquivos temporários.

---

# Exportação

Formato

STL

No futuro

STEP

3MF

OBJ

SVG

---

# Compatibilidade

Todo STL deve abrir corretamente em

PrusaSlicer

OrcaSlicer

Cura

Bambu Studio

---

# Impressão

Modelos devem minimizar suportes.

Sempre que possível utilizar base plana.

Evitar balanços superiores a

45°

---

# Escala

Modelo deve manter proporção.

Nunca deformar automaticamente.

---

# Tempo

Objetivo

menos de

5 segundos

por geração.

---

# Memória

Evitar criar objetos duplicados.

Liberar referências desnecessárias.

---

# Reutilização

Criar funções auxiliares para

Furos

Bordas

Arredondamentos

Bases

Texto

Suportes

---

# Organização

Cada modelo deve possuir

metadata

author

version

description

category

tags

parameters

---

# Categorias

Exemplos

Cookie Cutter

Embosser

Stamp

Keychain

Lithophane

Box

Organizer

Sign

Toy

Decoration

---

# Testes

Todo modelo deve possuir testes.

Validar

Dimensões

Volume

Bounding Box

Tempo

Exportação

---

# Definition of Done

Um modelo somente está pronto quando

✓ Gera STL

✓ STL válido

✓ Manifold

✓ Sem auto interseções

✓ Compatível com slicers

✓ Parametrizado

✓ Testado

✓ Documentado

✓ Performance aceitável

✓ Código reutilizável

---

# Regras para o OpenCode

Sempre pensar primeiro na impressão 3D.

Nunca apenas na geometria.

Toda decisão deve considerar

Tempo de geração

Consumo de memória

Qualidade da impressão

Facilidade de manutenção

Reutilização

Experiência do usuário.

O objetivo do projeto é gerar modelos profissionais utilizando o menor número possível de operações geométricas mantendo alta qualidade de impressão.
