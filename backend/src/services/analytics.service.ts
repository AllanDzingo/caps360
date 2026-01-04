import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import logger from '../config/logger';
import { AnalyticsEvent, AnalyticsEventType } from '../models/analytics.model';

export class AnalyticsService {
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



            const sql = `
                INSERT INTO analytics (
                    id, user_id, event_type, metadata, user_tier, user_role, timestamp
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            `;
            const values = [
                event.id, event.userId, event.eventType, event.metadata,
                event.userTier, event.userRole, event.timestamp.toISOString()
            ];

            await query(sql, values);

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
            const sql = 'SELECT * FROM analytics WHERE user_id = $1 ORDER BY timestamp DESC LIMIT $2';
            const { rows } = await query(sql, [userId, limit]);
            return rows.map(this.mapDbEventToModel);
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
            const sql = 'SELECT * FROM analytics WHERE timestamp >= $1 AND timestamp <= $2';
            const { rows } = await query(sql, [startDate.toISOString(), endDate.toISOString()]);
            const events = rows.map(this.mapDbEventToModel);

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
            // Query Payments table
            // Query Payments table
            const sql = 'SELECT * FROM payments WHERE created_at >= $1 AND created_at <= $2 AND status = $3';
            const { rows: data } = await query(sql, [startDate.toISOString(), endDate.toISOString(), 'success']);

            const revenue = {
                totalRevenue: 0,
                revenueByProvider: {} as Record<string, number>,
                transactionCount: data.length,
            };

            data.forEach((payment: any) => {
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

    private mapDbEventToModel(dbEvent: any): AnalyticsEvent {
        return {
            id: dbEvent.id,
            userId: dbEvent.user_id,
            eventType: dbEvent.event_type as AnalyticsEventType,
            metadata: dbEvent.metadata,
            userTier: dbEvent.user_tier,
            userRole: dbEvent.user_role,
            timestamp: new Date(dbEvent.timestamp),
        };
    }
}

export default new AnalyticsService();
