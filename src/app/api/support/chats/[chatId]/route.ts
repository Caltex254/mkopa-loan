import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/support/chats/[chatId]
 *   Returns the chat with ALL messages, oldest first.
 *   Also marks all admin-sent messages as read (since the user is viewing them).
 *
 * POST /api/support/chats/[chatId]
 *   Body: { message: string }
 *   Appends a new user-sent message to the chat. Reopens the chat if it was closed.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const token = await getUserFromRequest();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;

    const chat = await db.supportChat.findUnique({
      where: { id: chatId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Security: user can only read their own chats
    if (chat.userId !== token.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Mark all admin-sent messages as read (user is now viewing the thread)
    await db.supportMessage.updateMany({
      where: {
        chatId,
        senderId: { not: token.userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Support chat fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const token = await getUserFromRequest();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { message } = body;

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

    const chat = await db.supportChat.findUnique({ where: { id: chatId } });
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    if (chat.userId !== token.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Append the user's message; auto-reopen if admin had closed it
    const [newMessage] = await db.$transaction([
      db.supportMessage.create({
        data: {
          chatId,
          senderId: token.userId,
          content: message.trim(),
        },
      }),
      db.supportChat.update({
        where: { id: chatId },
        data: {
          status: 'open',
          updatedAt: new Date(),
        },
      }),
    ]);

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('Support message send error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
