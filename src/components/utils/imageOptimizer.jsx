// Image-Optimierung: Lazy Loading, WebP, Responsive Images
import React, { useState, useEffect, useRef } from 'react';

const IMAGE_FORMATS = {
  WEBP: 'webp',
  JPEG: 'jpeg',
  PNG: 'png'
};

class ImageOptimizer {
  static supportsWebP() {
    if (typeof window === 'undefined') return false;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    return canvas.toDataURL('image/webp').includes('webp');
  }

  static convertToWebP(url) {
    if (!url || !this.supportsWebP()) return url;
    
    // Ersetze Dateiendung durch .webp
    return url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
  }

  static getSrcSet(baseUrl, sizes = [640, 1024, 1536]) {
    if (!baseUrl) return '';
    
    return sizes
      .map(size => `${this.getResizedUrl(baseUrl, size)} ${size}w`)
      .join(', ');
  }

  static getResizedUrl(url, width) {
    if (!url) return '';
    
    // Für externe Services (z.B. Cloudinary, Imgix)
    // Anpassung nach Bedarf
    const hasQuery = url.includes('?');
    const separator = hasQuery ? '&' : '?';
    
    return `${url}${separator}w=${width}`;
  }

  static getOptimalSize(containerWidth) {
    // Gibt die optimale Bildgröße basierend auf Container-Breite zurück
    const sizes = [320, 640, 1024, 1536];
    return sizes.find(size => size >= containerWidth) || sizes[sizes.length - 1];
  }
}

export function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZTVlNWU1Ii8+PC9zdmc+',
  className = '',
  sizes = '(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1536px',
  onLoad = null,
  ...props
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(placeholder);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!src) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Bild ist in Viewport, lade es
          const img = new Image();
          img.onload = () => {
            setImageSrc(src);
            setIsLoaded(true);
            onLoad?.();
          };
          img.onerror = () => {
            setImageSrc(src); // Fallback auf Original
            setIsLoaded(true);
          };
          img.src = src;

          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, onLoad]);

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-50'} ${className}`}
      sizes={sizes}
      {...props}
    />
  );
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  useWebP = true,
  lazy = true,
  ...props
}) {
  const [displaySrc, setDisplaySrc] = useState(
    lazy ? src : (useWebP ? ImageOptimizer.convertToWebP(src) : src)
  );

  useEffect(() => {
    if (!lazy) return;

    const img = new Image();
    const optimalSrc = useWebP ? ImageOptimizer.convertToWebP(src) : src;

    img.onload = () => setDisplaySrc(optimalSrc);
    img.onerror = () => setDisplaySrc(src);
    img.src = optimalSrc;
  }, [src, lazy, useWebP]);

  const srcSet = width ? ImageOptimizer.getSrcSet(src, [width, width * 1.5, width * 2]) : '';

  return (
    <img
      src={displaySrc}
      alt={alt}
      width={width}
      height={height}
      srcSet={srcSet}
      className={className}
      loading={lazy ? 'lazy' : 'eager'}
      {...props}
    />
  );
}

export { ImageOptimizer, IMAGE_FORMATS };