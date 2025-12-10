import { v4 as uuidv4 } from 'uuid';
import { getFirestore, Collections } from '../config/firestore';
import logger from '../config/logger';
import { AnalyticsEvent, AnalyticsEventType } from '../models/analytics.model';

export class AnalyticsService {
    private db = getFirestore();

    /**
     * Track an analytics event
     */
    async trackEvent(
        userId: string,
        eventType: AnalyticsEventType,
        metadata: Record<string, any> = {},
        userTier?: string,
        userRole?: string
    ): Promise<void> {
        try {
            const eventId = uuidv4();
            const event: AnalyticsEvent = {
                id: eventId,
                userId,
                eventType,
                metadata,
                userTier: userTier || 'unknown',
                userRole: userRole || 'unknown',
                timestamp: new Date(),
            };

            await this.db.collection(Collections.ANALYTICS).doc(eventId).set(event);

            logger.info(`Analytics event tracked: ${eventType} for user ${userId}`);
        } catch (error) {
            logger.error('Track event error:', error);
            // Don't throw - analytics failures shouldn't break the app
        }
    }

    /**
     * Get user analytics
     */
    async getUserAnalytics(userId: string, limit: number = 100): Promise<AnalyticsEvent[]> {
        try {
            const snapshot = await this.db
                .collection(Collections.ANALYTICS)
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => doc.data() as AnalyticsEvent);
        } catch (error) {
            logger.error('Get user analytics error:', error);
            throw error;
        }
    }

    /**
     * Get analytics summary for admin dashboard
     */
    async getAnalyticsSummary(startDate: Date, endDate: Date): Promise<any> {
        try {
            const snapshot = await this.db
                .collection(Collections.ANALYTICS)
                .where('timestamp', '>=', startDate)
                .where('timestamp', '<=', endDate)
                .get();

            const events = snapshot.docs.map(doc => doc.data() as AnalyticsEvent);

            // Aggregate data
            const summary = {
                totalEvents: events.length,
                uniqueUsers: new Set(events.map(e => e.userId)).size,
                eventsByType: {} as Record<string, number>,
                eventsByTier: {} as Record<string, number>,
                aiInteractions: 0,
                videoViews: 0,
                quizAttempts: 0,
            };

            events.forEach(event => {
                // Count by type
                summary.eventsByType[event.eventType] = (summary.eventsByType[event.eventType] || 0) + 1;

                // Count by tier
                summary.eventsByTier[event.userTier] = (summary.eventsByTier[event.userTier] || 0) + 1;

                // Specific metrics
                if (event.eventType.startsWith('AI_')) {
                    summary.aiInteractions++;
                }
                if (event.eventType === AnalyticsEventType.VIDEO_VIEW) {
                    summary.videoViews++;
                }
                if (event.eventType === AnalyticsEventType.QUIZ_COMPLETE) {
                    summary.quizAttempts++;
                }
            });

            return summary;
        } catch (error) {
            logger.error('Get analytics summary error:', error);
            throw error;
        }
    }

    /**
     * Get revenue analytics
     */
    async getRevenueAnalytics(startDate: Date, endDate: Date): Promise<any> {
        try {
            const snapshot = await this.db
                .collection(Collections.PAYMENTS)
                .where('createdAt', '>=', startDate)
                .where('createdAt', '<=', endDate)
                .where('status', '==', 'success')
                .get();

            const payments = snapshot.docs.map(doc => doc.data());

            const revenue = {
                totalRevenue: 0,
                revenueByProvider: {} as Record<string, number>,
                transactionCount: payments.length,
            };

            payments.forEach((payment: any) => {
                revenue.totalRevenue += payment.amount;
                revenue.revenueByProvider[payment.provider] =
                    (revenue.revenueByProvider[payment.provider] || 0) + payment.amount;
            });

            return revenue;
        } catch (error) {
            logger.error('Get revenue analytics error:', error);
            throw error;
        }
    }
}

export default new AnalyticsService();
