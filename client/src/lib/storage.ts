/**
 * Unified storage API for auth tokens that works on both web and native platforms.
 * Uses localStorage primarily, with fallback to sessionStorage if needed.
 */
export const AuthStorage = {
  async setToken(token: string): Promise<void> {
    console.log('💾 [AuthStorage] Setting token...');
    try {
      localStorage.setItem('auth_token', token);
      console.log('✅ [AuthStorage] Token saved to localStorage');
    } catch (error) {
      console.error('❌ [AuthStorage] Failed to save token to localStorage:', error);
      try {
        sessionStorage.setItem('auth_token', token);
        console.log('✅ [AuthStorage] Token saved to sessionStorage (fallback)');
      } catch (e) {
        console.error('❌ [AuthStorage] Failed to save token to sessionStorage:', e);
      }
    }
  },

  async getToken(): Promise<string | null> {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        console.log('✅ [AuthStorage] Token retrieved from localStorage');
        return token;
      }
    } catch (error) {
      console.error('❌ [AuthStorage] Failed to get token from localStorage:', error);
    }
    
    try {
      const token = sessionStorage.getItem('auth_token');
      if (token) {
        console.log('✅ [AuthStorage] Token retrieved from sessionStorage (fallback)');
        return token;
      }
    } catch (e) {
      console.error('❌ [AuthStorage] Failed to get token from sessionStorage:', e);
    }
    
    console.log('⚠️ [AuthStorage] No token found in storage');
    return null;
  },

  async removeToken(): Promise<void> {
    console.log('🗑️ [AuthStorage] Removing token...');
    try {
      localStorage.removeItem('auth_token');
      sessionStorage.removeItem('auth_token');
      console.log('✅ [AuthStorage] Token removed from storage');
    } catch (error) {
      console.error('❌ [AuthStorage] Failed to remove token:', error);
    }
  },
};
