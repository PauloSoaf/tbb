# Integrações

Integrações são adapters de entrada ou saída, isolados dos serviços de domínio. Estados suportados na UI: disponível, não configurado, experimental, erro e planejado.

CSV e PDF textual estão disponíveis. OFX possui contrato de parser, mas retorna indisponível. PDFs sem camada de texto são identificados e pedem OCR; o sistema não cria lançamentos duvidosos.

WhatsApp deve entrar por `MessagingProvider`: mensagem → candidato → normalização → categorização → deduplicação → revisão → transação. APIs oficiais exigem autorização explícita. Cookies e sessões de WhatsApp Web nunca devem ser extraídos.

Open Finance está disponível para uso pessoal pelo Meu Pluggy (gratuito, até 5 conexões): veja `OPEN_FINANCE.md`. A integração só aparece como conectada com credenciais configuradas e uma conexão real, com consentimento do titular, revogação e status verdadeiro. Calendários futuros seguem o mesmo princípio.
