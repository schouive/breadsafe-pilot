import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Server, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getPrintBridgeUrl, setPrintBridgeUrl, testPrintBridge } from '@/lib/zebraWebUsb';

interface PrintBridgeDialogProps {
  trigger?: React.ReactNode;
}

export function PrintBridgeDialog({ trigger }: PrintBridgeDialogProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(() => getPrintBridgeUrl() ?? '');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) setUrl(getPrintBridgeUrl() ?? '');
  }, [open]);

  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpUrl = url.trim().toLowerCase().startsWith('http://');
  const mixedContent = isHttps && isHttpUrl;

  const handleSave = () => {
    setPrintBridgeUrl(url.trim() || null);
    toast.success(url.trim() ? "Serveur d'impression enregistré" : "Serveur d'impression désactivé");
    setOpen(false);
  };

  const handleTest = async () => {
    if (!url.trim()) { toast.error('Renseignez une URL'); return; }
    setTesting(true);
    try {
      await testPrintBridge(url.trim());
      setPrintBridgeUrl(url.trim());
      toast.success('Serveur joignable — URL enregistrée — étiquette vide envoyée');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Échec du test');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Server className="h-4 w-4 mr-2" />
            Serveur d'impression
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" /> Serveur d'impression
          </DialogTitle>
          <DialogDescription>
            Envoie le ZPL vers un serveur HTTP (votre script Python sur le PC de bureau).
            Quand configuré, ce serveur est utilisé en priorité — y compris depuis le téléphone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label>URL complète de l'endpoint</Label>
            <Input
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="http://192.168.1.146:5000/print-label"
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Le serveur doit accepter <code>POST</code> avec JSON <code>{`{ "zpl": "..." }`}</code> et renvoyer 200.
            </p>
          </div>

          {mixedContent && (
            <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs flex gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">Contenu mixte bloqué</p>
                <p className="text-amber-800 dark:text-amber-300 mt-1">
                  Cette app est en HTTPS, votre serveur en HTTP. Les navigateurs bloqueront l'appel
                  (surtout sur mobile). Solution : exposer votre serveur Python en HTTPS via
                  <strong> Cloudflare Tunnel</strong> ou <strong>ngrok</strong>, puis utiliser l'URL HTTPS.
                </p>
              </div>
            </div>
          )}

          {!mixedContent && url && (
            <div className="rounded-md border border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/30 p-2 text-xs flex gap-2 items-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-emerald-800 dark:text-emerald-300">Compatible avec le navigateur actuel.</span>
            </div>
          )}

          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer">Exemple de serveur Python minimal</summary>
            <pre className="mt-2 bg-muted p-2 rounded overflow-auto">{`# pip install flask flask-cors
from flask import Flask, request
from flask_cors import CORS
import socket

app = Flask(__name__)
CORS(app)  # autorise les appels depuis l'app

PRINTER_IP = "192.168.1.50"   # IP de la Zebra
PRINTER_PORT = 9100            # port RAW ZPL standard

@app.route("/print-label", methods=["POST"])
def print_label():
    zpl = request.get_json().get("zpl", "")
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.connect((PRINTER_IP, PRINTER_PORT))
    s.sendall(zpl.encode("utf-8"))
    s.close()
    return {"ok": True}

app.run(host="0.0.0.0", port=5000)`}</pre>
          </details>
        </div>

        <DialogFooter className="gap-2 sm:gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => { setUrl(''); setPrintBridgeUrl(null); toast.success('Serveur désactivé'); setOpen(false); }}>
            Désactiver
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing || !url.trim()}>
            {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Tester
          </Button>
          <Button onClick={handleSave}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
