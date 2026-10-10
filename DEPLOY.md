# Publicar o Glowy Move na Hostinger

> **Só quer colocar no ar?** Use o [PASSO-A-PASSO-HOSTINGER.md](./PASSO-A-PASSO-HOSTINGER.md): guia clicável, com o site já compilado, sem precisar instalar nada. Este documento aqui é a versão técnica, para quem vai mexer no código.

Três caminhos, do mais simples ao mais completo. Todos entregam o produto inteiro: a análise de vídeo, a biblioteca e o planejador rodam no navegador de quem acessa, não no servidor.

Antes de qualquer coisa, na sua máquina:

```bash
npm install
npm run fetch:model     # opcional, deixa o modelo de pose junto do site
npm run verify          # typecheck, lint, 57 testes e build
```

---

## Caminho A · Site estático no seu plano atual (recomendado para começar)

Funciona em qualquer plano de hospedagem da Hostinger, inclusive os mais simples, porque o servidor só entrega arquivos. Não precisa de Node no servidor.

O que muda: as páginas são geradas no seu computador, no momento do build, em vez de a cada visita. Como o catálogo de exercícios muda raramente, isso não tira nada do produto. Se você editar o catálogo ou o banco, roda o build de novo e sobe outra vez.

**1. Gere o site**

```bash
npm run build:static
```

Isso cria a pasta `out/` com tudo: HTML das três páginas, JavaScript, fontes, o runtime WebAssembly do MediaPipe e o `.htaccess` já configurado. São cerca de 36 MB, quase tudo do motor de visão.

**2. Compacte a pasta**

Compacte o **conteúdo** de `out/`, não a pasta em si. Dentro do zip precisa aparecer `index.html` na raiz.

No Windows: entre em `out`, selecione tudo, botão direito, Enviar para, Pasta compactada.
No macOS: entre em `out`, selecione tudo, botão direito, Comprimir.

**3. Suba pelo hPanel**

1. Entre no hPanel e abra **Websites**, depois **Dashboard** do domínio.
2. Vá em **Arquivos** e abra o **Gerenciador de Arquivos**.
3. Entre em `public_html`. Se houver a página padrão da Hostinger (`default.php` ou `index.html`), apague.
4. Clique no ícone de **upload** e envie o zip.
5. Botão direito no zip, **Extract**, extrair em `public_html`.
6. Apague o zip depois de extrair.
7. Confirme que `public_html/index.html`, `public_html/exercicios/index.html`, `public_html/rotina/index.html` e `public_html/mediapipe/` existem.

O arquivo `.htaccess` fica oculto por padrão. No Gerenciador de Arquivos, ative **Settings**, **Show hidden files**, e confirme que `public_html/.htaccess` está lá. Ele é o que faz o servidor entregar o `.wasm` com o tipo certo; sem ele a análise de vídeo não carrega.

**4. Ative HTTPS**

No hPanel, **Segurança**, **SSL**, instale o certificado gratuito e ative **Force HTTPS**. Isso não é enfeite: a leitura de arquivo local e o WebAssembly exigem contexto seguro em vários navegadores.

**5. Teste**

Abra o domínio, clique em **Analisar vídeo**, escolha **Agachamento** e depois **Ver uma análise de demonstração**. Se aparecer "4 repetições encontradas", o motor está funcionando no servidor de vocês.

Se der erro de análise, quase sempre é o `.htaccess` ausente ou a pasta `mediapipe` incompleta.

---

## Caminho B · Aplicação Node pelo hPanel (plano Business ou Cloud)

Segundo a documentação da Hostinger, o deploy de aplicação Node.js está disponível nos planos **Business** de web hosting e em qualquer plano **Cloud**. Node 18, 20, 22 e 24 são oferecidos; use 20 ou superior.

Vantagem sobre o caminho A: as páginas são montadas a cada visita, então o banco SQLite pode ser trocado sem novo build.

1. No hPanel, abra **Websites** e clique em **Add Website**.
2. Escolha **Deploy Web App**.
3. Selecione o método: **GitHub** (o repositório do projeto) ou **upload de arquivo .zip** com o projeto inteiro, sem `node_modules`.
4. Nas configurações de build, se o framework não for detectado como Next.js, informe:
   - build command: `npm run build`
   - start command: `npm start`
   - output directory: `.next`
   - versão do Node: 20 ou superior
5. Em **Environment Variables**, se quiser usar o banco, adicione `GLOWY_MOVE_DB_PATH` com o caminho do arquivo `glowy-move.db` no servidor. Sem essa variável e sem o arquivo, o catálogo embutido assume sozinho e o site funciona igual.
6. Clique em **Deploy**.
7. Depois de publicar, ative o SSL em **Segurança**, **SSL**.

Sobre o banco: `better-sqlite3` é um módulo nativo e está declarado como dependência **opcional**. Se o ambiente da Hostinger não conseguir compilá-lo, a instalação não quebra e o site sobe usando o catálogo embutido. Você perde apenas a possibilidade de editar textos pelo banco.

---

## Caminho C · VPS da Hostinger

Controle total, indicado se o Glowy Move for virar produto com tráfego real.

1. No hPanel, crie o VPS e escolha o template **Ubuntu com Node.js** ou o **CloudPanel**.
2. Conecte por SSH e instale as dependências:

```bash
git clone <seu-repositorio> glowy-move && cd glowy-move
npm ci
npm run build
npm install -g pm2
pm2 start "npm start" --name glowy-move
pm2 save && pm2 startup
```

3. A aplicação sobe na porta 3000. Configure o Nginx como proxy reverso:

```nginx
server {
  listen 80;
  server_name seudominio.com.br;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

4. Emita o certificado com `certbot --nginx -d seudominio.com.br`.
5. Para usar o banco: `npm run db:seed` no servidor e `GLOWY_MOVE_DB_PATH=/caminho/data/glowy-move.db` no ambiente do PM2.

---

## Alternativa fora da Hostinger

Se em algum momento você quiser deploy contínuo a partir do Git, sem cuidar de servidor:

```bash
npx vercel deploy --prod
```

A Vercel detecta Next.js sozinha e não exige nenhuma configuração deste projeto. Vale como plano B, não como recomendação contra o que você já paga.

---

## Depois de publicar, confira

- As três páginas abrem: `/`, `/exercicios`, `/rotina`.
- A biblioteca mostra 23 exercícios e as miniaturas do YouTube carregam.
- Clicar em um exercício abre o modal e o botão leva ao YouTube em nova aba.
- Em **Rotina**, "Gerar minha rotina inteligente" monta a semana e ela reaparece ao recarregar a página.
- Em **Analisar vídeo**, a análise de demonstração devolve "4 repetições encontradas".
- Enviar um vídeo curto de agachamento devolve repetições e recomendações. Este é o teste que só pode ser feito com o site publicado e um vídeo real.
