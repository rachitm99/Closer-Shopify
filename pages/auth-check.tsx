import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AuthCheck() {
  const router = useRouter();

  useEffect(() => {
    const checkAndRedirect = async () => {
      const { shop, host } = router.query;

      if (!shop) {
        return;
      }

      try {
        // Try to fetch settings to check if authenticated
        const response = await fetch(`/api/settings?shop=${shop}`);
        
        if (response.ok) {
          // Already authenticated, redirect to app
          const redirectUrl = `/?shop=${shop}${host ? `&host=${host}` : ''}`;
          window.location.href = redirectUrl;
        } else if (response.status === 401) {
          // Not authenticated, start OAuth flow (outside iframe)
          window.top!.location.href = `/api/auth?shop=${shop}`;
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // On error, try auth flow
        window.top!.location.href = `/api/auth?shop=${shop}`;
      }
    };

    checkAndRedirect();
  }, [router.query]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div>Checking authentication...</div>
      <div style={{ 
        width: '40px', 
        height: '40px', 
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #5C6AC4',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}></div>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
