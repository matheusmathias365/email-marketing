<br />
<div align="center">
  <img src="public/images/logo.svg" alt="Logo" width="80" height="80">
  <h1 align="center">Motor de Campanhas (Email Marketing Pro)</h1>

  <p align="center">
    Uma plataforma leve, moderna e robusta para envio de e-mails em massa utilizando o seu próprio servidor SMTP.
    <br />
    <strong>Simples, rápido e no controle total da sua base de dados.</strong>
  </p>
</div>

<hr />

## 🎯 O Intuito do Projeto

O **Motor de Campanhas** nasceu da necessidade de ter uma ferramenta de e-mail marketing onde **você é dono dos seus próprios envios**. Ao invés de pagar planos mensais caríssimos baseados no tamanho da sua lista de contatos, esta aplicação permite que você conecte o seu próprio servidor SMTP (seja Gmail, SendGrid, Hostinger, Amazon SES ou servidor próprio) e faça envios em massa diretamente do seu navegador.

A inteligência da aplicação roda predominantemente no lado do cliente (Client-Side), garantindo uma experiência super fluida ao processar planilhas gigantes de contatos, validar tags dinâmicas e construir templates, tudo isso com uma interface premium e extremamente amigável.

---

## ✨ Principais Funcionalidades

- 🔌 **Conexão SMTP Universal**: Traga o seu próprio provedor de e-mail. Basta inserir Host, Porta, Usuário e Senha e a aplicação cuida do resto.
- 📁 **Importação Inteligente de Planilhas**: Faça upload de listas em `.xlsx`, `.xls` ou `.csv`. O sistema detecta automaticamente qual coluna contém os e-mails e remove duplicatas no próprio navegador, sem onerar o servidor.
- 🎨 **Editor de Templates HTML Avançado**: Escreva ou cole o seu HTML. O sistema conta com pré-visualização ao vivo (*Live Preview*), garantindo que o seu design seja responsivo.
- 🏷️ **Tags Dinâmicas (Mail Merge)**: Personalize cada e-mail disparado! Se a sua planilha possui uma coluna "Nome", basta escrever `{{Nome}}` no template HTML e o sistema substituirá dinamicamente para cada destinatário.
- 🩺 **Análise de Saúde do E-mail**: Validador de "Spam Score" embutido. Ele lê o seu HTML e avisa se você esqueceu o Assunto, se a proporção de imagens está muito alta, ou se há links quebrados, evitando que sua mensagem caia na caixa de Spam.
- 🚀 **Motor de Disparo Controlado**: Configure o tamanho dos lotes e o atraso (delay) entre cada envio. Isso é crucial para evitar limites de taxa de envio de provedores tradicionais e proteger a reputação do seu domínio.
- 🛑 **Sistema de Descadastro Integrado (Opt-out)**: Injeção automática de links de descadastro no final das campanhas. Os usuários que pedirem para sair geram notificações em tempo real 🔔 direto no seu painel principal!

---

## 💻 Tecnologias e Arquitetura

O projeto foi desenhado focando em performance, estética e facilidade de manutenção:

- **Frontend (UI/UX)**: Construído com HTML5, CSS3 puro utilizando Design System customizado (Cores oficiais: `#813BBE`, `#121A2D`, `#FFFFFF`) e JavaScript Vanilla. 
- **Gestão de Interface**: Layout responsivo em "Bento Grid", trazendo conceitos de design premium.
- **Backend (API)**: Node.js leve servindo rotas `/api/send`, `/api/send-batch` (usando a biblioteca Nodemailer) e o sistema de tracking de `unsubscribes`.
- **Parsing de Excel**: Utilização da poderosa biblioteca `SheetJS` injetada via CDN para ler arquivos localmente antes de qualquer processamento online.
- **Ícones e Avatares**: Integração com *Lucide Icons* e puxa automaticamente avatares do *Unavatar / Gravatar* baseados no seu e-mail conectado.

---

## 🛠️ Como Executar o Projeto Localmente

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/matheusmathias365/email-marketing.git
   cd email-marketing
   ```

2. **Instale as dependências Node:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   node dev-server.js
   ```

4. **Acesse a aplicação:**
   Abra o seu navegador e vá para `http://localhost:3000`.

---

## 🔒 Segurança e Privacidade

Diferente das grandes plataformas de marketing, as credenciais do seu SMTP e a sua lista de contatos não ficam armazenadas em bancos de dados de terceiros. A importação e gestão rodam localmente na memória do seu navegador (`sessionStorage` e variáveis de estado locais), tornando o fluxo extremamente seguro. Os dados só trafegam para a API no exato momento do disparo.

---
<div align="center">
  <i>Desenvolvido para oferecer o máximo poder de fogo para o seu Email Marketing!</i>
</div>
