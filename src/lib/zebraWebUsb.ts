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
}

let cachedDevice: ZebraDevice | null = null;

declare global {
  interface Navigator {
    usb?: USB;
  }
}

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

  cachedDevice = { device, endpointOut };
  return cachedDevice;
}

/**
 * Envoie le ZPL fourni à l'imprimante Zebra connectée.
 * Demande l'autorisation utilisateur lors du premier appel.
 */
export async function printZpl(zpl: string, opts: { forcePicker?: boolean } = {}): Promise<void> {
  const dev = (cachedDevice && !opts.forcePicker) ? cachedDevice : await openZebraDevice(opts.forcePicker);
  const data = new TextEncoder().encode(zpl);
  await dev.device.transferOut(dev.endpointOut, data);
}

export function isZebraSupported(): boolean {
  return isWebUsbSupported();
}

/** Force la sélection d'une nouvelle imprimante (utile pour un changement de matériel) */
export async function pickZebraPrinter(): Promise<void> {
  cachedDevice = null;
  await openZebraDevice(true);
}
