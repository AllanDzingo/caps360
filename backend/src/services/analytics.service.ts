import { v4 as uuidv4 } from 'uuid';
import { supabase, Tables } from '../config/supabase';
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

            const dbEvent = {
                id: event.id,
                user_id: event.userId,
                event_type: event.eventType,
                metadata: event.metadata, // JSONB
                user_tier: event.userTier,
                user_role: event.userRole,
                timestamp: event.timestamp.toISOString(),
            };

            const { error } = await supabase
                .from(Tables.ANALYTICS)
                .insert(dbEvent);

            if (error) {
                logger.warn('Supabase analytics track error:', error.message);
                return;
            }

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
            const { data, error } = await supabase
                .from(Tables.ANALYTICS)
                .select('*')
                .eq('user_id', userId)
                .order('timestamp', { ascending: false })
                .limit(limit);

            if (error) throw new Error(error.message);

            return data.map(this.mapDbEventToModel);
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
            const { data, error } = await supabase
                .from(Tables.ANALYTICS)
                .select('*')
                .gte('timestamp', startDate.toISOString())
                .lte('timestamp', endDate.toISOString());

            if (error) throw new Error(error.message);

            const events = data.map(this.mapDbEventToModel);

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
            const { data, error } = await supabase
                .from(Tables.PAYMENTS)
                .select('*')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())
                .eq('status', 'success');

            if (error) throw new Error(error.message);

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
