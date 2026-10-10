# Publicar o Glowy Move na Hostinger

Guia completo, do zero até o site no ar. Você não precisa instalar nada nem rodar comando: o site já vem compilado no arquivo `glowy-move-site.zip`.

Tempo estimado: 15 minutos.

---

## Antes de começar

Tenha em mãos:

- O arquivo **`glowy-move-site.zip`** (11 MB).
- Acesso ao **hPanel** da Hostinger, em `hpanel.hostinger.com`.
- Um domínio ou subdomínio já apontado para a Hostinger.

Uma decisão a tomar agora: o Glowy Move vai ficar no domínio principal ou em um subdomínio?

**Recomendo subdomínio**, algo como `move.seudominio.com.br`. Motivos: não mexe no site que já está no ar, permite testar à vontade, e se algo der errado nada do que existe hoje é afetado. Se preferir o domínio principal, pule a Parte 1 e vá direto para a Parte 2.

---

## Parte 1 · Criar o subdomínio (5 minutos)

1. Entre em `hpanel.hostinger.com` com seu e-mail e senha.
2. No menu superior, clique em **Domínios**.
3. Na lista, encontre o seu domínio e clique em **Gerenciar**.
4. No menu lateral esquerdo, procure **Subdomínios**.
5. No campo **Subdomínio**, digite apenas a palavra: `move`. O sistema completa o resto sozinho e mostra `move.seudominio.com.br`.
6. Deixe a caixa **Pasta personalizada** em branco. A Hostinger vai criar a pasta sozinha.
7. Clique em **Criar**.
8. Anote a pasta que aparece na lista, algo como `public_html/move` ou `domains/move.seudominio.com.br/public_html`. **É nessa pasta que os arquivos vão.**

O subdomínio pode levar de alguns minutos até algumas horas para responder na internet. Você pode seguir subindo os arquivos enquanto isso acontece.

---

## Parte 2 · Subir os arquivos (5 minutos)

1. No hPanel, clique em **Websites** no menu superior.
2. Encontre o seu site na lista e clique em **Painel de administração** (em alguns planos aparece como **Gerenciar**).
3. No menu lateral, abra **Arquivos** e clique em **Gerenciador de Arquivos**.
4. Você vai ver uma árvore de pastas. Entre na pasta de destino:
   - Se escolheu subdomínio: a pasta que você anotou no passo 8 da Parte 1.
   - Se escolheu o domínio principal: `public_html`.
5. **Se a pasta já tiver arquivos**, apague os que são a página padrão da Hostinger. Normalmente são `default.php`, `index.html` ou uma pasta `.well-known`. Deixe a `.well-known` se ela existir, ela é do certificado SSL. Na dúvida, apague só `default.php` e `index.html`.
6. Na barra superior do Gerenciador de Arquivos, clique no ícone de **upload** (uma seta para cima).
7. Selecione o arquivo `glowy-move-site.zip` e aguarde. São 11 MB; leva de 30 segundos a 2 minutos dependendo da sua conexão.
8. Quando o upload terminar, o arquivo aparece na lista. Clique nele com o **botão direito** e escolha **Extrair** (ou **Extract**).
9. Na janela que abrir, confirme que o destino é a pasta atual. Clique em **Extrair**.
10. Depois de extrair, clique com o botão direito no `glowy-move-site.zip` e escolha **Excluir**. Ele já cumpriu a função e só ocupa espaço.

---

## Parte 3 · Conferir se os arquivos chegaram certos (2 minutos)

Ainda no Gerenciador de Arquivos, confirme que a pasta contém, **na raiz**, estes itens:

```
index.html          ← a página inicial
exercicios/         ← pasta
rotina/             ← pasta
_next/              ← pasta com o JavaScript e as fontes
mediapipe/          ← pasta com o motor de análise (a maior de todas)
icon.svg
404.html
.htaccess           ← arquivo oculto, veja abaixo
```

**Se você não está vendo o `.htaccess`:** ele é um arquivo oculto e o Gerenciador esconde por padrão. Clique no ícone de **engrenagem** (Configurações) no canto superior direito e ative **Mostrar arquivos ocultos** (**Show hidden files**). Ele deve aparecer.

**Esse arquivo é obrigatório.** Ele é o que diz ao servidor para entregar os arquivos `.wasm` com o tipo correto. Sem ele o navegador recusa carregar o motor de análise e a função principal do app não funciona, mesmo com o site abrindo normalmente.

**Se o `index.html` estiver dentro de uma subpasta** em vez de na raiz, o zip foi extraído um nível abaixo. Entre na subpasta, selecione tudo, recorte, volte um nível e cole. Depois apague a subpasta vazia.

---

## Parte 4 · Ativar o HTTPS (3 minutos)

