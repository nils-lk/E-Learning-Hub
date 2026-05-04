import React from 'react';

const LoadingSpinner = ({ fullscreen = false, size = 'md' }) => {
  const sizes = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div className={`${sizes[size]} rounded-full border-nilsBlue-200 dark:border-nilsBlue-800 border-t-nilsBlue-700 dark:border-t-nilsBlue-400 animate-spin`} />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-950 z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-4 border-nilsBlue-200 dark:border-nilsBlue-800 border-t-nilsBlue-700 dark:border-t-nilsBlue-400 animate-spin" />
          <p className="text-nilsBlue-700 dark:text-nilsBlue-300 font-medium">Loading…</p>
        </div>
      </div>
    );
  }

  return spinner;
};

export default LoadingSpinner;
