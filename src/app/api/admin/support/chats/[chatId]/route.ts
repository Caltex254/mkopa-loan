import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/admin/support/chats/[chatId]
 *   Returns the chat with ALL messages, oldest first.
 *   Marks all user-sent messages as read (since admin is now viewing them).
 *
 * POST /api/admin/support/chats/[chatId]
 *   Body: { message: string }
 *   Admin replies to the user. The message is stored with senderId = admin's userId.
 *
 * PATCH /api/admin/support/chats/[chatId]
 *   Body: { status: 'open' | 'closed' }
 *   Admin closes or reopens the chat.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const token = await getUserFromRequest();
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { chatId } = await params;

    const chat = await db.supportChat.findUnique({
      where: { id: chatId },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    // Mark all user-sent messages as read (admin is now viewing)
    await db.supportMessage.updateMany({
      where: {
        chatId,
        senderId: chat.userId, // user-sent messages
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ chat });
  } catch (error) {
    console.error('Admin support chat fetch error:', error);
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
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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

    // Append admin's reply (senderId is admin's userId)
    const [newMessage] = await db.$transaction([
      db.supportMessage.create({
        data: {
          chatId,
          senderId: token.userId,
          content: message.trim(),
          isRead: true, // admin's own message — automatically "read" by admin
        },
      }),
      db.supportChat.update({
        where: { id: chatId },
        data: {
          updatedAt: new Date(),
          // Reopen if it was closed (admin's reply indicates active engagement)
          status: chat.status === 'closed' ? 'open' : chat.status,
        },
      }),
    ]);

    // Also create a notification so the user gets an in-app alert
    // (uses the EXISTING Notification model — does NOT touch the
    //  admin→user notification setup, just leverages it).
    await db.notification.create({
      data: {
        userId: chat.userId,
        title: 'Support Reply',
        message: `Admin replied to your support chat "${chat.subject}": ${message.trim().slice(0, 120)}${message.length > 120 ? '…' : ''}`,
      },
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('Admin support reply error:', error);
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> }
) {
  try {
    const token = await getUserFromRequest();
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { chatId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!['open', 'closed'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "open" or "closed"' },
        { status: 400 }
      );
    }

    const chat = await db.supportChat.findUnique({ where: { id: chatId } });
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
    }

    const updated = await db.supportChat.update({
      where: { id: chatId },
      data: { status },
    });

    // Notify the user that their chat was closed/reopened
    if (status === 'closed') {
      await db.notification.create({
        data: {
          userId: chat.userId,
          title: 'Support Chat Closed',
          message: `Your support chat "${chat.subject}" has been marked as resolved. You can still reply to reopen it if needed.`,
        },
      });
    }

    return NextResponse.json({ chat: updated });
  } catch (error) {
    console.error('Admin support chat status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update chat status' },
      { status: 500 }
    );
  }
}
