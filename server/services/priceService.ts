/**
 * Price Service - Backend
 * Handles price aggregation, tracking, and prediction
 */

import { priceAlertsRepo } from "../repositories";

interface PriceData {
  itemId: string;
  platform: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  timestamp: Date;
}

interface PriceAlert {
  id: string;
  itemId: string;
  itemName: string;
  platform: string;
  currentPrice: number;
  targetPrice: number;
  domain: string;
  userId: string;
  createdAt: string;
  isActive: boolean;
}

class PriceService {
  private priceCache: Map<string, PriceData[]> = new Map();

  /**
   * Aggregate prices from multiple platforms
   */
  async aggregatePrices(itemId: string): Promise<PriceData[]> {
    try {
      // This would call actual platform APIs
      // For now, returning mock data
      const prices: PriceData[] = [
        {
          itemId,
          platform: 'Amazon',
          price: 64999,
          originalPrice: 89999,
          discount: 28,
          timestamp: new Date(),
        },
        {
          itemId,
          platform: 'Flipkart',
          price: 62999,
          originalPrice: 89999,
          discount: 30,
          timestamp: new Date(),
        },
        {
          itemId,
          platform: 'Croma',
          price: 65999,
          originalPrice: 89999,
          discount: 27,
          timestamp: new Date(),
        },
      ];

      // Cache the prices
      this.priceCache.set(itemId, prices);
      return prices;
    } catch (error) {
      console.error('Price aggregation failed:', error);
      throw error;
    }
  }

  /**
   * Get best price across platforms
   */
  async getBestPrice(itemId: string): Promise<PriceData | null> {
    try {
      let prices = this.priceCache.get(itemId);

      if (!prices) {
        prices = await this.aggregatePrices(itemId);
      }

      return prices.length > 0
        ? prices.reduce((best, current) =>
            current.price < best.price ? current : best
          )
        : null;
    } catch (error) {
      console.error('Failed to get best price:', error);
      throw error;
    }
  }

  /**
   * Predict price drops using ML model
   */
  async predictPriceDrop(
    itemId: string,
    platform: string,
    daysAhead: number = 7
  ): Promise<{
    predictedPrice: number;
    confidence: number;
    recommendation: string;
  }> {
    try {
      // This would integrate with ML model
      // For now, returning mock prediction
      const prediction = {
        predictedPrice: 59999,
        confidence: 0.85,
        recommendation: 'Wait 3-5 days for potential price drop',
      };

      return prediction;
    } catch (error) {
      console.error('Price prediction failed:', error);
      throw error;
    }
  }

  /**
   * Create price alert
   */
  async createPriceAlert(alert: Omit<PriceAlert, 'id' | 'createdAt'>): Promise<PriceAlert> {
    try {
      return await priceAlertsRepo.create(alert);
    } catch (error) {
      console.error('Failed to create price alert:', error);
      throw error;
    }
  }

  async listActiveAlerts(userId: string): Promise<PriceAlert[]> {
    return priceAlertsRepo.listActive(userId);
  }

  async deactivateAlert(alertId: string, userId: string) {
    return priceAlertsRepo.deactivate(alertId, userId);
  }

  /**
   * Check and trigger price alerts
   */
  async checkPriceAlerts(): Promise<Array<{ alert: PriceAlert; newPrice: number }>> {
    try {
      const triggeredAlerts: Array<{ alert: PriceAlert; newPrice: number }> = [];
      const allActive = await priceAlertsRepo.listAllActive(200);

      for (const alert of allActive) {
        const bestPrice = await this.getBestPrice(alert.itemId);
        if (bestPrice && bestPrice.price <= alert.targetPrice) {
          triggeredAlerts.push({ alert, newPrice: bestPrice.price });
          await priceAlertsRepo.deactivate(alert.id, alert.userId);
        }
      }

      return triggeredAlerts;
    } catch (error) {
      console.error('Failed to check price alerts:', error);
      throw error;
    }
  }

  /**
   * Get price history
   */
  async getPriceHistory(
    itemId: string,
    platform: string,
    days: number = 30
  ): Promise<Array<{ date: Date; price: number }>> {
    try {
      // This would query from database
      // For now, returning mock data
      const history = [];
      const now = new Date();

      for (let i = days; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        history.push({
          date,
          price: 64999 + Math.random() * 5000,
        });
      }

      return history;
    } catch (error) {
      console.error('Failed to fetch price history:', error);
      throw error;
    }
  }
}

export const priceService = new PriceService();
