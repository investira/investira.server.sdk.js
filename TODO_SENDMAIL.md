# TODO_SENDMAIL

## Resumo Executivo

### Fase A

|     | Item | Descrição                                                                 |
| --- | ---- | ------------------------------------------------------------------------- |
| C   | 1    | Mapear o comportamento atual do helper `lib/helpers/emailSender.js`       |
| C   | 2    | Identificar lacunas entre o contrato atual e a funcionalidade desejada    |
| C   | 3    | Confirmar se deve existir fallback para código legado antes de implementar |
| C   | 4    | Consolidar escopo, premissas, dependências e restrições da alteração      |

### Fase B

|     | Item | Descrição                                                                 |
| --- | ---- | ------------------------------------------------------------------------- |
| C   | 1    | Definir o contrato final aceito pelo método `send()`                      |
| C   | 2    | Planejar o encaminhamento de `replyTo` e `reply_to`                       |
| C   | 3    | Planejar o suporte a `attachments` e conteúdo inline com `cid`            |
| C   | 4    | Planejar o retorno da Promise com `info` do provedor e `messageId`        |

### Fase C

|     | Item | Descrição                                                                 |
| --- | ---- | ------------------------------------------------------------------------- |
| C   | 1    | Ajustar a montagem do payload enviado ao `nodemailer`                     |
| C   | 2    | Preservar compatibilidade com chamadas atuais que já usam a SDK           |
| C   | 3    | Revisar logs, tratamento de erro e estrutura de retorno                   |
| C   | 4    | Atualizar documentação de uso da funcionalidade                           |

### Fase D

|     | Item | Descrição                                                                 |
| --- | ---- | ------------------------------------------------------------------------- |
| C   | 1    | Criar ou ajustar testes para `replyTo` e `reply_to`                       |
| C   | 2    | Criar ou ajustar testes para anexos e imagens inline com `cid`            |
| C   | 3    | Validar o retorno com `info` do provedor e `messageId`                    |
| C   | 4    | Executar validação final dos critérios de aceite                          |

### Fase E

|     | Item | Descrição                                                                 |
| --- | ---- | ------------------------------------------------------------------------- |
|     | 1    | Manter este documento sincronizado com a evolução da atividade            |
|     | 2    | Registrar mudanças de escopo, estratégia ou prioridade                    |
|     | 3    | Atualizar status e resultados parciais conforme a implementação avançar   |
|     | 4    | Encerrar a atividade com conferência final dos itens e critérios          |

## Objetivo da Implementação

### Descrição detalhada da funcionalidade

Implementar evolução no helper `lib/helpers/emailSender.js` para que o método `send()` aceite e encaminhe corretamente os campos `replyTo` e `reply_to`, aceite `attachments` no mesmo envio e permita anexos de arquivos e imagens inline com `cid`. Além disso, a Promise retornada pelo envio deverá passar a devolver os dados relevantes do provedor SMTP, com destaque para `info` e `messageId`, para que o consumidor possa rastrear o resultado do envio sem depender de comportamento implícito.

Hoje o helper encaminha apenas `from`, `to`, `subject`, `html`, `cc` e `bcc` para o `sendMail()`, e resolve a Promise sem payload de sucesso. A implementação futura deverá ampliar esse contrato sem iniciar mudanças funcionais em outros fluxos antes da definição da estratégia final.

### Escopo da implementação

- Evoluir `lib/helpers/emailSender.js`.
- Definir o contrato de entrada do método `send()` para `replyTo`, `reply_to` e `attachments`.
- Definir como será tratado o encaminhamento de anexos comuns e imagens inline com `cid`.
- Definir o contrato de saída da Promise com `info` do provedor e `messageId`.
- Atualizar a documentação e os testes relacionados ao helper.
- Manter este documento como fonte de acompanhamento da atividade.

### Premissas, dependências e restrições

- O ponto principal da alteração está concentrado em `lib/helpers/emailSender.js`.
- O helper atual usa `nodemailer` internamente e já possui integração funcional com `sendMail()`.
- A evolução deve preservar o comportamento atual de envio para campos já suportados.
- A implementação deverá prever fallback para código legado, preservando compatibilidade com chamadas que usam apenas o contrato já existente.
- O documento não deve registrar dados sensíveis nem informações operacionais confidenciais.
- A atividade atual contempla somente documentação, acompanhamento e planejamento; a implementação técnica ainda não deve ser iniciada.

### Critérios de aceite

- Existir definição clara do contrato de entrada aceito pelo `emailSender.send()`.
- O planejamento contemplar encaminhamento de `replyTo` e `reply_to`.
- O planejamento contemplar encaminhamento de `attachments`, incluindo arquivos e imagens inline com `cid`.
- O planejamento contemplar retorno com `info` do provedor e `messageId`.
- Existir decisão registrada sobre criar ou não fallback para código legado antes do início da implementação.
- Os testes planejados cobrirem os novos campos e o novo retorno.
- O resumo executivo permanecer sincronizado com os itens detalhados nas fases.

## Fases da Implementação

### Fase A

