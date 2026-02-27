import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET - List all Q&A
export async function GET() {
  const qaList = await db.qA.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(qaList);
}

// POST - Create new Q&A
export async function POST(request: NextRequest) {
  const { keywords, response } = await request.json();
  
  const qa = await db.qA.create({
    data: { keywords, response }
  });

  return NextResponse.json(qa);
}

// PUT - Update Q&A
export async function PUT(request: NextRequest) {
  const { id, keywords, response } = await request.json();
  
  const qa = await db.qA.update({
    where: { id },
    data: { keywords, response }
  });

  return NextResponse.json(qa);
}

// DELETE - Remove Q&A
export async function DELETE(request: NextRequest) {
  const { id } = await request.json();
  
  await db.qA.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
