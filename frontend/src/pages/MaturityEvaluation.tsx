import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download, Upload, FileText, CheckCircle, Loader2, BarChart3 } from "lucide-react";
import { enterpriseApiClient } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MaturityEvaluation = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  type EvalMode = "devsecops" | "architecture";
  const [mode, setMode] = useState<EvalMode>("devsecops");
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleDownloadTemplate = () => {
    // Créer un lien de téléchargement vers le fichier Excel
    const link = document.createElement('a');
    if (mode === "devsecops") {
      link.href = '/Evaluation maturité DevSecOps 16 axes.xlsx';
      link.download = 'Evaluation maturité DevSecOps 16 axes.xlsx';
    } else {
      // Questionnaire officiel Architecture Capabilities
      link.href = '/Evaluation_Maturité_Architecture Capabilities V1.1.xlsx';
      link.download = 'Evaluation_Maturité_Architecture Capabilities V1.1.xlsx';
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Téléchargement",
      description: "Le questionnaire est en cours de téléchargement.",
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Vérifier que c'est un fichier Excel ou CSV
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/csv'
    ];
    
    const hasValidMime = allowedTypes.includes(file.type);
    const hasValidExt = /\.(xlsx|xls|csv)$/i.test(file.name);
    if (!hasValidMime && !hasValidExt) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fichier .xlsx, .xls ou .csv",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setIsAnalyzing(true);
    
    try {
      // Analyser le fichier avec l'API
      const result = await enterpriseApiClient.analyzeMaturityExcel(file, mode);
      
      if (!result.ok) {
        throw new Error((result as { ok: false; error: string }).error);
      }

      // Stocker avec une clé différente selon le mode
      const storageKey = mode === 'architecture' ? 'maturityAnalysisResults_arch' : 'maturityAnalysisResults';
      localStorage.setItem(storageKey, JSON.stringify(result.data));
      
      toast({
        title: "Analyse terminée",
        description: `Score global: ${result.data.global_score}/5. ${result.data.total_axes} axes analysés.`,
      });
      
      // Naviguer vers la page de résultats en précisant le type
      navigate(`/maturity/results?type=${mode}`);
      
    } catch (error: any) {
      toast({
        title: "Erreur d'analyse",
        description: error?.message || "Une erreur est survenue lors de l'analyse du fichier.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
      event.target.value = ''; // Reset input
    }
  };

  return (
    <Layout >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Évaluation de maturité de votre SI</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">Choisissez un domaine puis suivez les étapes ci-dessous.</p>
        </div>

        {/* Domain Tabs */}
        <div className="max-w-4xl mx-auto">
          <Tabs defaultValue="devsecops" value={mode} onValueChange={(v) => setMode(v as EvalMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="devsecops">DevSecOps</TabsTrigger>
              <TabsTrigger value="architecture">Evaluation Maturité Architecture Capabilities</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Step 1: Download Template */}
          <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Étape 1</CardTitle>
              <CardDescription className="text-base">
                Téléchargez le questionnaire Excel et complétez-le avec vos réponses
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Le questionnaire contient toutes les questions nécessaires pour évaluer la maturité de votre système d'information.
              </p>
              <Button 
                onClick={handleDownloadTemplate}
                className="w-full"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Télécharger le questionnaire Excel
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Upload Completed File */}
          <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-xl">Étape 2</CardTitle>
              <CardDescription className="text-base">
                Chargez le fichier Excel complété pour traitement
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Une fois le questionnaire complété, chargez-le ici pour générer votre rapport d'évaluation.
              </p>
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                  id="excel-upload"
                />
                <Button 
                  asChild
                  className="w-full"
                  size="lg"
                  disabled={isUploading}
                >
                  <label htmlFor="excel-upload" className="cursor-pointer">
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {isAnalyzing ? "Analyse en cours..." : isUploading ? "Chargement..." : "Charger le fichier Excel"}
                  </label>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
              Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <h4 className="font-semibold">1. Téléchargement du questionnaire :</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Cliquez sur "Télécharger le questionnaire"</li>
                <li>Le fichier sera téléchargé automatiquement</li>
                <li>Ouvrez le fichier avec Microsoft Excel, LibreOffice Calc ou un éditeur CSV</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">2. Complétion du questionnaire :</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Répondez à toutes les questions dans les cellules prévues, en indiquant la bonne réponse.</li>
                <li>Un score sera attribué à chaque axe.</li>
                <li>Sauvegardez le fichier une fois terminé</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold">3. Chargement du fichier :</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-4">
                <li>Cliquez sur "Charger le fichier Excel"</li>
                <li>Sélectionnez le fichier complété</li>
                <li>Attendez le traitement et la génération du rapport</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Une fois le fichier chargé, vous recevrez un rapport détaillé de l'évaluation de maturité de votre SI.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default MaturityEvaluation;
