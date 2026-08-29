'use client';

import { useState } from 'react';
import Image from 'next/image';
import Lightbox from 'yet-another-react-lightbox';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';

interface ProductImageGalleryProps {
  images: { id?: string; url: string; order: number }[];
  productName: string;
}

export default function ProductImageGallery({ images, productName }: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  // Handle empty images
  if (!images || images.length === 0) {
    return (
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
        <div className="flex h-full items-center justify-center text-gray-400">
          <span>No image available</span>
        </div>
      </div>
    );
  }

  // Format images for the lightbox
  const slides = images.map((img) => ({
    src: img.url,
    alt: productName,
  }));

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setIsLightboxOpen(true);
  };

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening lightbox when clicking nav arrows
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-4">
      {/* Main Image Container */}
      <div 
        className="relative aspect-square w-full overflow-hidden rounded-lg bg-gray-100 cursor-zoom-in group"
        onClick={() => handleImageClick(currentIndex)}
      >
        <Image
          src={images[currentIndex].url}
          alt={`${productName} - Image ${currentIndex + 1}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority
        />

        {/* Navigation Arrows (Only show if > 1 image) */}
        {images.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
              aria-label="Previous image"
            >
              <svg className="h-6 w-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white z-10"
              aria-label="Next image"
            >
              <svg className="h-6 w-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Zoom Hint Icon */}
        <div className="absolute bottom-4 right-4 rounded-full bg-black/60 p-2 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </div>
      </div>

      {/* Thumbnails (Only show if > 1 image) */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((image, index) => (
            <button
              key={image.id || index} // ✅ Fallback prevents React key warnings
              onClick={() => handleImageClick(index)}
              className={`relative shrink-0 aspect-square w-20 overflow-hidden rounded-md border-2 transition-all ${
                index === currentIndex
                  ? 'border-blue-600 ring-2 ring-blue-100'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <Image
                src={image.url}
                alt={`${productName} - Thumbnail ${index + 1}`}
                fill
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Full-Screen Lightbox */}
      <Lightbox
        open={isLightboxOpen}
        close={() => setIsLightboxOpen(false)}
        slides={slides}
        index={currentIndex}
        plugins={[Thumbnails, Zoom]}
        thumbnails={{
          position: 'bottom',
          width: 120,
          height: 80,
        }}
        zoom={{
          maxZoomPixelRatio: 3, // Allow up to 3x zoom
          zoomInMultiplier: 2,
        }}
        carousel={{
          finite: false, // Enable infinite looping
        }}
        // Optional: Add keyboard navigation hints
        render={{
          iconClose: () => (
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
        }}
      />
    </div>
  );
}