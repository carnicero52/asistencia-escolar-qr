// Integración con Google Sheets

interface CandidatoData {
  nombre: string;
  email: string;
  telefono: string;
  direccion?: string;
  puestoSolicitado?: string;
  experiencia?: string;
  educacion?: string;
  disponibilidad?: string;
  estado: string;
  fecha: string;
}

export async function sincronizarGoogleSheets(
  spreadsheetId: string,
  apiKey: string,
  range: string,
  candidato: CandidatoData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Google Sheets API v4
    // Primero necesitamos obtener el último row para append
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS&key=${apiKey}`;
    
    // Preparar la fila de datos
    const values = [
      candidato.nombre,
      candidato.email,
      candidato.telefono,
      candidato.direccion || '',
      candidato.puestoSolicitado || '',
      candidato.experiencia || '',
      candidato.educacion || '',
      candidato.disponibilidad || '',
      candidato.estado,
      candidato.fecha
    ];

    // La API de Google Sheets requiere OAuth2 o Service Account para escribir
    // Con solo API Key solo podemos leer, así que necesitamos un approach diferente
    
    // Opción: Usar Google Apps Script como webhook
    // Por ahora, guardamos la configuración y mostramos instrucciones
    
    return { 
      success: false, 
      error: 'Se requiere configuración adicional de Google Sheets. Usa la opción de exportar.' 
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Función para verificar conexión con Google Sheets
export async function verificarGoogleSheets(
  spreadsheetId: string,
  apiKey: string
): Promise<{ success: boolean; error?: string; titulo?: string }> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.error) {
      return { success: false, error: data.error.message };
    }
    
    return { 
      success: true, 
      titulo: data.properties?.title || 'Spreadsheet conectado'
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Generar URL para Google Sheets con los datos
export function generarGoogleSheetsUrl(candidatos: CandidatoData[]): string {
  // Crear CSV
  const headers = ['Nombre', 'Email', 'Teléfono', 'Dirección', 'Puesto', 'Experiencia', 'Educación', 'Disponibilidad', 'Estado', 'Fecha'];
  const rows = candidatos.map(c => [
    c.nombre,
    c.email,
    c.telefono,
    c.direccion || '',
    c.puestoSolicitado || '',
    c.experiencia || '',
    c.educacion || '',
    c.disponibilidad || '',
    c.estado,
    c.fecha
  ]);
  
  // Crear contenido CSV
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');
  
  // Codificar para URL
  const encoded = encodeURIComponent(csvContent);
  
  // Retornar instrucciones
  return `Para importar a Google Sheets:
1. Descarga el archivo CSV desde el botón "Exportar"
2. Abre Google Sheets (sheets.google.com)
3. Archivo → Importar → Subir
4. Selecciona el archivo CSV descargado`;
}
