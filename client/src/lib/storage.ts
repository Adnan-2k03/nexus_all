/**
 * Unified storage API for auth tokens.
 * Uses multiple fallback strategies for maximum Android reliability:
 * 1. In-memory JavaScript variable
 * 2. Window object property
 * 3. localStorage for page refresh
 */

// In-memory storage - primary source
let cachedToken: string | null = null;
const STORAGE_KEY = 'auth_token';
const WINDOW_KEY = '__NEXUS_AUTH_TOKEN__';

// Ensure window property exists
if (typeof window !== 'undefined') {
  (window as any)[WINDOW_KEY] = null;
}

export const AuthStorage = {
  /**
   * Set token in all available storage layers
   */
  async setToken(token: string): Promise<void> {
    console.log('💾 [AuthStorage] Setting token (length:', token.length, ')');
    
    // Set in memory
    cachedToken = token;
    console.log('✅ [AuthStorage] Token set in memory cache');
    
    // CRITICAL: Also set on window object for global accessibility on Android
    if (typeof window !== 'undefined') {
      (window as any)[WINDOW_KEY] = token;
      console.log('✅ [AuthStorage] Token set on window object');
    }
    
    // Try localStorage for persistence across page reloads
    try {
      localStorage.setItem(STORAGE_KEY, token);
      console.log('✅ [AuthStorage] Token also persisted to localStorage');
    } catch (error) {
      console.log('⚠️ [AuthStorage] localStorage not available:', error);
    }
    
    // Log verification
    const verify = await this.getToken();
    if (verify === token) {
      console.log('✅ [AuthStorage] Verification: Token is retrievable');
    } else {
      console.warn('⚠️ [AuthStorage] Verification failed - token may not be retrievable');
    }
  },

  /**
   * Get token from all available sources
   */
  async getToken(): Promise<string | null> {
    // Try in-memory cache first
    if (cachedToken) {
      console.log('✅ [AuthStorage] Token from memory (len:', cachedToken.length, ')');
      return cachedToken;
    }
    
    // Try window object (most reliable on Android)
    if (typeof window !== 'undefined') {
      const windowToken = (window as any)[WINDOW_KEY];
      if (windowToken) {
        cachedToken = windowToken;
        console.log('✅ [AuthStorage] Token from window object (len:', windowToken.length, ')');
        return windowToken;
      }
    }
    
    // Try localStorage as last resort
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        cachedToken = stored;
        if (typeof window !== 'undefined') {
          (window as any)[WINDOW_KEY] = stored;
        }
        console.log('✅ [AuthStorage] Token from localStorage (len:', stored.length, ')');
        return stored;
      }
    } catch (error) {
      console.log('⚠️ [AuthStorage] localStorage error:', error);
    }
    
    console.log('❌ [AuthStorage] No token found in any storage');
    return null;
  },

  /**
   * Remove token from all sources
   */
  async removeToken(): Promise<void> {
    console.log('🗑️ [AuthStorage] Removing token...');
    
    cachedToken = null;
    
    if (typeof window !== 'undefined') {
      (window as any)[WINDOW_KEY] = null;
    }
    
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.log('⚠️ [AuthStorage] localStorage error during remove:', error);
    }
    
    console.log('✅ [AuthStorage] Token cleared from all storage');
  },

  /**
   * Debug helper
   */
  async debugState(): Promise<void> {
    console.log('🔍 [AuthStorage Debug State]');
    console.log('   Memory cache:', cachedToken ? `${cachedToken.substring(0, 20)}...` : 'null');
    
    if (typeof window !== 'undefined') {
      const windowToken = (window as any)[WINDOW_KEY];
      console.log('   Window object:', windowToken ? `${windowToken.substring(0, 20)}...` : 'null');
    }
    
    try {
      const localStorageToken = localStorage.getItem(STORAGE_KEY);
      console.log('   LocalStorage:', localStorageToken ? `${localStorageToken.substring(0, 20)}...` : 'null');
    } catch (error) {
      console.log('   LocalStorage: (error)');
    }
  },
};
