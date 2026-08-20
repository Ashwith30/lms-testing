import { useState, useEffect } from 'react';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

interface DeviceDetectionResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  deviceType: DeviceType;
}

const getDeviceType = (): DeviceType => {
  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;
  const hasTouchPoints = navigator.maxTouchPoints > 0;

  // Check user agent for mobile/tablet indicators
  const isMobileUA = /iphone|ipod|android.*mobile|windows phone|blackberry/i.test(ua);
  const isTabletUA = /ipad|android(?!.*mobile)|tablet|kindle|silk/i.test(ua);

  // iPad with desktop-class UA detection (iPadOS 13+)
  const isIPadOS = /macintosh/i.test(ua) && hasTouchPoints;

  if (isMobileUA || (hasTouchPoints && width < 640)) {
    return 'mobile';
  }

  if (isTabletUA || isIPadOS || (hasTouchPoints && width >= 640 && width < 1024)) {
    return 'tablet';
  }

  return 'desktop';
};

export const useDeviceDetection = (): DeviceDetectionResult => {
  const [deviceType, setDeviceType] = useState<DeviceType>(getDeviceType);

  useEffect(() => {
    const handleResize = () => {
      setDeviceType(getDeviceType());
    };

    window.addEventListener('resize', handleResize);
    // Also listen for orientation changes on mobile
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    isMobile: deviceType === 'mobile',
    isTablet: deviceType === 'tablet',
    isDesktop: deviceType === 'desktop',
    isTouchDevice: deviceType !== 'desktop',
    deviceType
  };
};
