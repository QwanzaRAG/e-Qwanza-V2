import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Loader2, Mail, ArrowLeft, Bot } from "lucide-react";
import { enterpriseApiClient } from "@/lib/api";

const VerifyEmail = () => {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const token = searchParams.get("token");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Token manquant. Le lien de vérification est invalide.");
        return;
      }

      try {
        const res = await enterpriseApiClient.verifyEmail(token);
        if (!res.ok) {
          const errorMsg = res.error === "email_already_verified"
            ? "Votre email a déjà été vérifié."
            : res.error === "invalid_token"
            ? "Le lien de vérification est invalide ou a expiré."
            : res.error || "Une erreur est survenue lors de la vérification.";
          setStatus("error");
          setMessage(errorMsg);
          return;
        }

        setStatus("success");
        setMessage("Votre email a été vérifié avec succès ! Vous pouvez maintenant vous connecter.");
        
        toast({
          title: "Email vérifié",
          description: "Votre compte a été activé avec succès.",
          variant: "default",
        });
      } catch (error: any) {
        setStatus("error");
        setMessage(error?.message || "Une erreur est survenue lors de la vérification.");
      }
    };

    verifyEmail();
  }, [token, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header avec logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl shadow-lg">
              <Bot className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            e-Qwanza
          </h1>
        </div>

        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Vérification de l'email</CardTitle>
            <CardDescription className="text-center">
              {status === "loading" && "Vérification en cours..."}
              {status === "success" && "Vérification réussie"}
              {status === "error" && "Erreur de vérification"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              {status === "loading" && (
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
              )}
              {status === "success" && (
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              )}
              {status === "error" && (
                <XCircle className="h-16 w-16 text-red-500" />
              )}
            </div>

            <p className="text-center text-muted-foreground">{message}</p>

            {status === "success" && (
              <Button
                onClick={() => navigate("/auth")}
                className="w-full"
              >
                Se connecter
              </Button>
            )}

            {status === "error" && (
              <div className="space-y-2">
                <Button
                  onClick={() => navigate("/auth")}
                  className="w-full"
                  variant="default"
                >
                  Retour à la connexion
                </Button>
                <div className="text-center">
                  <Link
                    to="/auth"
                    className="text-sm text-primary hover:underline flex items-center justify-center gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    Renvoyer l'email de vérification
                  </Link>
                </div>
              </div>
            )}

            {status === "loading" && (
              <div className="text-center">
                <Link
                  to="/auth"
                  className="text-sm text-primary hover:underline flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la connexion
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>© 2025 e-Qwanza. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

