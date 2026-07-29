// ── Configuração EmailJS ───────────────────────────────────────────────────────
// 1. Crie uma conta gratuita em https://www.emailjs.com
// 2. Crie um "Email Service" (Gmail, Outlook, etc.) e copie o Service ID
// 3. Crie um "Email Template" com as variáveis abaixo e copie o Template ID
// 4. Copie a sua "Public Key" em Account → API Keys
//
// Variáveis usadas no template EmailJS:
//   {{to_name}}    — nome do utilizador
//   {{to_email}}   — email de destino (campo "To Email" do template)
//   {{reset_link}} — link completo de redefinição
//   {{expires_in}} — validade do link (ex: "1 hora")

export const EMAILJS_CONFIG = {
  serviceId:  'service_xxxxxxx',   // ← substitua pelo seu Service ID
  templateId: 'template_xxxxxxx',  // ← substitua pelo seu Template ID
  publicKey:  'XXXXXXXXXXXXXXXX',  // ← substitua pela sua Public Key
};

export const RESET_EXPIRES_MS = 60 * 60 * 1000; // 1 hora
