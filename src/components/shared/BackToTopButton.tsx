import { useState, useEffect } from 'react';

export interface BackToTopButtonProps {
  threshold?: number;
  activeTab: string;
}

/**
 * Floating button that appears on scroll to quickly return to the top of long report views.
 */
export default function BackToTopButton({ threshold = 200, activeTab }: BackToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (activeTab === 'overview') return;

    const scrollContainer =
      document.querySelector('.overflow-auto') || document.querySelector('main');

    const handleScroll = () => {
      const windowScroll = window.scrollY || document.documentElement.scrollTop;
      const containerScroll = scrollContainer ? scrollContainer.scrollTop : 0;
      const shouldBeVisible = windowScroll > threshold || containerScroll > threshold;
      setIsVisible((prev) => (prev !== shouldBeVisible ? shouldBeVisible : prev));
    };

    // Initial check via requestAnimationFrame
    const frameId = requestAnimationFrame(handleScroll);

    window.addEventListener('scroll', handleScroll, { passive: true });
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', handleScroll);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [threshold, activeTab]);

  const scrollToTop = () => {
    const scrollContainer =
      document.querySelector('.overflow-auto') || document.querySelector('main');
    if (scrollContainer && scrollContainer.scrollTop > 0) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isVisible || activeTab === 'overview') return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Back to top"
      title="Back to top"
      className="fixed bottom-4 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-accent-blue text-text-on-primary dark:text-surface-950 border border-accent-blue/30 shadow-xl ring-2 ring-canvas/50 transition-all duration-200 hover:scale-110 hover:bg-accent-blue/90 hover:shadow-2xl active:scale-95 cursor-pointer"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  );
}
