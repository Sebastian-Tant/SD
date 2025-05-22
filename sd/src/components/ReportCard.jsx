import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faCalendarCheck, 
  faTools, 
  faThumbsUp,
  faArrowUp,
  faExclamationCircle,
  faSmileBeam
} from '@fortawesome/free-solid-svg-icons';

const ReportCard = ({ title, value, trend, trendColor, icon }) => {
  const getTrendIcon = () => {
    if (trend.includes('improvement')) return faArrowUp;
    if (trend.includes('issues')) return faExclamationCircle;
    return faSmileBeam;
  };

  const getMainIcon = () => {
    switch(icon) {
      case 'calendar-check': return faCalendarCheck;
      case 'tools': return faTools;
      case 'thumbs-up': return faThumbsUp;
      default: return faCalendarCheck;
    }
  };

  const getIconColorClass = () => {
    switch(icon) {
      case 'tools': return 'text-amber-400';
      case 'thumbs-up': return 'text-green-400';
      default: return 'text-indigo-400';
    }
  };

  const getIconBgClass = () => {
    switch(icon) {
      case 'tools': return 'bg-gradient-to-br from-amber-600/20 to-amber-800/20';
      case 'thumbs-up': return 'bg-gradient-to-br from-green-600/20 to-green-800/20';
      default: return 'bg-gradient-to-br from-indigo-600/20 to-indigo-800/20';
    }
  };

  const getCardGradient = () => {
    switch(icon) {
      case 'tools': return 'bg-gradient-to-br from-gray-900 to-gray-800';
      case 'thumbs-up': return 'bg-gradient-to-br from-gray-900 to-gray-800';
      default: return 'bg-gradient-to-br from-gray-900 to-gray-800';
    }
  };

  return (
    <article className={`report-card relative w-64 p-5 rounded-xl ${getCardGradient()} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-700/50`}>
      <div className={`icon-container absolute top-4 right-4 ${getIconBgClass()} rounded-lg p-3 transition-all duration-300 hover:scale-110`}>
        <FontAwesomeIcon 
          icon={getMainIcon()} 
          className={`text-xl ${getIconColorClass()} transition-all duration-300`} 
        />
      </div>
      
      <div className="flex flex-col pt-2">
        <div className="mb-2">
          <p className="text-gray-400 text-sm uppercase tracking-wider">{title}</p>
        </div>
        <h3 className="text-2xl font-bold mb-3 text-white">{value}</h3>
        <p className={`text-sm ${trendColor} flex items-center`}>
          <FontAwesomeIcon 
            icon={getTrendIcon()} 
            className="mr-2 text-sm transition-all duration-300 hover:scale-125" 
          />
          {trend}
        </p>
      </div>
    </article>
  );
};

export default ReportCard;