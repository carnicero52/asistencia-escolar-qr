import QRCode from 'qrcode';

// Generar QR como Data URL (base64)
export async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 400,
      margin: 2,
      color: {
        dark: '#1f2937',
        light: '#ffffff',
      },
    });
    return dataUrl;
  } catch (error) {
    console.error('Error generando QR:', error);
    throw error;
  }
}

// Generar QR como buffer (para descarga)
export async function generateQRCodeBuffer(text: string): Promise<Buffer> {
  try {
    const buffer = await QRCode.toBuffer(text, {
      width: 800,
      margin: 2,
      color: {
        dark: '#1f2937',
        light: '#ffffff',
      },
    });
    return buffer;
  } catch (error) {
    console.error('Error generando QR buffer:', error);
    throw error;
  }
}

// Generar URL del QR para un negocio
export function getQRUrlForNegocio(negocioId: string, baseUrl: string): string {
  return `${baseUrl}/scan?negocio=${negocioId}`;
}

// Generar URL de registro para un negocio
export function getRegistroUrlForNegocio(negocioId: string, baseUrl: string): string {
  return `${baseUrl}/registro?negocio=${negocioId}`;
}
