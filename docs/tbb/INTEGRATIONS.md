# Integrações

Integrações são adapters de entrada ou saída, isolados dos serviços de domínio. Estados suportados na UI: disponível, não configurado, experimental, erro e planejado.

CSV e PDF textual estão disponíveis. OFX possui contrato de parser, mas retorna indisponível. PDFs sem camada de texto são identificados e pedem OCR; o sistema não cria lançamentos duvidosos.

WhatsApp deve entrar por `MessagingProvider`: mensagem → candidato → normalização → categorização → deduplicação → revisão → transação. APIs oficiais exigem autorização explícita. Cookies e sessões de WhatsApp Web nunca devem ser extraídos.

Open Banking e calendários futuros também exigem consentimento, escopos mínimos, revogação e status real de conexão.
