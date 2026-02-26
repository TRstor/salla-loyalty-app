const axios = require('axios');
const config = require('../config');

class SallaService {
  constructor(accessToken) {
    this.client = axios.create({
      baseURL: config.salla.baseUrl,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  // === OAuth ===
  
  static getAuthUrl(state) {
    const params = new URLSearchParams({
      client_id: config.salla.clientId,
      redirect_uri: config.salla.redirectUri,
      response_type: 'code',
      scope: 'offline_access',
      state: state || '',
    });
    return `${config.salla.authUrl}?${params.toString()}`;
  }

  static async exchangeCode(code) {
    const response = await axios.post(config.salla.tokenUrl, {
      client_id: config.salla.clientId,
      client_secret: config.salla.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.salla.redirectUri,
    });
    return response.data;
  }

  static async refreshAccessToken(refreshToken) {
    const response = await axios.post(config.salla.tokenUrl, {
      client_id: config.salla.clientId,
      client_secret: config.salla.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });
    return response.data;
  }

  // === Store Info ===
  
  async getStoreInfo() {
    const response = await this.client.get('/store/info');
    return response.data.data;
  }

  // === Customers ===
  
  async getCustomer(customerId) {
    const response = await this.client.get(`/customers/${customerId}`);
    return response.data.data;
  }

  async getCustomers(page = 1) {
    const response = await this.client.get(`/customers?page=${page}`);
    return response.data;
  }

  // === Orders ===
  
  async getOrder(orderId) {
    const response = await this.client.get(`/orders/${orderId}`);
    return response.data.data;
  }

  // === Coupons ===
  
  async createCoupon(couponData) {
    const response = await this.client.post('/coupons', {
      code: couponData.code,
      type: couponData.discountType === 'percentage' ? 'percentage' : 'fixed',
      amount: couponData.discountAmount,
      start_date: new Date().toISOString().split('T')[0],
      expiry_date: couponData.expiresAt,
      maximum_usage: 1,
      exclude_sale_products: false,
      free_shipping: false,
    });
    return response.data.data;
  }

  async deleteCoupon(couponId) {
    const response = await this.client.delete(`/coupons/${couponId}`);
    return response.data;
  }
}

module.exports = SallaService;
