import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Extracts the YouTube video ID from various URL formats.
 * Supports: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/embed/ID
 */
const extractYouTubeId = (url) => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

/**
 * VideoPlayer — renders a YouTube video in a custom, branded iframe.
 * Hides YouTube branding as much as possible (modestbranding, rel=0).
 * Works for both public and unlisted videos.
 */
const VideoPlayer = ({ videoUrl, title = 'Lesson Video' }) => {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const videoId = extractYouTubeId(videoUrl);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(timer);
  }, [videoUrl]);

  if (!videoId) {
    return (
      <div className="aspect-video bg-gray-900 dark:bg-gray-950 rounded-2xl flex flex-col items-center justify-center text-gray-400 gap-3">
        <AlertCircle className="w-10 h-10 text-gray-600" />
        <p className="text-sm">Video not available</p>
      </div>
    );
  }

  const embedUrl = [
    `https://www.youtube.com/embed/${videoId}`,
    `?rel=0`,
    `&modestbranding=1`,
    `&iv_load_policy=3`,
    `&color=white`,
    `&disablekb=0`,
    `&fs=1`,
    `&playsinline=1`,
  ].join('');

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl"
      style={{ minHeight: 220 }}
    >
      {/* NILS branded top bar — overlays YouTube logo area */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent px-4 py-3 flex items-center gap-2 pointer-events-none">
        <div className="w-6 h-6 rounded bg-nilsBlue-700 flex items-center justify-center">
          <span className="text-white text-[8px] font-black leading-none">N</span>
        </div>
        <p className="text-white text-xs font-medium truncate opacity-90">{title}</p>
      </div>

      {/* Loading skeleton */}
      {!ready && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-20">
          <div className="w-10 h-10 rounded-full border-4 border-gray-700 border-t-nilsBlue-500 animate-spin" />
        </div>
      )}

      <iframe
        src={embedUrl}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        onLoad={() => setReady(true)}
        className={`w-full h-full transition-opacity duration-500 ${ready ? 'opacity-100' : 'opacity-0'}`}
        style={{ border: 'none' }}
      />
    </div>
  );
};

export default VideoPlayer;
