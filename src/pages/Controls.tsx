import { useNavigate } from 'react-router-dom';
import { ControlPointButton } from '@/components/controls/ControlPointButton';
import { CONTROL_POINTS, ControlPoint } from '@/types/haccp';

export default function Controls() {
  const navigate = useNavigate();

  const handleControlClick = (cp: ControlPoint) => {
    navigate(`/haccp/controls/${cp.code}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Points de Contrôle</h1>
        <p className="text-muted-foreground mt-1">
          Sélectionnez un point de contrôle pour voir l'historique ou effectuer un nouveau contrôle
        </p>
      </div>

      {/* Control Points Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {CONTROL_POINTS.map((cp) => (
          <ControlPointButton
            key={cp.id}
            controlPoint={cp}
            onClick={handleControlClick}
          />
        ))}
      </div>
    </div>
  );
}
