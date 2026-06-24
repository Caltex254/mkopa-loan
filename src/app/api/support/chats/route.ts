import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/support/chats
 *   Returns all of the authenticated user's support chats (newest first).
 *   Each chat includes the last message preview + unread count (messages
 *   from admin that the user hasn't read yet).
 *
 * POST /api/support/chats
 *   Body: { subject?: string, message: string }
 *   Creates a new support chat with an initial user message.
 *   (We allow multiple chats per user — e.g. one per issue — rather than
 *    forcing all conversations into a single thread.)
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getUserFromRequest();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const chats = await db.supportChat.findMany({
      where: { userId: token.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // just the latest message for preview
        },
        _count: {
          select: {
            messages: {
              where: {
                // Unread = sent by admin AND not yet read by the user
                AND: [
                  { senderId: { not: token.userId } },
                  { isRead: false },
                ],
              },
            },
          },
        },
      },
    });

    const formatted = chats.map((c) => ({
      id: c.id,
      subject: c.subject,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      lastMessage: c.messages[0]?.content?.slice(0, 140) || null,
      lastMessageAt: c.messages[0]?.createdAt || c.createdAt,
      unreadCount: c._count.messages,
    }));

    return NextResponse.json({ chats: formatted });
  } catch (error) {
    console.error('Support chats list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support chats' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = await getUserFromRequest();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (message.length > 5000) {
      return NextResponse.json(
        { error: 'Message is too long (max 5000 characters)' },
        { status: 400 }
      );
    }

    const finalSubject =
      typeof subject === 'string' && subject.trim().length > 0
        ? subject.trim().slice(0, 120)
        : 'General Support';

    // Create the chat + initial user message in a transaction
    const chat = await db.supportChat.create({
      data: {
        userId: token.userId,
        subject: finalSubject,
        status: 'open',
        messages: {
          create: {
            senderId: token.userId,
            content: message.trim(),
          },
        },
      },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    return NextResponse.json({ chat }, { status: 201 });
  } catch (error) {
    console.error('Support chat create error:', error);
    return NextResponse.json(
      { error: 'Failed to create support chat' },
      { status: 500 }
    );
  }
}
