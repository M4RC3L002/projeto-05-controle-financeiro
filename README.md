# Controle Financeiro

Quinto projeto do portfólio de Marcelo Andrade. Aplicação responsiva para explorar a organização de finanças pessoais, com perfil local e conexão bancária **inteiramente simulada**.

## Funcionalidades

- Primeiro acesso: perfil sem senha, seleção de bancos fictícios, autorização simulada e importação.
- Animação diagonal no desktop e transição mais suave no mobile, respeitando redução de movimento.
- Dashboard com saldo atual, entradas, saídas, resultado do período, evolução e categorias.
- Busca e filtros combinados por mês, conta, categoria e tipo de transação.
- Inclusão, edição e exclusão de lançamentos; exportação CSV com os filtros aplicados.
- Conexão e remoção de contas, edição do perfil e reinício da demonstração.
- Persistência no localStorage com validação e recuperação de conteúdo inválido.

## Executar localmente

Requer Node.js 22.13+ e pnpm. As dependências exatas estão no pnpm-lock.yaml.

```sh
pnpm install
pnpm dev
```

Acesse http://localhost:3000. Para produção local:

```sh
pnpm build
pnpm start
```

## Validação

```sh
pnpm typecheck
pnpm test
pnpm build
```

Os testes cobrem valores em centavos, importação sem duplicação, composição de filtros, saldos e validação dos dados persistidos. O fluxo foi exercitado no Chrome com viewport desktop e mobile, incluindo CRUD, CSV, persistência, conexão adicional, remoção da última conta e redução de movimento. A validação mobile foi emulada; o teste em aparelho físico permanece pendente.

## Stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, Recharts e Lucide. DM Sans e Instrument Serif são servidas localmente por Fontsource.

## Dados e escopo

Não existe cadastro real, backend de autenticação ou integração Open Finance. Aurora, Verde e Solar são instituições fictícias para esta demonstração. Use nome e e-mail fictícios. Dados ficam apenas no navegador e podem ser apagados na seção Meu perfil. Limpar os dados do navegador também apaga a demonstração. Não há sincronização entre dispositivos.

Os dados são gerados para os últimos seis meses em relação ao primeiro acesso e importados uma vez por conexão. O saldo total soma o saldo inicial fictício de cada conta e seu histórico completo. Os demais resumos e gráficos respeitam todos os filtros do período. Ao remover uma conexão, suas transações também são removidas.

## Identidade

Verde profundo, creme e dourado, aprovados a partir das referências fornecidas pelo autor. Interface própria inspirada no painel diagonal do vídeo enviado e na organização funcional do Organizze. Não reutiliza código do vídeo ou assets pagos do Envato.

## Publicação

Publicado na Vercel: https://projeto-05-controle-financeiro.vercel.app/ . Deploy de produção verificado com status READY e resposta HTTP 200 sem login. O envio desta versão foi feito pela CLI; o código local ainda não foi enviado ao GitHub.

[Portfólio de Marcelo Andrade](https://marcelo-andrade-portfolio-virid.vercel.app/)

