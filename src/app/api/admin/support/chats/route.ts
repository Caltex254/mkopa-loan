import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

/**
 * GET /api/admin/support/chats?status=open|closed|all
 *   Lists all support chats across all users.
 *   Includes user info, last message preview, and unread count
 *   (messages from the user that admin hasn't read yet).
 */
export async function GET(request: NextRequest) {
  try {
    const token = await getUserFromRequest();
    if (!token || token.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || 'all';

    const where = statusFilter === 'all' ? {} : { status: statusFilter };

    const chats = await db.supportChat.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // last message preview
        },
      },
    });

    // For each chat, count user-sent unread messages (= messages admin needs to read)
    const formatted = await Promise.all(
      chats.map(async (c) => {
        const userUnreadCount = await db.supportMessage.count({
          where: {
            chatId: c.id,
            senderId: c.userId, // user-sent messages
            isRead: false,
          },
        });
        return {
          id: c.id,
          subject: c.subject,
          status: c.status,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          user: c.user,
          lastMessage: c.messages[0]?.content?.slice(0, 140) || null,
          lastMessageAt: c.messages[0]?.createdAt || c.createdAt,
          unreadCount: userUnreadCount,
        };
      })
    );

    return NextResponse.json({ chats: formatted });
  } catch (error) {
    console.error('Admin support chats list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support chats' },
      { status: 500 }
    );
  }
}
