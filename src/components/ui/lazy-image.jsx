import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export default function LazyImage({ 
    src, 
    alt, 
    className,
    placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23334155" width="400" height="300"/%3E%3C/svg%3E'
}) {
    const [imageSrc, setImageSrc] = useState(placeholder);
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef();

    useEffect(() => {
        if (!src) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const img = new Image();
                        img.src = src;
                        img.onload = () => {
                            setImageSrc(src);
                            setIsLoaded(true);
                        };
                        observer.disconnect();
                    }
                });
            },
            { rootMargin: '50px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, [src]);

    return (
        <img
            ref={imgRef}
            src={imageSrc}
            alt={alt}
            className={cn(
                'transition-opacity duration-300',
                isLoaded ? 'opacity-100' : 'opacity-50',
                className
            )}
            loading="lazy"
        />
    );
}