/// <reference types="w3c-web-usb" />
/**
 * Envoi direct de ZPL vers une imprimante Zebra via WebUSB.
 *
 * Compatible Chrome/Edge sur HTTPS. L'utilisateur doit autoriser une fois
 * son imprimante (sélection dans la popup navigateur). Le navigateur mémorise
 * ensuite l'autorisation pour ce device.
 */

const ZEBRA_VENDOR_ID = 0x0a5f; // Zebra Technologies

interface ZebraDevice {
  device: USBDevice;
  endpointOut: number;
  interfaceNumber: number;
}

export type ZebraPrintMethod = 'webusb' | 'browserprint';

export interface ZebraPrintResult {
  method: ZebraPrintMethod;
}

interface BrowserPrintDevice {
  name: string;
  uid: string;
  connection: string;
  deviceType: string;
  version?: number;
  provider?: string;
  manufacturer?: string;
}

let cachedDevice: ZebraDevice | null = null;
let selectedUsbDevice: USBDevice | null = null;
let preferredPrintMethod: ZebraPrintMethod | null = null;

const BROWSER_PRINT_SSL_ACCEPTED_MESSAGE = 'ssl certificate has been accepted. retry connection.';
const PREFERRED_PRINT_METHOD_STORAGE_KEY = 'breadshop_preferred_zebra_print_method';
const PRINT_BRIDGE_URL_STORAGE_KEY = 'breadshop_print_bridge_url';

export function getPrintBridgeUrl(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(PRINT_BRIDGE_URL_STORAGE_KEY);
}

export function setPrintBridgeUrl(url: string | null) {
  if (typeof window === 'undefined') return;
  if (url && url.trim()) window.localStorage.setItem(PRINT_BRIDGE_URL_STORAGE_KEY, url.trim());
  else window.localStorage.removeItem(PRINT_BRIDGE_URL_STORAGE_KEY);
}

