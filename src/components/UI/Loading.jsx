import React from 'react';

export const Loading = ({ fullScreen = false }) => {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div className="absolute h-full w-full animate-spin rounded-full border-4 border-solid border-brand border-t-transparent"></div>
        <div className="absolute h-10 w-10 animate-ping rounded-full bg-brand opacity-20"></div>
        {/* Simple inner dot */}
        <div className="h-4 w-4 rounded-full bg-brand"></div>
      </div>
      <p className="animate-pulse text-sm font-semibold text-brand dark:text-brand-light">
        Chargement de l'application...
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        {content}
      </div>
    );
  }

  return (
    <div className="flex h-64 w-full items-center justify-center">
      {content}
    </div>
  );
};

export default Loading;
