import { useEffect } from 'react';

interface AdUnitProps {
  slotId: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  className?: string;
}

export function AdUnit({ slotId, format = 'auto', className = '' }: AdUnitProps) {
  useEffect(() => {
    // Push the ad to Google AdSense
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, [slotId]);

  return (
    <div className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-4278995521540923"
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}
