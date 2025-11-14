import { useState, useEffect } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Calendar, 
  Target,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Info
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { RadarChart as ReRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

interface MaturityResults {
  global_score: number;
  total_axes: number;
  axes_analysis: Array<{
    name: string;
    definition: string;
    average_score: number;
    max_score: number;
    questions_count: number;
  }>;
  improvement_opportunities: Array<{
    axis_name: string;
    axis_definition: string;
    question: string;
    current_response: string;
    current_score: number;
    next_level_response: string;
    next_level_score: number;
    improvement_gap: number;
  }>;
  recommendations: {
    short_term: Array<{
      axis_name: string;
      question: string;
      current_situation: string;
      target_situation: string;
      recommendation: string;
      timeline: string;
      priority: string;
    }>;
    medium_term: Array<{
      axis_name: string;
      question: string;
      current_situation: string;
      target_situation: string;
      recommendation: string;
      timeline: string;
      priority: string;
    }>;
    long_term: Array<{
      axis_name: string;
      question: string;
      current_situation: string;
      target_situation: string;
      recommendation: string;
      timeline: string;
      priority: string;
    }>;
  };
}

const MaturityResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [results, setResults] = useState<MaturityResults | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const type = params.get('type');
    const storageKey = type === 'architecture' ? 'maturityAnalysisResults_arch' : 'maturityAnalysisResults';
    const storedResults = localStorage.getItem(storageKey);
    if (storedResults) {
      setResults(JSON.parse(storedResults));
    } else {
      // Rediriger vers la page d'évaluation si pas de résultats
      navigate('/maturity');
    }
  }, [navigate, location.search]);

  if (!results) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Chargement des résultats...</p>
        </div>
      </Layout>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 4) return "text-green-600";
    if (score >= 3) return "text-yellow-600";
    if (score >= 2) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 4) return "default";
    if (score >= 3) return "secondary";
    if (score >= 2) return "outline";
    return "destructive";
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'text-red-600 bg-red-50 dark:bg-red-950/20';
      case 'medium': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20';
      case 'low': return 'text-green-600 bg-green-50 dark:bg-green-950/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getTimelineIcon = (timeline: string) => {
    switch (timeline) {
      case 'short_term': return <Clock className="w-4 h-4" />;
      case 'medium_term': return <Calendar className="w-4 h-4" />;
      case 'long_term': return <Target className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getTimelineLabel = (timeline: string) => {
    switch (timeline) {
      case 'short_term': return 'Court terme (0-3 mois)';
      case 'medium_term': return 'Moyen terme (3-12 mois)';
      case 'long_term': return 'Long terme (12+ mois)';
      default: return timeline;
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/maturity')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Rapport d'évaluation de maturité
              </h1>
              <p className="text-muted-foreground">
                Analyse complète de votre système d'information DevSecOps
              </p>
            </div>
          </div>
        </div>

        {/* Score global */}
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              <span>Score global de maturité</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className={`text-6xl font-bold ${getScoreColor(results.global_score)}`}>
                {results.global_score.toFixed(1)}
              </div>
              <div className="text-2xl text-muted-foreground">/ 5.0</div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Niveau de maturité</span>
                <span>{results.total_axes} axes évalués</span>
              </div>
              <Progress 
                value={(results.global_score / 5) * 100} 
                className="h-3"
              />
            </div>
            <div className="text-center">
              <Badge variant={getScoreBadgeVariant(results.global_score)} className="text-lg px-4 py-2">
                {results.global_score >= 4 ? "Mature" : 
                 results.global_score >= 3 ? "En développement" : 
                 results.global_score >= 2 ? "En cours" : "Débutant"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs pour les différentes sections */}
        <Tabs defaultValue="axes" className="max-w-6xl mx-auto">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="axes">Analyse par axes</TabsTrigger>
            <TabsTrigger value="radar">Radar Chart</TabsTrigger>
            <TabsTrigger value="recommendations">Recommandations</TabsTrigger>
          </TabsList>

          {/* Analyse par axes */}
          <TabsContent value="axes" className="space-y-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.axes_analysis.map((axis, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{axis.name}</CardTitle>
                    <CardDescription className="text-sm line-clamp-3">
                      {axis.definition}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Score moyen</span>
                      <Badge variant={getScoreBadgeVariant(axis.average_score)}>
                        {axis.average_score.toFixed(1)}/5
                      </Badge>
                    </div>
                    <Progress 
                      value={(axis.average_score / 5) * 100} 
                      className="h-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      {axis.questions_count} question{axis.questions_count > 1 ? 's' : ''}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Radar Chart */}
          <TabsContent value="radar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Radar des axes</CardTitle>
                <CardDescription>Visualisation des scores moyens par axe</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{ score: { label: "Score", color: "hsl(217.2 91.2% 59.8%)" } }}
                  className="h-[380px]"
                >
                  <ReRadarChart data={results.axes_analysis.map(a => ({ axis: a.name, score: Number(a.average_score?.toFixed ? a.average_score.toFixed(2) : a.average_score) }))}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 5]} angle={30} tickCount={6} />
                    <Radar name="Score" dataKey="score" stroke="var(--color-score)" fill="var(--color-score)" fillOpacity={0.3} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </ReRadarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recommandations */}
          <TabsContent value="recommendations" className="space-y-6">
            <div className="space-y-6">
              {/* Court terme */}
              {results.recommendations.short_term.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-600" />
                    Actions court terme (0-3 mois)
                  </h3>
                  <div className="space-y-4">
                    {results.recommendations.short_term.map((rec, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{rec.axis_name}</CardTitle>
                              <CardDescription>{rec.question}</CardDescription>
                            </div>
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority.toUpperCase()}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                            <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                              Recommandation :
                            </h4>
                            <p className="text-sm">{rec.recommendation}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Moyen terme */}
              {results.recommendations.medium_term.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-yellow-600" />
                    Actions moyen terme (3-12 mois)
                  </h3>
                  <div className="space-y-4">
                    {results.recommendations.medium_term.map((rec, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{rec.axis_name}</CardTitle>
                              <CardDescription>{rec.question}</CardDescription>
                            </div>
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority.toUpperCase()}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                              Recommandation :
                            </h4>
                            <p className="text-sm">{rec.recommendation}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Long terme */}
              {results.recommendations.long_term.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-green-600" />
                    Actions long terme (12+ mois)
                  </h3>
                  <div className="space-y-4">
                    {results.recommendations.long_term.map((rec, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{rec.axis_name}</CardTitle>
                              <CardDescription>{rec.question}</CardDescription>
                            </div>
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority.toUpperCase()}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                            <h4 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                              Recommandation :
                            </h4>
                            <p className="text-sm">{rec.recommendation}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="text-center space-y-4">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Prochaines étapes</h3>
              <p className="text-muted-foreground mb-4">
                Utilisez ces recommandations pour améliorer votre maturité DevSecOps. 
                Planifiez vos actions selon les échéances suggérées.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate('/maturity')}>
                  Nouvelle évaluation
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  Exporter le rapport
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default MaturityResults;