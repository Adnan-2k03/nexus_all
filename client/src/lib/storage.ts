/**
 * Unified storage API for auth tokens that works on both web and native platforms.
 * Uses an in-memory cache with localStorage fallback for reliability.
 */

// In-memory cache
let cachedToken: string | null = null;
let isInitialized = false;

const STORAGE_KEY = 'auth_token';

/**
 * Initialize the cache from localStorage
 */
async function initializeCache(): Promise<void> {
  if (isInitialized) return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      cachedToken = stored;
      console.log('💾 [AuthStorage] Initialized cache from localStorage');
    }
  } catch (error) {
    console.error('⚠️ [AuthStorage] Failed to read localStorage during init:', error);
  }
  
  isInitialized = true;
}

export const AuthStorage = {
  async setToken(token: string): Promise<void> {
    console.log('💾 [AuthStorage] Setting token (length:', token.length, ')');
    
    // Always init cache first
    await initializeCache();
    
    // Update in-memory cache immediately
    cachedToken = token;
    console.log('✅ [AuthStorage] Token cached in memory');
    
    // Try to persist to localStorage
    try {
      localStorage.setItem(STORAGE_KEY, token);
      console.log('✅ [AuthStorage] Token persisted to localStorage');
    } catch (error) {
      console.error('⚠️ [AuthStorage] Failed to persist token to localStorage:', error);
      // Cache is still set in memory, so subsequent requests will work
    }
    
    // Force a sync by reading it back
    try {
      const verification = localStorage.getItem(STORAGE_KEY);
      if (verification === token) {
        console.log('✅ [AuthStorage] Verification: Token persisted successfully');
      } else {
        console.warn('⚠️ [AuthStorage] Verification failed: Token not found in localStorage');
      }
    } catch (e) {
      console.log('⚠️ [AuthStorage] Could not verify localStorage persistence');
    }
  },

  async getToken(): Promise<string | null> {
    // Initialize cache if needed
    await initializeCache();
    
    // Return from cache first for speed
    if (cachedToken) {
      console.log('✅ [AuthStorage] Token retrieved from memory cache (length:', cachedToken.length, ')');
      return cachedToken;
    }
    
    // Try to read from localStorage as fallback
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        cachedToken = stored;
        console.log('✅ [AuthStorage] Token retrieved from localStorage (length:', stored.length, ')');
        return stored;
      }
    } catch (error) {
      console.error('❌ [AuthStorage] Failed to read from localStorage:', error);
    }
    
    console.log('⚠️ [AuthStorage] No token found in storage');
    return null;
  },

  async removeToken(): Promise<void> {
    console.log('🗑️ [AuthStorage] Removing token...');
    
    // Clear memory cache
    cachedToken = null;
    
    // Clear localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('✅ [AuthStorage] Token removed from storage');
    } catch (error) {
      console.error('❌ [AuthStorage] Failed to remove from localStorage:', error);
    }
  },

  // Debug helper
  async debugState(): Promise<void> {
    await initializeCache();
    console.log('🔍 [AuthStorage Debug]');
    console.log('   Memory cache:', cachedToken ? `${cachedToken.substring(0, 20)}...` : 'empty');
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      console.log('   LocalStorage:', stored ? `${stored.substring(0, 20)}...` : 'empty');
    } catch (e) {
      console.log('   LocalStorage: (error reading)');
    }
  },
};
