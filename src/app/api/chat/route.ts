import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@libsql/client';
import ZAI from 'z-ai-web-dev-sdk';

// Base de datos directa - Turso remoto
function getDb() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL || 'file:/home/z/my-project/db/custom.db',
    authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN,
  });
}

// Verificar sesión para obtener negocio
async function getNegocioFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session_token')?.value;
  
  if (!token) return null;

  const db = getDb();
  const result = await db.execute({
    sql: `SELECT s.negocioId, n.slug FROM Sesion s 
          JOIN Negocio n ON n.id = s.negocioId
          WHERE s.token = ? AND s.expiresAt > ?`,
    args: [token, new Date().toISOString()]
  });

  return result.rows.length > 0 ? { 
    negocioId: result.rows[0].negocioId as string,
    slug: result.rows[0].slug as string 
  } : null;
}

// Inicializar ZAI
let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Construir el prompt del sistema basado en el negocio y modo
function buildSystemPrompt(negocio: {
  nombre: string;
  descripcion?: string | null;
  puestoBuscado?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  whatsapp?: string | null;
  requisitos?: string | null;
  modoBot?: string | null;
  conocimientoBase?: string | null;
}) {
  const basePrompt = `Eres el asistente virtual de "${negocio.nombre}".
${negocio.descripcion ? `Descripción del negocio: ${negocio.descripcion}` : ''}
${negocio.puestoBuscado ? `Están buscando: ${negocio.puestoBuscado}` : ''}
${negocio.direccion ? `Dirección: ${negocio.direccion}` : ''}
${negocio.telefono ? `Teléfono: ${negocio.telefono}` : ''}
${negocio.whatsapp ? `WhatsApp: ${negocio.whatsapp}` : ''}
${negocio.requisitos ? `Requisitos de contratación: ${negocio.requisitos}` : ''}

INSTRUCCIONES IMPORTANTES:
- Eres amable, profesional y servicial
- Respondes en español
- Si no sabes algo, dilo honestamente y ofrece alternativas
- Si preguntan por trabajo o vacantes, guíalos amablemente
- Mantén las respuestas concisas pero útiles
- Usa un tono cercano pero profesional
- NO repitas el mensaje de bienvenida, responde directamente a lo que te preguntan`;

  // Agregar base de conocimiento si existe
  let knowledgeSection = '';
  if (negocio.conocimientoBase && negocio.conocimientoBase.length > 100) {
    // Limitar el conocimiento a los primeros 15000 caracteres para no exceder el contexto
    const maxKnowledge = 15000;
    const truncatedKnowledge = negocio.conocimientoBase.length > maxKnowledge 
      ? negocio.conocimientoBase.substring(0, maxKnowledge) + '\n... (contenido adicional disponible)'
      : negocio.conocimientoBase;
    
    knowledgeSection = `

======== BASE DE CONOCIMIENTO ========
A continuación tienes información importante que DEBES usar para responder las preguntas del usuario. Esta información contiene documentos, leyes, reglamentos y procedimientos relevantes:

${truncatedKnowledge}

INSTRUCCIONES SOBRE LA BASE DE CONOCIMIENTO:
- Cuando te hagan una pregunta relacionada con la información arriba, RESPONDE basándote EXCLUSIVAMENTE en ese contenido
- Si la información está en la base de conocimiento, úsala para dar respuestas precisas y detalladas
- Cita la fuente o el documento cuando sea relevante (ej: "Según el documento X...")
- Si la pregunta NO está relacionada con la base de conocimiento, responde normalmente según tu conocimiento general
- NUNCA inventes información que no esté en la base de conocimiento
========================================`;
  }

  // Personalizar según el modo
  const modoBot = negocio.modoBot || 'hibrido';
  const modePrompts: Record<string, string> = {
    faq: `\n\nMODO FAQ: Responde principalmente con información predefinida sobre el negocio. Si la pregunta no está relacionada con FAQs conocidas, indica amablemente que puedes ayudar con información sobre el negocio.`,
    citas: `\n\nMODO CITAS: Estás enfocado en agendar citas. Si el usuario quiere agendar, pide nombre, fecha preferida y contacto. Indica que tomará su solicitud y alguien le confirmará.`,
    consulta: `\n\nMODO CONSULTA: Estás enfocado en responder consultas sobre productos o servicios del negocio. Sé informativo y detallado sobre lo que ofrece el negocio.`,
    conversacional: `\n\nMODO CONVERSACIONAL: Mantén una conversación natural y fluida. Puedes hablar de temas generales mientras mantienes el contexto del negocio.`,
    hibrido: `\n\nMODO HÍBRIDO: Puedes manejar cualquier tipo de interacción: responder FAQs, agendar citas, resolver consultas, o simplemente conversar. Adapta tu respuesta según lo que necesite el usuario.`
  };

  return basePrompt + knowledgeSection + (modePrompts[modoBot] || modePrompts.hibrido);
}

// Llamar a OpenAI
async function callOpenAI(apiKey: string, model: string, messages: Array<{role: string; content: string}>, temperature: number) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-3.5-turbo',
      messages,
      temperature
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${response.status} - ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content;
}

