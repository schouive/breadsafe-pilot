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


function isWebUsbSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.usb;
}

async function openZebraDevice(forcePicker = false): Promise<ZebraDevice> {
  if (!isWebUsbSupported()) {
    throw new Error("WebUSB n'est pas supporté par ce navigateur (utilisez Chrome ou Edge en HTTPS).");
  }

  let device: USBDevice | null = null;

  if (!forcePicker) {
    const devices = await navigator.usb!.getDevices();
    device = devices.find(d => d.vendorId === ZEBRA_VENDOR_ID) ?? null;
  }

  if (!device) {
    device = await navigator.usb!.requestDevice({ filters: [{ vendorId: ZEBRA_VENDOR_ID }] });
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
  return cachedDevice;
}

function isUsbAccessBlocked(error: unknown): boolean {
  const message = String((error as Error)?.message ?? error ?? '').toLowerCase();
  return message.includes('access denied') || message.includes('utilisée par le pilote') || message.includes('claiminterface');
}

function browserPrintBaseUrl(): string {
  return window.location.protocol === 'https:' ? 'https://localhost:9101/' : 'http://localhost:9100/';
}

function browserPrintRequest(method: 'GET' | 'POST', path: string, body?: unknown): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, browserPrintBaseUrl() + path, true);
    xhr.timeout = 6000;
    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;
      if (xhr.status === 200) resolve(xhr.responseText);
      else reject(new Error(xhr.responseText || `Service Zebra indisponible (${xhr.status || 'timeout'})`));
    };
    xhr.onerror = () => reject(new Error('Service Zebra Browser Print introuvable sur ce poste.'));
    xhr.ontimeout = () => reject(new Error('Service Zebra Browser Print trop lent ou introuvable.'));
    xhr.send(body ? JSON.stringify(body) : undefined);
  });
}

async function getDefaultBrowserPrintDevice(): Promise<BrowserPrintDevice> {
  const response = await browserPrintRequest('GET', 'default?type=printer');
  if (!response) throw new Error('Aucune imprimante par défaut configurée dans Zebra Browser Print.');
  return JSON.parse(response) as BrowserPrintDevice;
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
  try {
    const dev = (cachedDevice && !opts.forcePicker) ? cachedDevice : await openZebraDevice(opts.forcePicker);
    const data = new TextEncoder().encode(zpl);
    await dev.device.transferOut(dev.endpointOut, data);
    return { method: 'webusb' };
  } catch (error) {
    cachedDevice = null;
    if (!isUsbAccessBlocked(error)) throw error;

    try {
      await printZplWithBrowserPrint(zpl);
      return { method: 'browserprint' };
    } catch (browserPrintError) {
      throw new Error(
        "L'imprimante est reconnue, mais Windows bloque l'accès WebUSB. " +
        "Installez/ouvrez Zebra Browser Print puis définissez cette imprimante par défaut, ou utilisez le téléchargement ZPL. " +
        `Détail WebUSB : ${(error as Error)?.message ?? error}. ` +
        `Détail Browser Print : ${(browserPrintError as Error)?.message ?? browserPrintError}`
      );
    }
  }
}

export function isZebraSupported(): boolean {
  return isWebUsbSupported();
}

/** Force la sélection d'une nouvelle imprimante (utile pour un changement de matériel) */
export async function pickZebraPrinter(): Promise<void> {
  cachedDevice = null;
  await openZebraDevice(true);
}
