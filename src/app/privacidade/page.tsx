import type { Metadata } from "next";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o NutriOpus coleta, usa e protege seus dados pessoais de saúde.",
};

export default function PrivacidadePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao início
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Política de Privacidade</h1>
            <p className="text-sm text-text-secondary">Atualizada em junho de 2026</p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-text-secondary">
          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">1. Quem somos</h2>
            <p>
              O NutriOpus é uma plataforma SaaS para gestão de consultórios de nutrição. Os dados pessoais
              são tratados em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">2. Dados coletados</h2>
            <p>Coletamos os seguintes dados dos pacientes, mediante consentimento expresso:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Dados de identificação: nome, e-mail, telefone, data de nascimento</li>
              <li>Dados de saúde: peso, altura, histórico de doenças, medicamentos, alergias</li>
              <li>Dados alimentares: rotina alimentar, restrições, intolerâncias</li>
              <li>Dados de evolução: medidas antropométricas, composição corporal</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">3. Finalidade do tratamento</h2>
            <p>Os dados são utilizados exclusivamente para:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Elaboração de planos alimentares personalizados</li>
              <li>Acompanhamento nutricional e monitoramento de evolução</li>
              <li>Comunicação entre paciente e nutricionista</li>
              <li>Geração de relatórios clínicos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">4. Base legal</h2>
            <p>
              O tratamento dos dados de saúde é realizado com base no consentimento livre e expresso do
              titular (Art. 11, I, LGPD) e na tutela da saúde, exclusivamente por profissional habilitado
              (Art. 11, II, f, LGPD).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">5. Compartilhamento de dados</h2>
            <p>
              Os dados <strong>não são compartilhados</strong> com terceiros para fins comerciais. O acesso
              é restrito ao nutricionista responsável pelo atendimento e à equipe autorizada por ele.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">6. Segurança</h2>
            <p>
              Adotamos medidas técnicas de segurança, incluindo criptografia de senhas (bcrypt),
              autenticação por tokens JWT com validade limitada, isolamento multi-tenant por slug e
              controle de acesso por perfil (nutricionista / paciente).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">7. Direitos do titular</h2>
            <p>Nos termos da LGPD, você tem direito a:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Confirmar a existência de tratamento dos seus dados</li>
              <li>Acessar, corrigir ou excluir seus dados</li>
              <li>Revogar o consentimento a qualquer momento</li>
              <li>Solicitar a portabilidade dos dados</li>
            </ul>
            <p className="mt-2">
              Para exercer seus direitos, entre em contato com o nutricionista responsável pelo seu
              atendimento pelo portal ou por e-mail.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-text-primary mb-3">8. Retenção de dados</h2>
            <p>
              Os dados são mantidos pelo período necessário ao atendimento nutricional e durante o prazo
              legal obrigatório para prontuários de saúde (mínimo de 5 anos, conforme CFN).
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
