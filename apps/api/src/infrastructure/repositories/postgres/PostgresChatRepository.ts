import { Chat, ChatMessage } from '@oomfy/shared';
import { PostgresPool } from '../../database/postgres/PostgresPool.js';

export class PostgresChatRepository {
  public static async findPrivateChat(userA: string, userB: string): Promise<string | null> {
    const pool = PostgresPool.getInstance();
    const q = `
      SELECT p1.chat_id
      FROM participant p1
      JOIN participant p2 ON p1.chat_id = p2.chat_id
      JOIN chat c ON c.id = p1.chat_id
      WHERE c.type = 'private' AND p1.user_id = $1 AND p2.user_id = $2
      LIMIT 1;
    `;
    const { rows } = await pool.query(q, [userA, userB]);
    return rows[0]?.chat_id || null;
  }

  public static async createPrivateChat(chatId: string, userA: string, userB: string): Promise<Chat> {
    const pool = PostgresPool.getInstance();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO chat (id, type, created_at) VALUES ($1, 'private', NOW())`, [chatId]);
      await client.query(`INSERT INTO participant (id, chat_id, user_id, role, joined_at) VALUES (gen_random_uuid(), $1, $2, 'member', NOW())`, [chatId, userA]);
      await client.query(`INSERT INTO participant (id, chat_id, user_id, role, joined_at) VALUES (gen_random_uuid(), $1, $2, 'member', NOW())`, [chatId, userB]);
      await client.query('COMMIT');
      return { id: chatId, type: 'private', created_at: new Date().toISOString(), participants: [] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public static async listUserChats(userId: string): Promise<any[]> {
    const pool = PostgresPool.getInstance();
    const q = `
      SELECT c.id, c.type, c.created_at,
        (SELECT json_agg(json_build_object(
          'id', p.id, 'user_id', p.user_id, 'username', u.username, 'name', u.name, 'icon_url', i.url
        )) FROM participant p
           JOIN oomfy u ON u.id = p.user_id
           LEFT JOIN icon i ON i.id = u.id
           WHERE p.chat_id = c.id) AS participants,
        (SELECT json_build_object('id', m.id, 'content', m.content, 'created_at', m.created_at, 'sender_id', m.sender_id)
         FROM message m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message
      FROM chat c
      JOIN participant part ON part.chat_id = c.id
      WHERE part.user_id = $1
      ORDER BY c.created_at DESC;
    `;
    const { rows } = await pool.query(q, [userId]);
    return rows;
  }

  public static async insertMessage(data: { id: string; chat_id: string; sender_id: string; content: string }): Promise<ChatMessage> {
    const pool = PostgresPool.getInstance();
    const q = `
      INSERT INTO message (id, chat_id, sender_id, content, status, created_at)
      VALUES ($1, $2, $3, $4, 'sent', NOW())
      RETURNING id, chat_id, sender_id, content, status, created_at, updated_at;
    `;
    const { rows } = await pool.query(q, [data.id, data.chat_id, data.sender_id, data.content]);
    return rows[0];
  }

  public static async listChatMessages(chatId: string, limit: number = 30, olderId?: string): Promise<any[]> {
    const pool = PostgresPool.getInstance();
    let beforeTimestamp: Date | null = null;
    if (olderId) {
      const msgRes = await pool.query('SELECT created_at FROM message WHERE id = $1', [olderId]);
      if (msgRes.rows[0]?.created_at) {
        beforeTimestamp = msgRes.rows[0].created_at;
      }
    }

    const q = `
      SELECT * FROM (
        SELECT m.id, m.chat_id, m.sender_id, m.content, m.status, m.created_at,
               json_build_object('id', u.id, 'username', u.username, 'name', u.name, 'icon_url', i.url) as sender
        FROM message m
        JOIN oomfy u ON u.id = m.sender_id
        LEFT JOIN icon i ON i.id = u.id
        WHERE m.chat_id = $1
          AND ($3::timestamptz IS NULL OR m.created_at < $3)
        ORDER BY m.created_at DESC
        LIMIT $2
      ) sub
      ORDER BY sub.created_at ASC;
    `;
    const { rows } = await pool.query(q, [chatId, limit, beforeTimestamp]);
    return rows;
  }

  public static async countUnreadMessages(userId: string): Promise<number> {
    const pool = PostgresPool.getInstance();
    const q = `
      SELECT COUNT(*)::int AS count
      FROM message m
      JOIN participant p ON p.chat_id = m.chat_id
      WHERE p.user_id = $1 AND m.sender_id != $1 AND m.status = 'sent';
    `;
    const { rows } = await pool.query(q, [userId]);
    return rows[0]?.count || 0;
  }

  public static async markChatMessagesAsRead(chatId: string, userId: string): Promise<void> {
    const pool = PostgresPool.getInstance();
    const q = `
      UPDATE message SET status = 'seen', updated_at = NOW()
      WHERE chat_id = $1 AND sender_id != $2 AND status = 'sent';
    `;
    await pool.query(q, [chatId, userId]);
  }

  public static async getChatParticipants(chatId: string): Promise<string[]> {
    const pool = PostgresPool.getInstance();
    const q = `SELECT user_id FROM participant WHERE chat_id = $1;`;
    const { rows } = await pool.query(q, [chatId]);
    return rows.map((r: any) => r.user_id);
  }
}

