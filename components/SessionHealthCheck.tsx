import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthenticatedFetch } from '../lib/use-auth-fetch';

/**
 * Hook that checks session health on mount
 * Automatically redirects to OAuth if session is invalid
 */
export function useSessionHealthCheck() {
  const router = useRouter();
  const authFetch = useAuthenticatedFetch();

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;
    
    let isMounted = true;

    const checkSession = async () => {
      try {
        // Dynamically import App Bridge to avoid SSR issues
        const { useAppBridge } = await import('@shopify/app-bridge-react');
        const { Redirect } = await import('@shopify/app-bridge/actions');
        
        console.log('🔍 SessionHealthCheck - Starting...');
        const fixSessionResponse = await authFetch('/api/auth/fix-session');
        
        if (!isMounted) return;
        
        if (fixSessionResponse.ok) {
          const fixResult = await fixSessionResponse.json();
          
          if (fixResult.needsReauth) {
            // Session is invalid - redirect to OAuth
            console.log('🔄 SessionHealthCheck - Need to re-authenticate');
            console.log('🔄 SessionHealthCheck - Auth URL (relative):', fixResult.authUrl);
            
            const fullAuthUrl = `${window.location.origin}${fixResult.authUrl}`;
            console.log('🔄 SessionHealthCheck - Auth URL (full):', fullAuthUrl);
            
            try {
              // Try to get app instance if available
              const appElement = document.querySelector('[data-shopify-app-bridge]');
              if (appElement && (window as any).shopify) {
                console.log('✅ SessionHealthCheck - Using App Bridge redirect');
                const redirect = Redirect.create((window as any).shopify);
                redirect.dispatch(Redirect.Action.REMOTE, fullAuthUrl);
              } else {
                // Fallback to direct redirect
                console.log('⚠️ SessionHealthCheck - App Bridge not available, using direct redirect');
                window.top!.location.href = fullAuthUrl;
              }
            } catch (redirectError) {
              console.error('❌ SessionHealthCheck - Redirect failed:', redirectError);
              window.top!.location.href = fullAuthUrl;
            }
            return; // Stop further execution
          }
          
          if (fixResult.success) {
            console.log('✅ SessionHealthCheck - Session is healthy:', fixResult);
          }
        } else {
          console.log('⚠️ SessionHealthCheck - Fix-session endpoint returned error');
        }
      } catch (error) {
        console.log('⚠️ SessionHealthCheck - Check failed (non-critical):', error);
      }
    };

    // Run check after component mounts
    checkSession();
    
    return () => {
      isMounted = false;
    };
  }, [router.query.shop, authFetch]);
}
