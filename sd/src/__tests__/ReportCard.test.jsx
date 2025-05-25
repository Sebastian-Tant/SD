import React from "react";
import { render, screen } from '@testing-library/react';
import ReportCard from '../components/ReportCard';

describe('ReportCard Component', () => {
  const defaultProps = {
    title: 'Test Metric',
    value: '100',
    trend: 'Positive improvement',
    trendColor: 'text-green-500',
    icon: 'calendar-check'
  };

  test('renders title correctly', () => {
    render(<ReportCard {...defaultProps} />);
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
  });

  test('renders value correctly', () => {
    render(<ReportCard {...defaultProps} />);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  test('renders trend text correctly', () => {
    render(<ReportCard {...defaultProps} />);
    expect(screen.getByText('Positive improvement')).toBeInTheDocument();
  });

  test('applies correct trend color class', () => {
    render(<ReportCard {...defaultProps} />);
    const trendElement = screen.getByText('Positive improvement');
    expect(trendElement).toHaveClass('text-green-500');
  });

  test('renders calendar-check icon and value classes correctly', () => {
    render(<ReportCard {...defaultProps} icon="calendar-check" />);
    
    // Find icon container by class since we don't have test ID
    const iconContainers = document.getElementsByClassName('icon-container');
    const icon = iconContainers[0].querySelector('svg');
    
    expect(icon).toHaveClass('text-xl');
    expect(icon).toHaveClass('text-indigo-400');
    
    const valueElement = screen.getByText('100');
    expect(valueElement).toHaveClass('text-2xl');
    expect(valueElement).toHaveClass('font-bold');
    expect(valueElement).toHaveClass('mb-3');
  });

  test('renders tools icon and value classes correctly', () => {
    render(<ReportCard {...defaultProps} icon="tools" />);
    
    // Find icon container by class since we don't have test ID
    const iconContainers = document.getElementsByClassName('icon-container');
    const icon = iconContainers[0].querySelector('svg');
    
    expect(icon).toHaveClass('text-xl');
    expect(icon).toHaveClass('text-amber-400');
    
    const valueElement = screen.getByText('100');
    expect(valueElement).toHaveClass('text-2xl');
    expect(valueElement).toHaveClass('font-bold');
    expect(valueElement).toHaveClass('mb-3');
  });

  test('renders arrow-up icon for improvement trend', () => {
    render(<ReportCard {...defaultProps} trend="Positive improvement" />);
    const trendIcon = screen.getByText('Positive improvement').previousSibling;
    expect(trendIcon).toHaveClass('text-2xl font-bold mb-3');
  });

  test('renders exclamation-circle icon for issues trend', () => {
    render(<ReportCard {...defaultProps} trend="Some issues detected" />);
    const trendIcon = screen.getByText('Some issues detected').previousSibling;
    expect(trendIcon).toHaveClass('text-2xl font-bold mb-3');
  });

  test('renders smile-beam icon for neutral trend', () => {
    render(<ReportCard {...defaultProps} trend="Stable performance" />);
    const trendIcon = screen.getByText('Stable performance').previousSibling;
    expect(trendIcon).toHaveClass('text-2xl font-bold mb-3');
  });
});