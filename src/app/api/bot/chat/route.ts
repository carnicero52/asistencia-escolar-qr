import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const { message } = await request.json();
  
  if (!message) {
    return NextResponse.json({ response: 'No entendí tu mensaje.' });
  }

  // Normalize message
  const normalizedMsg = message.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Get all Q&A
  const qaList = await db.qA.findMany();

  // Find matching response
  for (const qa of qaList) {
    const keywords = qa.keywords.split(',').map(k => k.trim().toLowerCase());
    for (const keyword of keywords) {
      const normalizedKeyword = keyword.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (normalizedMsg.includes(normalizedKeyword)) {
        return NextResponse.json({ response: qa.response });
      }
    }
  }

  // Default response
  return NextResponse.json({ 
    response: 'Lo siento, no entendí tu pregunta. ¿Podrías reformularla?' 
  });
}
