# Instruções para Código JavaScript

Estas regras devem ser consideradas ao sugerir ou alterar código no projeto.

## 1. Prefixos Obrigatórios

- Parâmetros de função: usar prefixo `p`.
- Variáveis locais dentro de funções: usar prefixo `x`.
- Variáveis locais fora de funções: usar prefixo `w` exceto quando forem referencias para import ou require de dependências. Nestes casos, usar o nome da dependência.
- Funções locais/auxiliares: usar prefixo `pv`.
- Variáveis de retornos em Promises (`then`/`catch`): usar prefixo `r`.

## 2. Documentação no Código

- Incluir documentação da própria função e dos parâmetros.
- Priorizar comentários claros e úteis.
- Documentar também trechos linha a linha (inline), pricipalmente 'if's.
- Documentação no idioma portugues-BR.

## 3. Uso de Promises e `await`

- Procure utilizar Promise encadedas, com `return`, `then` e `catch` ao invés de `await`, respeitando a ordem de execução e o acesso às variáveis.
- `await` deve ser usado em iteradores (for, while) quando realmente necessário. Neste caso verifique se há o tratamento de erros para evitar erro no nodejs.

## 4. Padronização de código

- Não utilize `Object.prototype.hasOwnProperty.call()` diretamente. Use a função `hasOwnProperty()` da própria variável.
- Não usar `if` com comando em linha única. Sempre usar bloco com chaves `{}`.
- Use `let` ou `const` para declarar variáveis. Nunca use `var`.
- Use `gLog` para registrar mensagens semmpre que disponível no projeto que for backend.
- Procure simplificar o código sempre que possível, evitando fragmentação excessiva.
- Constantes devem ser declaradas no início do arquivo devem ser sempre em letras maiúsculas.
- Não crie 'alias' desnecessários para tentar ser mais permissivo. Mantenha a validação original.
- Procure manter uma única fonte de verdade, não replicando variáveis em múltiplos lugares e nomes diferentes.
- Só crie cópias dos parametros recebidos nas funções se for necessário modificar o parametro.

## 5. Formatação

- Não usar outro formatador de código; o padrão oficial é `Prettier`.
- Quando criar funções locais/auxiliares (Prefixo 'pv'), procure inclui-las no fim dos respectivos arquivos.

## 6. Antes de criar novas funções analiser se há similares nas libs investira ou em outros arquivos do projeto.

- Verificar se já existe uma função com a mesma finalidade.
- Se existir, modificar o arquivo existente.
- Se não existir, criar novo arquivo.
- Não crie código duplicado ou funções iquais em arquivos diferentes. Procure organizar o código sem duplicar função.

## 7. Código legado

- Não crie tratamento para código legado, a não ser que o usuário solicite explicitamente.

## 8. API

- Na criação de endpoints de api utilize snake case minúscula como padrão de nome.
- As rotas devem ser criadas em arquivos separados e importadas no arquivo principal.
- As regras de negócio devem ser implementadas em arquivos separados, normalmente em uma pasta `services`, e importadas nos arquivos de rotas.
- Não crie alias para os atributos definidos na api.
- Não crie endpoints que retornem dados sensíveis sem autenticação.
- Não crie endpoints que retornem dados de outros usuários sem autenticação.
- Atualize a documentação da api sempre que criar ou modificar endpoints.