- [C] 1. Mapear o comportamento atual de `lib/helpers/emailSender.js`, incluindo payload enviado ao `sendMail()` e formato de retorno da Promise.
- [C] 2. Identificar as lacunas entre o helper atual e a funcionalidade desejada para `replyTo`, `reply_to`, `attachments`, `cid`, `info` e `messageId`.
- [C] 3. Perguntar se deve ou não ser criado fallback para código legado antes de iniciar a implementação.
- [C] 4. Consolidar o escopo técnico, premissas, dependências e restrições da alteração neste documento.

#### Resultado atual da Fase A

- O helper atual encaminha `from`, `to`, `subject`, `html`, `cc` e `bcc`.
- O helper atual não encaminha `replyTo`, `reply_to` nem `attachments`.
- O helper atual resolve a Promise sem retornar o `info` do provedor nem o `messageId`.
- A alteração principal, pelo contexto atual, tende a ficar concentrada em `lib/helpers/emailSender.js`.
- Foi definido que a implementação deverá prever fallback para código legado.

### Fase B

- [C] 1. Definir o contrato final do método `send()`, incluindo precedência ou normalização entre `replyTo` e `reply_to`.
- [C] 2. Definir como o helper deverá encaminhar `replyTo` e `reply_to` ao payload final do `sendMail()`.
- [C] 3. Definir como `attachments` será aceito e repassado, cobrindo anexos tradicionais e imagens inline com `cid`.
- [C] 4. Definir o contrato de retorno da Promise, incluindo `info` do provedor e `messageId`.

#### Resultado atual da Fase B

- O método `send()` deverá continuar aceitando os campos já suportados hoje e passar a aceitar também `replyTo`, `reply_to` e `attachments`.
- Para compatibilidade e fallback legado, chamadas que usem apenas `from`, `to`, `subject`, `html`, `cc` e `bcc` deverão continuar funcionando sem necessidade de adaptação.
- Quando `replyTo` e `reply_to` forem informados ao mesmo tempo, a estratégia planejada é priorizar `replyTo` e usar `reply_to` como fallback de compatibilidade.
- O payload final encaminhado ao `sendMail()` deverá conter a propriedade `replyTo`, resolvida a partir de `pEmail.replyTo` ou, na ausência dela, de `pEmail.reply_to`.
- O campo `attachments` deverá ser repassado ao `nodemailer` sem transformar a estrutura esperada pelo provedor, permitindo anexos tradicionais e imagens inline com `cid`.
- O retorno de sucesso da Promise deverá passar a expor o objeto `info` do provedor e também um campo `messageId`, derivado preferencialmente de `info.messageId`.
- Para fallback legado, o sucesso do envio deverá continuar resolvendo a Promise sem exigir que consumidores antigos passem a enviar novos campos obrigatórios.
- Como referência histórica, o `CHANGELOG.md` registra que o helper já recebeu ampliação incremental anteriormente, incluindo suporte a `cc` e `bcc` na versão `2.8.17`.

### Fase C

- [C] 1. Ajustar a montagem do payload interno enviado ao `sendMail()` para incluir os novos campos aprovados.
- [C] 2. Preservar compatibilidade com os consumidores atuais da SDK para os campos já suportados.
- [C] 3. Revisar logs, tratamento de erro e assinatura de retorno para refletir o novo comportamento.
- [C] 4. Atualizar exemplos de uso e documentação técnica do helper após a conclusão da implementação.

#### Resultado atual da Fase C

- O helper `lib/helpers/emailSender.js` passou a montar o payload em função dedicada, com encaminhamento explícito de `replyTo` e `attachments`.
- Foi implementado fallback de compatibilidade para `reply_to`, com priorização de `replyTo` quando ambos forem informados.
- O retorno de sucesso do método `send()` passou a devolver `{ info, messageId }`, preservando compatibilidade com consumidores antigos que apenas aguardam a resolução da Promise.
- A documentação pública foi atualizada em `README.md` com exemplo de uso de `replyTo`, `attachments` e leitura de `messageId`.
- O histórico técnico da alteração foi registrado em `CHANGELOG.md` com nova entrada da versão `2.8.53`.

### Fase D

- [C] 1. Criar ou ajustar testes cobrindo o encaminhamento de `replyTo` e `reply_to`.
- [C] 2. Criar ou ajustar testes cobrindo `attachments`, anexos comuns e imagens inline com `cid`.
- [C] 3. Criar ou ajustar testes cobrindo o retorno de sucesso com `info` do provedor e `messageId`.
- [C] 4. Validar os critérios de aceite antes de encerrar a atividade.

#### Resultado atual da Fase D

- Foi criado o teste `_tests/test_emailSender.js` com simulação local de `nodemailer.createTransport()`, sem dependência de SMTP externo.
- O teste valida o fallback de `reply_to`, a prioridade de `replyTo`, o repasse de `attachments`, a preservação de `cid` inline e a normalização do retorno com `info` e `messageId`.
- A execução local com `node _tests/test_emailSender.js` foi concluída com sucesso.
- Os critérios de aceite previstos para esta entrega foram atendidos no escopo da alteração implementada no helper.

### Fase E

- [ ] 1. Manter este documento atualizado durante todo o ciclo de vida da implementação.
- [ ] 2. Registrar qualquer alteração de escopo, priorização, estratégia ou dependência relevante.
- [ ] 3. Atualizar o status dos itens para refletir fielmente o progresso real da atividade.
- [ ] 4. Encerrar a atividade apenas após conferência final do resumo executivo, das fases detalhadas e dos critérios de aceite.
