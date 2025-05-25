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
import './css-files/ReportCard.css';

const ReportCard = ({ title, value, trend, trendColor, icon }) => {
  // Determine which icon to use 
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
      case 'tools': return 'bg-amber-600/20';
      case 'thumbs-up': return 'bg-green-600/20';
      default: return 'bg-indigo-600/20';
    }
  };

  return (
    <article className="report-card relative"> 
      <section className={`icon-container absolute top-4 right-4 ${getIconBgClass()}`}>
        <FontAwesomeIcon 
          icon={getMainIcon()} 
          className={`text-xl ${getIconColorClass()}`} 
        />
      </section>
      
      <section className="flex flex-col pt-2"> 
        <section className="mb-2">
          <p className="text-muted text-sm uppercase tracking-wider">{title}</p>
        </section>
        <h3 className="text-2xl font-bold mb-3">{value}</h3>
        <p className={`text-sm ${trendColor} flex items-center`}>
          <FontAwesomeIcon 
            icon={getTrendIcon()} 
            className="mr-2 text-sm" 
          />
          {trend}
        </p>
      </section>
    </article>
  );
};

export default ReportCard;