async function printZplViaBridge(zpl: string): Promise<void> {
  const url = getPrintBridgeUrl();
  if (!url) throw new Error("Aucune URL de serveur d'impression configurée.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zpl }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Serveur d'impression : HTTP ${res.status} ${text || ''}`.trim());
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error("Serveur d'impression injoignable (timeout 8 s). Vérifiez l'IP, le pare-feu et le Wi-Fi.");
    }
    const msg = String(e?.message || e || '');
    if (msg.toLowerCase().includes('failed to fetch')) {
      throw new Error(
        "Impossible de joindre le serveur d'impression. " +
        "Si vous êtes en HTTPS (mobile), le navigateur bloque les appels HTTP locaux : " +
        "exposez votre serveur Python en HTTPS (Cloudflare Tunnel, ngrok…) puis renseignez l'URL HTTPS."
      );
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export async function testPrintBridge(url: string): Promise<void> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  try {
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.toLowerCase().startsWith('http://')) {
      throw new Error("L'app est en HTTPS mais l'URL est en HTTP. Utilisez l'URL HTTPS Cloudflare qui finit par /print-label.");
    }
    const res = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zpl: '^XA^XZ' }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ' — ' + text.slice(0, 200) : ''}`);
    }
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error("Timeout 8 s — le serveur n'a pas répondu. Vérifiez que le script Python tourne et que le tunnel est actif.");
    }
    const msg = String(e?.message || e || '');
    if (msg.toLowerCase().includes("load failed")) {
      throw new Error("Load failed = serveur/tunnel injoignable depuis le téléphone. Vérifiez que le script Python tourne encore, que le tunnel HTTPS est relancé, puis recopiez sa nouvelle URL si elle a changé.");
    }
    if (msg.toLowerCase().includes('failed to fetch')) {
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const isHttpUrl = url.toLowerCase().startsWith('http://');
      if (isHttps && isHttpUrl) {
        throw new Error("Mixed content : l'app est en HTTPS mais l'URL est en HTTP. Utilisez l'URL HTTPS du tunnel Cloudflare (https://...trycloudflare.com/print-label).");
      }
      throw new Error("Réseau injoignable. Causes possibles : (1) CORS non activé côté Python — ajoutez flask-cors, (2) tunnel arrêté, (3) URL incorrecte (vérifiez qu'elle finit bien par /print-label).");
    }
    throw new Error(msg || 'Échec inconnu');
  } finally {
    clearTimeout(t);
  }
}



function getPreferredPrintMethod(): ZebraPrintMethod | null {
  if (preferredPrintMethod) return preferredPrintMethod;
  if (typeof window === 'undefined') return null;

  const stored = window.localStorage.getItem(PREFERRED_PRINT_METHOD_STORAGE_KEY);
  if (stored === 'webusb' || stored === 'browserprint') {
    preferredPrintMethod = stored;
    return stored;
  }
  return null;
}

function setPreferredPrintMethod(method: ZebraPrintMethod | null) {
  preferredPrintMethod = method;
  if (typeof window === 'undefined') return;

  if (method) window.localStorage.setItem(PREFERRED_PRINT_METHOD_STORAGE_KEY, method);
  else window.localStorage.removeItem(PREFERRED_PRINT_METHOD_STORAGE_KEY);
}

function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.usb;
}

async function requestZebraDevice(): Promise<USBDevice> {
  if (!isWebUsbSupported()) {
    throw new Error("WebUSB n'est pas supporté par ce navigateur (utilisez Chrome ou Edge en HTTPS).");
  }

  return navigator.usb!.requestDevice({ filters: [{ vendorId: ZEBRA_VENDOR_ID }] });
}

async function openZebraDevice(forcePicker = false, allowPicker = true): Promise<ZebraDevice> {
  if (!isWebUsbSupported()) {
    throw new Error("WebUSB n'est pas supporté par ce navigateur (utilisez Chrome ou Edge en HTTPS).");
  }

  let device: USBDevice | null = null;

  if (!forcePicker) {
    if (selectedUsbDevice) {
      device = selectedUsbDevice;
    } else {
      const devices = await navigator.usb!.getDevices();
      device = devices.find(d => d.vendorId === ZEBRA_VENDOR_ID) ?? null;
    }
  }

  if (!device && allowPicker) {
    device = await requestZebraDevice();
    selectedUsbDevice = device;
  }

  if (!device) {
    throw new Error("Aucune imprimante Zebra déjà autorisée en WebUSB. Utilisez le bouton Imprimante pour sélectionner l'imprimante USB, ou Zebra Browser Print pour une imprimante réseau/WiFi.");
  }

  if (!device.opened) await device.open();
  if (device.configuration === null) await device.selectConfiguration(1);

  // Trouver l'interface + endpoint OUT (impression)
  let interfaceNumber = -1;
  let endpointOut = -1;
  for (const iface of device.configuration!.interfaces) {
    for (const alt of iface.alternates) {
      const ep = alt.endpoints.find(e => e.direction === 'out');
      if (ep) {
        interfaceNumber = iface.interfaceNumber;
        endpointOut = ep.endpointNumber;
        break;
      }
    }
    if (interfaceNumber >= 0) break;
  }
  if (interfaceNumber < 0) throw new Error("Aucune interface d'impression trouvée sur l'imprimante.");

  try {
    await device.claimInterface(interfaceNumber);
  } catch (e: unknown) {
    throw new Error(
      "Impossible d'accéder à l'imprimante (peut-être utilisée par le pilote système). " +
      "Sur Linux, débranchez/rebranchez l'imprimante ; sur Windows, utilisez Zebra Setup Utilities pour libérer le port. " +
      `Détail : ${(e as Error)?.message ?? e}`
    );
  }

  cachedDevice = { device, endpointOut, interfaceNumber };
  setPreferredPrintMethod('webusb');
  return cachedDevice;
}

function isUsbAccessBlocked(error: unknown): boolean {
  const message = String((error as Error)?.message ?? error ?? '').toLowerCase();
  return message.includes('access denied') || message.includes('utilisée par le pilote') || message.includes('claiminterface');
}

function shouldPreferBrowserPrint(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !isWebUsbSupported() || navigator.userAgent.toLowerCase().includes('windows');
}

function isEmbeddedApp(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function getBrowserPrintHelpMessage(detail?: unknown): string {
  const message = String((detail as Error)?.message ?? detail ?? 'Service Zebra Browser Print indisponible.');

  if (isEmbeddedApp() && (message.toLowerCase().includes('certificat localhost') || message.toLowerCase().includes('cors') || message.toLowerCase().includes('bloqué par le navigateur'))) {
    return (
      'Zebra Browser Print est bloqué dans l’aperçu intégré du navigateur. ' +
      'Ouvrez l’application dans un onglet normal (URL publiée ou domaine métier), puis relancez l’impression depuis là. ' +
      `Détail : ${message}`
    );
  }

  if (message.toLowerCase().includes(BROWSER_PRINT_SSL_ACCEPTED_MESSAGE)) {
    return (
      'Le certificat Zebra Browser Print vient d\'être accepté. Fermez l\'onglet localhost si besoin puis réessayez dans 2 secondes. '
      + `Détail : ${message}`
    );
  }

  if (message.toLowerCase().includes('certificat localhost') || message.toLowerCase().includes('cors')) {
    return (
      'Zebra Browser Print est installé mais le navigateur bloque encore son accès local. ' +
      'Ouvrez https://localhost:9101/ssl_support dans ce navigateur, acceptez le certificat Zebra, puis réessayez. ' +
      `Détail : ${message}`
    );
  }

  return (
    'Zebra Browser Print n\'est pas prêt sur ce poste. Vérifiez que le logiciel est lancé et que cette imprimante est définie par défaut dedans. ' +
    `Détail : ${message}`
  );
}

function browserPrintBaseUrl(): string {
  return window.location.protocol === 'https:' ? 'https://localhost:9101/' : 'http://localhost:9100/';
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isBrowserPrintSslAcceptedRetryMessage(value: unknown): boolean {
  const message = String((value as Error)?.message ?? value ?? '').toLowerCase();
  return message.includes(BROWSER_PRINT_SSL_ACCEPTED_MESSAGE);
}

function isLikelyBrowserPrintJson(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}

function browserPrintRequest(method: 'GET' | 'POST', path: string, body?: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, browserPrintBaseUrl() + path, true);
    xhr.timeout = 10000;
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;
      if (xhr.status === 200) resolve(xhr.responseText);
      else reject(new Error(xhr.responseText || (
        xhr.status === 0
          ? 'Service Zebra Browser Print bloqué par le navigateur (certificat localhost ou CORS).'
          : `Service Zebra indisponible (${xhr.status})`
      )));
    };
    xhr.onerror = () => reject(new Error('Service Zebra Browser Print introuvable sur ce poste.'));
    xhr.ontimeout = () => reject(new Error('Service Zebra Browser Print trop lent ou introuvable.'));
    xhr.send(body ? JSON.stringify(body) : undefined);
  });
}

let cachedBrowserPrintDevice: { device: BrowserPrintDevice; ts: number } | null = null;
const BROWSER_PRINT_DEVICE_TTL_MS = 60_000;

async function getDefaultBrowserPrintDevice(forceRefresh = false): Promise<BrowserPrintDevice> {
  if (!forceRefresh && cachedBrowserPrintDevice && (Date.now() - cachedBrowserPrintDevice.ts) < BROWSER_PRINT_DEVICE_TTL_MS) {
    return cachedBrowserPrintDevice.device;
  }

  let lastError: unknown;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const response = await browserPrintRequest('GET', 'default?type=printer');
      if (!response) throw new Error('Aucune imprimante par défaut configurée dans Zebra Browser Print.');

      if (isBrowserPrintSslAcceptedRetryMessage(response)) {
        lastError = response;
        await sleep(1200);
        continue;
      }

      if (!isLikelyBrowserPrintJson(response)) {
        throw new Error(response);
      }

      const device = JSON.parse(response) as BrowserPrintDevice;
      cachedBrowserPrintDevice = { device, ts: Date.now() };
      return device;
    } catch (error) {
      lastError = error;

      if (isBrowserPrintSslAcceptedRetryMessage(error) && attempt < 3) {
        await sleep(1200);
        continue;
      }

      // Transient network / service warm-up : on retente quelques fois.
      const msg = String((error as Error)?.message ?? error ?? '').toLowerCase();
      const transient = msg.includes('trop lent') || msg.includes('introuvable') || msg.includes('bloqué par le navigateur') || msg.includes('indisponible');
      if (transient && attempt < 3) {
        await sleep(800);
        continue;
      }

      throw error;
    }
  }

  throw new Error(String((lastError as Error)?.message ?? lastError ?? 'Aucune imprimante Browser Print disponible.'));
}

async function browserPrintWrite(device: BrowserPrintDevice, zpl: string): Promise<void> {
  await browserPrintRequest('POST', 'write', {
    device: {
      name: device.name,
      uid: device.uid,
      connection: device.connection,
      deviceType: device.deviceType,
      version: device.version ?? 2,
      provider: device.provider,
      manufacturer: device.manufacturer,
    },
    data: zpl,
  });
}

async function printZplWithBrowserPrint(zpl: string): Promise<void> {
  let device = await getDefaultBrowserPrintDevice();
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await browserPrintWrite(device, zpl);
      return;
    } catch (error) {
      lastError = error;
      const msg = String((error as Error)?.message ?? error ?? '').toLowerCase();
      // Retente sur erreurs transitoires (service en cours de chauffe, hoquet réseau local).
      const transient = msg.includes('trop lent') || msg.includes('introuvable') || msg.includes('bloqué par le navigateur') || msg.includes('indisponible') || isBrowserPrintSslAcceptedRetryMessage(error);
      if (!transient || attempt === 2) throw error;
      await sleep(800);
      // Au 2ᵉ retry, on rafraîchit le device par sécurité.
      if (attempt === 1) {
        try { device = await getDefaultBrowserPrintDevice(true); } catch { /* on garde l'ancien */ }
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Warm-up : vérifie en amont que Browser Print est joignable et met le device en cache. */
export async function warmUpBrowserPrint(): Promise<void> {
  try { await getDefaultBrowserPrintDevice(true); } catch { /* silencieux : printZpl fera remonter l'erreur réelle */ }
}

/**
 * Envoie le ZPL fourni à l'imprimante Zebra connectée.
 * Demande l'autorisation utilisateur lors du premier appel.
 */
export async function printZpl(zpl: string, opts: { forcePicker?: boolean } = {}): Promise<ZebraPrintResult> {
  const hasUserActivation = typeof navigator !== 'undefined' && !!navigator.userActivation?.isActive;
  const methodPreference = getPreferredPrintMethod();

  // 1) Bridge HTTP (serveur Python local/distant) — priorité si configuré
  if (!opts.forcePicker && getPrintBridgeUrl()) {
    try {
      await printZplViaBridge(zpl);
      return { method: 'browserprint' };
    } catch (bridgeError) {
      // Pas de fallback silencieux : on remonte l'erreur claire
      throw bridgeError;
    }
  }


  if (!opts.forcePicker && methodPreference !== 'webusb' && shouldPreferBrowserPrint()) {
    try {
      await printZplWithBrowserPrint(zpl);
      setPreferredPrintMethod('browserprint');
      return { method: 'browserprint' };
    } catch (browserPrintError) {
      // Si WebUSB est dispo, on tente en repli avant d'abandonner
      // (utile quand Browser Print n'est pas installé / bloqué par le navigateur).
      if (!isWebUsbSupported()) {
        throw new Error(getBrowserPrintHelpMessage(browserPrintError));
      }
      try {
        const dev = cachedDevice ?? await openZebraDevice(false, hasUserActivation);
        const data = new TextEncoder().encode(zpl);
        await dev.device.transferOut(dev.endpointOut, data);
        return { method: 'webusb' };
      } catch (webUsbError) {
        cachedDevice = null;
        throw new Error(
          getBrowserPrintHelpMessage(browserPrintError) +
          ` · WebUSB indisponible : ${(webUsbError as Error)?.message ?? webUsbError}`
        );
      }
    }
  }

  try {
    const dev = (cachedDevice && !opts.forcePicker) ? cachedDevice : await openZebraDevice(opts.forcePicker);
    const data = new TextEncoder().encode(zpl);
    await dev.device.transferOut(dev.endpointOut, data);
    return { method: 'webusb' };
  } catch (error) {
    cachedDevice = null;

    if (!opts.forcePicker) {
      try {
        await printZplWithBrowserPrint(zpl);
        setPreferredPrintMethod('browserprint');
        return { method: 'browserprint' };
      } catch (browserPrintError) {
        if (isUsbAccessBlocked(error)) {
          throw new Error(
            "L'imprimante est reconnue, mais Windows bloque l'accès WebUSB. " +
            "Installez/ouvrez Zebra Browser Print puis définissez cette imprimante par défaut, ou utilisez le téléchargement ZPL. " +
            `Détail WebUSB : ${(error as Error)?.message ?? error}. ` +
            `Détail Browser Print : ${(browserPrintError as Error)?.message ?? browserPrintError}`
          );
        }

        throw new Error(
          "Aucune imprimante compatible détectée en WebUSB, et Zebra Browser Print n'a pas pris le relais. " +
          `Détail WebUSB : ${(error as Error)?.message ?? error}. ` +
          `Détail Browser Print : ${(browserPrintError as Error)?.message ?? browserPrintError}`
        );
      }
    }

    throw error;
  }
}

export function isZebraSupported(): boolean {
  return isWebUsbSupported();
}

/** Force la sélection d'une nouvelle imprimante (utile pour un changement de matériel) */
export async function pickZebraPrinter(): Promise<ZebraPrintMethod> {
  cachedDevice = null;
  selectedUsbDevice = null;
  setPreferredPrintMethod(null);

  // Sur Windows / Surface, l'imprimante Zebra est souvent en WiFi ou réseau :
  // WebUSB ne verra rien. On essaie donc Browser Print en priorité.
  if (shouldPreferBrowserPrint()) {
    try {
      const device = await getDefaultBrowserPrintDevice();
      if (device?.name) {
        setPreferredPrintMethod('browserprint');
        return 'browserprint';
      }
    } catch (browserPrintError) {
      // Si Browser Print n'est pas dispo, on tentera WebUSB ci-dessous.
      if (!isWebUsbSupported()) {
        throw new Error(getBrowserPrintHelpMessage(browserPrintError));
      }
    }
  }

  if (isWebUsbSupported()) {
    try {
      selectedUsbDevice = await requestZebraDevice();
      setPreferredPrintMethod('webusb');
      return 'webusb';
    } catch (error) {
      const message = String((error as Error)?.message ?? error ?? '').toLowerCase();
      if (message.includes('no device selected')) throw error;
    }
  }

  try {
    const device = await getDefaultBrowserPrintDevice();
    if (device?.name) {
      setPreferredPrintMethod('browserprint');
      return 'browserprint';
    }
  } catch (error) {
    throw new Error(getBrowserPrintHelpMessage(error));
  }

  throw new Error('Aucune imprimante Zebra disponible (ni USB, ni Browser Print).');
}
