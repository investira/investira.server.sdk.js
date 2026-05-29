# Instruções para Código JavaScript

Estas regras devem ser consideradas ao sugerir ou alterar código no projeto.

## 1. Prefixos Obrigatórios

- Parâmetros de função: usar prefixo `p`.
- Variáveis locais dentro de funções: usar prefixo `x`.
- Variáveis locais fora de funções: usar prefixo `w` exceto quando forem referencias para import ou require de dependências. Nestes casos, usar o nome da dependência.
- Funções locais/auxiliares: usar prefixo `pv`.
- Retornos em Promises (`then`/`catch`): usar prefixo `r`.

## 2. Documentação no Código

- Incluir documentação da própria função.
- Priorizar comentários claros e úteis.
- Documentar também trechos linha a linha, pricipalmente 'if's.
- Documentação no idioma portugues-BR.

## 3. Uso de Promises e `await`

- Evitar `await` para chamadas de Promise quando houver alternativa com `return`, `then` e `catch`.
- `await` pode ser usado em loop quando realmente necessário.

## 4. Regras de `if`

- Não usar `if` com comando em linha única.
- Sempre usar bloco com chaves `{}`.

## 5. Formatação

- Não usar outro formatador de código; o padrão oficial é `Prettier`.
- Quando criar funções locais/auxiliares, procure inclui-las no fim dos respectivos arquivos.

## 6. Antes de criar novas funções analiser se há similares nas libs investira.

- Verificar se já existe uma função com a mesma finalidade.
- Se existir, modificar o arquivo existente.
- Se não existir, criar novo arquivo.

## 7. Qualidade do código.

- Não crie código duplicado ou funções iquais em arquivos diferentes. Procure organizar o código sem duplicar função.

## 8. Código legado

- Não crie código para tratamento de código legado, a não ser que faça parte do pedido do usuário.

## 9. API

- Na criação de endpoints de api utilize snake case minúscula como padrão de nome.
