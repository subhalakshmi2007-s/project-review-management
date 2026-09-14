import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight } from 'react-icons/fi';

export default function HistoryControls({ className = '' }) {
  const navigate = useNavigate();

  return (
    <div className={`history-controls ${className}`} aria-label="Page navigation">
      <button type="button" onClick={() => navigate(-1)} title="Go back" aria-label="Go back">
        <FiArrowLeft />
      </button>
      <button type="button" onClick={() => navigate(1)} title="Go forward" aria-label="Go forward">
        <FiArrowRight />
      </button>
    </div>
  );
}