// Llamar a Anthropic (Claude)
async function callAnthropic(apiKey: string, model: string, messages: Array<{role: string; content: string}>, temperature: number) {
  const systemMessage = messages.find(m => m.role === 'system')?.content || '';
  const otherMessages = messages.filter(m => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model || 'claude-3-haiku-20240307',
      max_tokens: 2048,
      system: systemMessage,
      messages: otherMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      temperature
    })
  });

  if (!response.ok) {
    throw new Error(`Anthropic error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0]?.text;
}

// Llamar a Google Gemini
async function callGemini(apiKey: string, model: string, messages: Array<{role: string; content: string}>, temperature: number) {
  const modelName = model || 'gemini-pro';
  
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

// Llamar a DeepSeek
async function callDeepSeek(apiKey: string, model: string, messages: Array<{role: string; content: string}>, temperature: number) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'deepseek-chat',
      messages,
      temperature
    })
  });

  if (!response.ok) {
    throw new Error(`DeepSeek error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { slug, message, history = [] } = body;

    console.log('[CHAT] Recibiendo mensaje:', { slug, message: message?.substring(0, 50) });

    if (!message) {
      return NextResponse.json(
        { error: 'Falta el mensaje' },
        { status: 400 }
      );
    }

    // Si no hay slug, obtener de la sesión
    if (!slug) {
      const session = await getNegocioFromSession();
      if (!session) {
        return NextResponse.json(
          { error: 'No autenticado' },
          { status: 401 }
        );
      }
      slug = session.slug;
      console.log('[CHAT] Slug obtenido de sesión:', slug);
    }

    const db = getDb();

    // Obtener información del negocio directamente
    const negocioResult = await db.execute({
      sql: `SELECT id, nombre, descripcion, puestoBuscado, direccion, telefono, whatsapp, requisitos,
            modoBot, iaProvider, iaApiKey, iaModelo, iaTemperature, conocimientoBase
            FROM Negocio WHERE slug = ?`,
      args: [slug]
    });

    if (negocioResult.rows.length === 0) {
      console.log('[CHAT] Negocio no encontrado:', slug);
      return NextResponse.json(
        { error: 'Negocio no encontrado' },
        { status: 404 }
      );
    }

    const row = negocioResult.rows[0];
    const negocio = {
      nombre: row.nombre as string,
      descripcion: row.descripcion as string | null,
      puestoBuscado: row.puestoBuscado as string | null,
      direccion: row.direccion as string | null,
      telefono: row.telefono as string | null,
      whatsapp: row.whatsapp as string | null,
      requisitos: row.requisitos as string | null,
      modoBot: row.modoBot as string | null,
      iaProvider: row.iaProvider as string | null,
      iaApiKey: row.iaApiKey as string | null,
      iaModelo: row.iaModelo as string | null,
      iaTemperature: row.iaTemperature as number | null,
      conocimientoBase: row.conocimientoBase as string | null,
    };

    console.log('[CHAT] Negocio encontrado:', negocio.nombre, '| Provider:', negocio.iaProvider, '| Conocimiento:', negocio.conocimientoBase?.length || 0, 'chars');

    // Construir el prompt del sistema
    const systemPrompt = buildSystemPrompt(negocio);

    // Construir mensajes para el LLM
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    // Agregar historial (últimos 10 mensajes)
    const recentHistory = history.slice(-10);
    for (const msg of recentHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }

    // Agregar mensaje actual
    messages.push({ role: 'user', content: message });

    const temperature = negocio.iaTemperature || 0.7;
    const provider = negocio.iaProvider || 'z-ai';
    const apiKey = negocio.iaApiKey || '';
    const model = negocio.iaModelo || '';

    console.log('[CHAT] Usando provider:', provider);

    let response: string | undefined;

    // Seleccionar proveedor
    switch (provider) {
      case 'openai':
        if (!apiKey) throw new Error('API Key de OpenAI no configurada');
        response = await callOpenAI(apiKey, model, messages, temperature);
        break;

      case 'anthropic':
        if (!apiKey) throw new Error('API Key de Anthropic no configurada');
        response = await callAnthropic(apiKey, model, messages, temperature);
        break;

      case 'gemini':
        if (!apiKey) throw new Error('API Key de Gemini no configurada');
        response = await callGemini(apiKey, model, messages, temperature);
        break;

      case 'deepseek':
        if (!apiKey) throw new Error('API Key de DeepSeek no configurada');
        response = await callDeepSeek(apiKey, model, messages, temperature);
        break;

      case 'z-ai':
      default:
        // Usar Z-AI (proveedor por defecto)
        console.log('[CHAT] Inicializando Z-AI...');
        const zai = await getZAI();
        
        // Z-AI usa 'assistant' para system prompt
        const zaiMessages: Array<{ role: 'assistant' | 'user'; content: string }> = [
          { role: 'assistant', content: systemPrompt }
        ];
        
        for (const msg of recentHistory) {
          if (msg.role === 'user' || msg.role === 'assistant') {
            zaiMessages.push({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            });
          }
        }
        zaiMessages.push({ role: 'user', content: message });

        console.log('[CHAT] Enviando a Z-AI, mensajes:', zaiMessages.length);
        const completion = await zai.chat.completions.create({
          messages: zaiMessages,
          thinking: { type: 'disabled' }
        });
        response = completion.choices[0]?.message?.content;
        console.log('[CHAT] Respuesta Z-AI recibida:', response?.substring(0, 100));
        break;
    }

    if (!response) {
      console.log('[CHAT] No se generó respuesta');
      return NextResponse.json(
        { error: 'No se pudo generar una respuesta' },
        { status: 500 }
      );
    }

    console.log('[CHAT] Respuesta exitosa');
    return NextResponse.json({ response });

  } catch (error) {
    console.error('[CHAT] Error:', error);
    
    // Respuesta de fallback amigable
    return NextResponse.json({
      response: 'Lo siento, estoy teniendo problemas técnicos en este momento. Por favor intenta de nuevo más tarde o contacta directamente al negocio.'
    });
  }
}