Isso não é enfeite. Navegadores modernos bloqueiam WebAssembly e leitura de arquivo local fora de contexto seguro. **Sem HTTPS, a análise de vídeo não funciona.**

1. No painel do site, menu lateral, abra **Segurança** e clique em **SSL**.
2. Encontre o domínio ou subdomínio na lista.
3. Se aparecer **Instalar SSL**, clique. A emissão leva alguns minutos.
4. Quando o status virar **Ativo**, ative também a opção **Forçar HTTPS**.

Se o subdomínio ainda não estiver propagado, o SSL pode falhar. Espere e tente de novo mais tarde.

---

## Parte 5 · Testar (2 minutos)

Abra o endereço no navegador e siga esta ordem:

1. **A home carrega** com o título "Seu movimento. Mais consciente." e a marca do Glowy Move no topo.
2. **Clique em Exercícios.** Devem aparecer 23 exercícios agrupados por músculo, com as miniaturas do YouTube carregando.
3. **Clique em um exercício.** Abre uma janela de detalhes com a miniatura e um botão de play. Clique no play: o vídeo toca ali mesmo, dentro do app. Se o canal bloquear a exibição fora do YouTube, use o link "Assistir no YouTube" ao lado da fonte.
4. **Clique em Rotina** e depois em **Gerar minha rotina inteligente**. A semana aparece montada. Recarregue a página: a rotina precisa continuar lá.
5. **Clique em Analisar vídeo**, escolha **Agachamento** e clique em **Ver uma análise de demonstração**. Se aparecer **"4 repetições encontradas"**, o motor está funcionando no seu servidor.
6. **O teste final:** grave um vídeo curto de 3 a 8 agachamentos com o celular, de lado, corpo inteiro no quadro, e envie. Na primeira análise o navegador baixa o modelo de pose (cerca de 5 MB), então essa primeira vez demora um pouco mais. Depois disso fica em cache.

Se os passos 1 a 5 funcionarem, o site está publicado corretamente.

---

## Se algo der errado

| Sintoma | Causa quase certa | O que fazer |
|---|---|---|
| Site abre em branco | Arquivos extraídos em subpasta | Conferir se `index.html` está na raiz da pasta do site |
| Aparece a página padrão da Hostinger | O `index.html` antigo não foi apagado | Apagar `default.php` e o `index.html` antigo, reextrair |
| Home abre, mas Exercícios e Rotina dão erro 404 | `.htaccess` ausente | Ativar "Mostrar arquivos ocultos" e conferir. Se não estiver lá, extrair o zip de novo |
| Tudo abre, mas a análise dá erro | `.htaccess` ausente, ou HTTPS desligado | Conferir os dois. O `.htaccess` é o que serve o `.wasm` corretamente |
| Miniaturas dos exercícios não aparecem | Bloqueio de rede ou extensão do navegador | Testar em uma janela anônima e em outra rede |
| Análise demora muito na primeira vez | Download do modelo de pose | Normal. São cerca de 5 MB, só na primeira análise |
| "Não identifiquei nenhum ciclo" | Enquadramento do vídeo | Corpo inteiro no quadro, câmera parada, 3 a 8 repetições |

---

## Como atualizar o site depois

Sempre que o Glowy Move mudar, o processo é o mesmo: você recebe um `glowy-move-site.zip` novo, sobe, extrai por cima e pronto. Não precisa apagar nada antes: a extração substitui os arquivos.

Um detalhe: o navegador guarda os arquivos antigos em cache. Depois de atualizar, teste em janela anônima ou pressione `Ctrl + Shift + R` (no Mac, `Cmd + Shift + R`) para forçar o recarregamento.

---

## O que este site faz e não faz

**Faz:** as três telas funcionam por inteiro, a análise de vídeo roda no navegador de quem acessa, a rotina é salva no dispositivo da pessoa, e nada disso passa pelo seu servidor. Sua hospedagem só entrega arquivos, então não há custo de processamento nem risco de sobrecarga por uso.

**Não faz:** não existe conta, login, nem histórico salvo na nuvem. Cada pessoa vê apenas o que fez no próprio navegador. O botão "Minhas análises" avisa isso honestamente em vez de fingir que guarda.

**Privacidade:** nenhum vídeo é enviado para lugar nenhum. O único download externo é o modelo de análise de pose, que vem da CDN oficial do MediaPipe na primeira vez. Se quiser eliminar até isso, o `README.md` do projeto explica como hospedar o modelo junto do site.

---

## Se um dia quiser o caminho com servidor Node

O que está descrito aqui é hospedagem de arquivos, que funciona em qualquer plano. Se no futuro você quiser as páginas montadas a cada visita e o catálogo editável por banco de dados, o `DEPLOY.md` do projeto traz o caminho da aplicação Node, disponível nos planos Business e Cloud, e o caminho de VPS.
