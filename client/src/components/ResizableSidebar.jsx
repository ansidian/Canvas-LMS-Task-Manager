import { useState, useEffect, useRef } from 'react';
import { Stack, Divider } from '@mantine/core';
import { OnboardingTour } from '@gfazioli/mantine-onboarding-tour';
import PendingSidebar from './PendingSidebar';
import FilterPanel from './FilterPanel';

const SPLIT_POSITION_KEY = 'sidebar_split_position';
const DEFAULT_SPLIT = 60; // 60% for pending items
const MIN_SPLIT = 20; // Minimum 20% for each section
const MAX_SPLIT = 80; // Maximum 80% for pending section

export default function ResizableSidebar({
  pendingItems,
  onPendingItemClick,
  statusFilters,
  onStatusFiltersChange,
  classFilters,
  onClassFiltersChange,
  classes,
}) {
  const [splitPosition, setSplitPosition] = useState(() => {
    const saved = localStorage.getItem(SPLIT_POSITION_KEY);
    return saved ? parseFloat(saved) : DEFAULT_SPLIT;
  });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  // Persist split position
  useEffect(() => {
    localStorage.setItem(SPLIT_POSITION_KEY, splitPosition.toString());
  }, [splitPosition]);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const percentage = (y / rect.height) * 100;

      // Clamp between min and max
      const newSplit = Math.max(MIN_SPLIT, Math.min(MAX_SPLIT, percentage));
      setSplitPosition(newSplit);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  return (
    <Stack
      ref={containerRef}
      gap={0}
      style={{
        height: '100%',
        position: 'relative',
      }}
    >
      {/* Pending Items Section */}
      <OnboardingTour.Target id="pending-section">
        <div
          style={{
            height: `${splitPosition}%`,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <PendingSidebar
            items={pendingItems}
            onItemClick={onPendingItemClick}
          />
        </div>
      </OnboardingTour.Target>

      {/* Draggable Divider */}
      <Divider
        onMouseDown={handleMouseDown}
        style={{
          cursor: 'ns-resize',
          padding: '4px 0',
          margin: 0,
          backgroundColor: isDragging ? 'var(--mantine-color-blue-6)' : undefined,
          transition: isDragging ? 'none' : 'background-color 0.2s',
        }}
      />

      {/* Filter Panel Section */}
      <OnboardingTour.Target id="filter-section">
        <div
          style={{
            height: `${100 - splitPosition}%`,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <FilterPanel
            statusFilters={statusFilters}
            onStatusFiltersChange={onStatusFiltersChange}
            classFilters={classFilters}
            onClassFiltersChange={onClassFiltersChange}
            classes={classes}
          />
        </div>
      </OnboardingTour.Target>
    </Stack>
  );
}
