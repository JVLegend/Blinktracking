import { SidebarInset } from "@/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Brain, 
  Eye, 
  Microscope, 
  Lightbulb, 
  Users, 
  FileText, 
  ClipboardList, 
  Calendar, 
  Calculator, 
  Scale,
  AlertTriangle 
} from "lucide-react"

export default function VisionPage() {
  return (
    <SidebarInset>
      <div className="flex-1 space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Visão do Projeto</h1>
          <p className="text-muted-foreground">
            Inteligência Artificial revolucionando o diagnóstico oftalmológico
          </p>
        </div>

        <div className="grid gap-6">
          {/* Card dos Pesquisadores */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <CardTitle>Pesquisadores</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Instituição</h3>
                  <p className="text-sm text-muted-foreground">
                    Disciplina de Oftalmologia, Departamento de Oftalmologia e Otorrinolaringologia, 
                    Faculdade de Medicina da Universidade de São Paulo
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Pesquisador Responsável</h3>
                  <p className="text-sm text-muted-foreground">Dr. Allan Christian Pieroni Gonçalves</p>
                </div>

                <div>
                  <h3 className="font-semibold text-lg mb-2">Pesquisadores Colaboradores</h3>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li>Dra. Larissa Caroline Mansano Soares - Oftalmologista e pesquisadora principal</li>
                    <li>João Victor Dias - Estatístico e desenvolvedor do projeto</li>
                    <li>Dr Lucas Costa Cortez</li>
                    <li>Dra Suzana Matayoshi</li>
                    <li>Dr. Mario Luiz Monteiro</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                <CardTitle>A Revolução da IA na Oftalmologia</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A integração da Inteligência Artificial na oftalmologia representa um dos avanços mais 
                significativos na medicina moderna. Com sua capacidade de processar e analisar grandes 
                volumes de dados com precisão excepcional, a IA está transformando a maneira como 
                diagnosticamos e tratamos condições oculares.
              </p>
              <p className="text-sm text-muted-foreground">
                O SmartBlink surge neste contexto como uma ferramenta inovadora, focada na análise 
                precisa do piscar de olhos, um indicador crucial para várias condições oftalmológicas.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Diagnóstico Preciso</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  A IA permite a detecção precoce de anomalias no piscar, 
                  possibilitando intervenções mais eficazes e melhorando 
                  significativamente o prognóstico dos pacientes.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Microscope className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Análise Objetiva</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Através de algoritmos avançados, nossa tecnologia oferece 
                  medições precisas e objetivas do piscar, eliminando a 
                  subjetividade da avaliação manual.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Inovação Contínua</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Nossa plataforma evolui constantemente, incorporando novos 
                  conhecimentos e melhorando a precisão diagnóstica através 
                  do aprendizado de máquina.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Impacto na Prática Clínica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                O uso da IA no SmartBlink não apenas otimiza o processo diagnóstico, mas também 
                oferece benefícios tangíveis para médicos e pacientes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
                <li>Redução significativa no tempo de diagnóstico</li>
                <li>Maior precisão na detecção de anomalias</li>
                <li>Acompanhamento objetivo da evolução do tratamento</li>
                <li>Documentação detalhada e padronizada</li>
                <li>Suporte à decisão clínica baseada em dados</li>
              </ul>
            </CardContent>
          </Card>

          {/* Resumo do Projeto */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                <CardTitle>Resumo do Projeto</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                O piscar adequado é essencial para a manutenção da saúde ocular, uma vez que 
                distribui o filme lacrimal, remove debris do filme lacrimal, exclui estímulos 
                visuais, estimula a secreção pela glândula de meibomius e sua na drenagem lacrimal.
              </p>
              <p className="text-sm text-muted-foreground">
                Em contrapartida, a dinâmica alterada do piscar pode ter uma série de implicações 
                na superfície ocular, interferência na função presente em diversas desordens 
                sistêmicas e neurológicas.
              </p>
              <p className="text-sm text-muted-foreground">
                O propósito desse estudo é investigar a dinâmica do piscar em diferentes grupos de 
                pacientes do ambulatório de oftalmologia para comparação entre olhos saudáveis, 
                olhos com diversas patologias oftalmológicas e estados pré e pós cirúrgicos 
                específicos.
              </p>
            </CardContent>
          </Card>

          {/* Objetivos */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                <CardTitle>Objetivos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-2">Objetivos Específicos</h3>
                  <ul className="list-decimal list-inside text-sm text-muted-foreground space-y-2">
                    <li>Análise da Dinâmica do Piscar Espontâneo em diferentes grupos de pacientes do serviço de Oftalmologia do HCFMUSP</li>
                    <li>Comparar dinâmicas do piscar entre os grupos</li>
                    <li>Avaliar correlações entre a dinâmica do piscar e condições clínicas desses grupos</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metodologia */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ClipboardList className="h-6 w-6 text-primary" />
                <CardTitle>Metodologia</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4">Características do Estudo</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Estudo prospectivo</li>
                    <li>• Não intervencionista</li>
                    <li>• Comparativo</li>
                    <li>• 100 pacientes</li>
                    <li>• Período: Jul/2023 a Dez/2026</li>
                  </ul>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4">Avaliações</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• Coleta de dados do prontuário</li>
                    <li>• Foto e Filmagem</li>
                    <li>• Questionário OSDI</li>
                    <li>• Avaliação oftalmológica completa</li>
                    <li>• Análise da superfície ocular</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cronograma */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-6 w-6 text-primary" />
                <CardTitle>Cronograma</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold">Atividade</th>
                      <th className="text-left py-2 font-semibold">Período</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2">Recrutamento e procedimentos</td>
                      <td className="py-2">M1 até M40</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Realização das medidas</td>
                      <td className="py-2">M2 até M40</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Análise dos resultados</td>
                      <td className="py-2">M6 até M40</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Elaboração dos manuscritos</td>
                      <td className="py-2">M40 até M42</td>
                    </tr>
                    <tr>
                      <td className="py-2">Divulgação dos resultados</td>
                      <td className="py-2">M41 até M42</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Orçamento */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calculator className="h-6 w-6 text-primary" />
                <CardTitle>Orçamento</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-semibold">Item</th>
                      <th className="text-left py-2 font-semibold">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm text-muted-foreground">
                    <tr className="border-b">
                      <td className="py-2">Materiais e Equipamentos</td>
                      <td className="py-2">8.880,00</td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2">Serviços</td>
                      <td className="py-2">5.780,00</td>
                    </tr>
                    <tr className="font-semibold">
                      <td className="py-2">Total</td>
                      <td className="py-2">14.660,00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-muted-foreground mt-4">* Os custos serão arcados pelos pesquisadores</p>
            </CardContent>
          </Card>

          {/* Riscos e Benefícios */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Scale className="h-6 w-6 text-primary" />
                <CardTitle>Riscos e Benefícios</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    Riscos
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Riscos mínimos decorrentes da exposição do caso, como possibilidade 
                    de desconforto ou constrangimento do paciente por ter seu caso ou 
                    imagem publicado, mesmo sem divulgação de dados pessoais.
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-4">Benefícios</h3>
                  <p className="text-sm text-muted-foreground">
                    O conhecimento e registro da dinâmica do piscar contribuirá para 
                    identificar possíveis complicações, quantificar impacto das cirurgias 
                    e aprimorar as técnicas de abordagem.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SidebarInset>
  )
}
