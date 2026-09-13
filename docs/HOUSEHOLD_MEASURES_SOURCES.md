# Fontes de Medidas Caseiras

## TBCA
Referencia brasileira principal para evolucao futura. A TBCA publica composicao de alimentos em medidas caseiras, mas qualquer importacao ampla deve respeitar termos de uso e formato permitido.

## TACO
Base principal do NutriOpus para composicao nutricional por 100g. Nesta sprint, a TACO e usada para calcular nutrientes apos a conversao de medida caseira para gramas.

## USDA FoodData Central
API oficial dos Estados Unidos. Pode servir como fallback para alimentos internacionais ou porcoes quando nao houver fonte brasileira. Quando usada, a fonte deve ficar marcada como `USDA_FDC`.

## ANVISA
Referencial complementar para conceitos de porcao e medida caseira em rotulagem nutricional.
Nesta sprint, ANVISA inspira tipos de utensilio domestico e capacidades usuais; os pesos por alimento continuam curados quando nao vierem de tabela oficial validada.

## Pinheiro e Pacheco
Referencias classicas brasileiras para medidas caseiras e equivalentes alimentares. Nao copiar tabelas protegidas integralmente. Usar apenas dados permitidos, curados manualmente ou informados pela nutricionista.

## Cuidados
- Nao fazer scraping agressivo.
- Nao importar base protegida sem licenca.
- Nao marcar dado curado como oficial.
- Sempre salvar fonte, confianca e status de verificacao.
- Sempre diferenciar utensilio global de peso por alimento.
- Exibir aviso de estimativa para o usuario.
