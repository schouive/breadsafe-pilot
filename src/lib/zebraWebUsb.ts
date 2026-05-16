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
  } catch (e: any) {
    throw new Error(
      "Impossible d'accéder à l'imprimante (peut-être utilisée par le pilote système). " +
      "Sur Linux, débranchez/rebranchez l'imprimante ; sur Windows, utilisez Zebra Setup Utilities pour libérer le port. " +
      `Détail : ${e?.message ?? e}`
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

async function getDefaultBrowserPrintDevice(): Promise<BrowserPrintDevice> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
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

      return JSON.parse(response) as BrowserPrintDevice;
    } catch (error) {
      lastError = error;

      if (isBrowserPrintSslAcceptedRetryMessage(error) && attempt < 2) {
        await sleep(1200);
        continue;
      }

      throw error;
    }
  }

  throw new Error(String((lastError as Error)?.message ?? lastError ?? 'Aucune imprimante Browser Print disponible.'));
}

async function printZplWithBrowserPrint(zpl: string): Promise<void> {
  const device = await getDefaultBrowserPrintDevice();
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

/**
 * Envoie le ZPL fourni à l'imprimante Zebra connectée.
 * Demande l'autorisation utilisateur lors du premier appel.
 */
export async function printZpl(zpl: string, opts: { forcePicker?: boolean } = {}): Promise<ZebraPrintResult> {
  const hasUserActivation = typeof navigator !== 'undefined' && !!navigator.userActivation?.isActive;
  const methodPreference = getPreferredPrintMethod();

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
  preferredPrintMethod = null;

  // Sur Windows / Surface, l'imprimante Zebra est souvent en WiFi ou réseau :
  // WebUSB ne verra rien. On essaie donc Browser Print en priorité.
  if (shouldPreferBrowserPrint()) {
    try {
      const device = await getDefaultBrowserPrintDevice();
      if (device?.name) {
        preferredPrintMethod = 'browserprint';
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
      preferredPrintMethod = 'webusb';
      return 'webusb';
    } catch (error) {
      const message = String((error as Error)?.message ?? error ?? '').toLowerCase();
      if (message.includes('no device selected')) throw error;
    }
  }

  try {
    const device = await getDefaultBrowserPrintDevice();
    if (device?.name) {
      preferredPrintMethod = 'browserprint';
      return 'browserprint';
    }
  } catch (error) {
    throw new Error(getBrowserPrintHelpMessage(error));
  }

  throw new Error('Aucune imprimante Zebra disponible (ni USB, ni Browser Print).');
}
