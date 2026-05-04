import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { env } from '../env.js';
import { logger } from './logger.js';

const expo = new Expo({ accessToken: env.EXPO_ACCESS_TOKEN });

export interface CareTaskPushPayload {
  taskId: string;
  patientId: string;
  patientName: string;
  taskType: string;
  [key: string]: unknown;
}

export async function sendCareTaskPushes(
  tokens: string[],
  payload: CareTaskPushPayload,
): Promise<void> {
  const valid = tokens.filter((t) => Expo.isExpoPushToken(t));
  if (valid.length === 0) return;

  const messages: ExpoPushMessage[] = valid.map((to) => ({
    to,
    sound: 'default',
    title: `Cuidado pendiente: ${payload.patientName}`,
    body: `Tarea de tipo ${payload.taskType} programada`,
    data: payload,
    priority: 'high',
  }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      logger.error({ err }, 'expo push send failed');
    }
  }
}
