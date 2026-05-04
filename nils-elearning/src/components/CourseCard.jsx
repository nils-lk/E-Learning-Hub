import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, Play, Users, Clock } from 'lucide-react';

const CourseCard = ({ course }) => {
  const { id, title, description, is_paid, price, thumbnail_url, lecturer_name, lesson_count } = course;

  return (
    <Link
      to={`/course/${id}`}
      id={`course-card-${id}`}
      className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-nilsBlue-800 to-nilsBlue-600 overflow-hidden">
        {thumbnail_url ? (
          <img
            src={thumbnail_url}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-12 h-12 text-white/30" />
          </div>
        )}
        {/* Badge overlay */}
        <div className="absolute top-3 right-3">
          {is_paid ? (
            <span className="badge-paid shadow-sm">
              <Lock className="w-3 h-3" /> Rs. {Number(price).toLocaleString()}
            </span>
          ) : (
            <span className="badge-free shadow-sm">
              <Play className="w-3 h-3" /> Free
            </span>
          )}
        </div>
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-lg">
            <Play className="w-5 h-5 text-nilsBlue-800 fill-nilsBlue-800 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-snug line-clamp-2 mb-2 group-hover:text-nilsBlue-700 dark:group-hover:text-nilsBlue-300 transition-colors">
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4 flex-grow">
          {description || 'No description provided.'}
        </p>

        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-3 mt-auto">
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            {lecturer_name || 'NILS Lecturer'}
          </span>
          {lesson_count !== undefined && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {lesson_count} lesson{lesson_count !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default CourseCard;
