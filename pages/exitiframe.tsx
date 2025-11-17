import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ExitIframe() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { shop, host } = router.query;
      
      if (shop && host) {
        // Construct the embedded app URL
        const redirectUrl = `https://${shop}/admin/apps/${process.env.NEXT_PUBLIC_SHOPIFY_API_KEY}?shop=${shop}&host=${host}`;
        window.top!.location.href = redirectUrl;
      }
    }
  }, [router.query]);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <p>Redirecting to Shopify Admin...</p>
    </div>
  );
}
