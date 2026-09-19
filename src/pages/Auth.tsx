import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import logo from '@/assets/logo-breadshop.png';
import authImage from '@/assets/breadshop-auth.jpg';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });

  const handleLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    const { error } = await signIn(data.email, data.password);
    setIsSubmitting(false);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou mot de passe incorrect');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Connexion réussie');
      navigate('/');
    }
  };

  const handleSignup = async (data: SignupFormData) => {
    setIsSubmitting(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setIsSubmitting(false);
    
    if (error) {
      if (error.message.includes('already registered')) {
        toast.error('Cet email est déjà utilisé');
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success('Compte créé avec succès');
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(440px,0.92fr)]">
      <section className="relative hidden min-h-screen overflow-hidden lg:block">
        <img src={authImage} alt="Pain burger Bread Shop" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-foreground/60" />
        <div className="relative z-10 flex h-full max-w-2xl flex-col justify-between p-12 xl:p-16">
          <div className="inline-flex w-fit items-center gap-4 rounded-lg bg-card/95 px-5 py-4 shadow-elevated">
            <img src={logo} alt="Bread Shop" className="h-14 w-auto" />
            <div>
              <p className="text-sm font-bold uppercase text-primary">Bread Shop</p>
              <p className="text-xs text-muted-foreground">Street Food Bakery</p>
            </div>
          </div>
          <div className="max-w-xl text-primary-foreground">
            <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase">
              <ShieldCheck className="h-5 w-5 text-gold" /> Qualité & sécurité alimentaire
            </p>
            <h1 className="font-heading text-5xl font-semibold leading-tight xl:text-6xl">
              La maîtrise HACCP,<br />au quotidien.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-primary-foreground/80">
              Contrôles, traçabilité et production réunis dans un espace conçu pour les équipes Bread Shop.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md space-y-7">
          <div className="flex flex-col items-center gap-3 lg:items-start">
            <img src={logo} alt="Bread Shop" className="h-16 w-auto lg:hidden" />
            <p className="text-xs font-semibold uppercase text-muted-foreground">Espace professionnel</p>
            <div className="text-center lg:text-left">
              <h2 className="font-heading text-3xl font-semibold text-foreground">Bienvenue sur BreadSafe</h2>
              <p className="mt-2 text-muted-foreground">Gestion qualité Bread Shop SAS</p>
            </div>
          </div>

        <Card className="border-border shadow-card">
          <Tabs defaultValue="login" className="w-full">
            <CardHeader className="pb-2">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-4">
              <TabsContent value="login" className="space-y-4 mt-0">
                <CardDescription className="text-center">
                  Connectez-vous pour accéder à l'application
                </CardDescription>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="votre@email.fr"
                      {...loginForm.register('email')}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Mot de passe</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      {...loginForm.register('password')}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full touch-target justify-between" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Connexion...
                      </>
                    ) : (
                      <><span>Se connecter</span><ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="space-y-4 mt-0">
                <CardDescription className="text-center">
                  Créez votre compte pour commencer
                </CardDescription>
                <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nom complet</Label>
                    <Input
                      id="signup-name"
                      placeholder="Jean Dupont"
                      {...signupForm.register('fullName')}
                    />
                    {signupForm.formState.errors.fullName && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="votre@email.fr"
                      {...signupForm.register('email')}
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Mot de passe</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      {...signupForm.register('password')}
                    />
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmer le mot de passe</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="••••••••"
                      {...signupForm.register('confirmPassword')}
                    />
                    {signupForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive">
                        {signupForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full touch-target justify-between" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      <><span>Créer mon compte</span><ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Accès réservé aux équipes Bread Shop
        </p>
      </div>
      </section>
    </div>
  );
}
