import { MetalDetectorSettings } from '@/components/settings/MetalDetectorSettings';

export default function MetalDetectorSettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Détecteur métaux</h1>
        <p className="text-muted-foreground mt-1">Configuration et seuils du contrôle CCP</p>
      </div>
      <MetalDetectorSettings />
    </div>
  );
}
