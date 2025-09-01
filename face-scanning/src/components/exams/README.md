# Modular Exam Components - Implementation Guide

## Overview

The ExamsGrid component has been refactored to be more modular, theme-responsive, and maintainable. The changes include:

1. **Modular Architecture**: Separated `ExamCard` into its own component
2. **Theme-Responsive Design**: Full support for light/dark theme switching
3. **Enhanced CSS Modules**: Dedicated stylesheets for better organization
4. **Improved Accessibility**: Better focus states and ARIA labels
5. **Enhanced Animations**: Smooth transitions and hover effects

## Components Structure

```
src/components/exams/
├── ExamCard.tsx              # Individual exam card component
├── ExamCard.module.css       # Styles for exam cards
├── ExamsGrid.tsx             # Grid container component
├── ExamsGrid.module.css      # Styles for grid and modal
└── README.md                 # This documentation
```

## Key Features

### 🎨 Theme-Responsive Design

- Automatic theme detection from CSS variables
- Seamless light/dark mode transitions
- Theme-aware status colors and backgrounds

```css
/* Automatically adapts to theme changes */
[data-theme="dark"] .examCard {
  background: linear-gradient(
    135deg,
    rgba(30, 41, 59, 0.9) 0%,
    rgba(51, 65, 85, 0.8) 100%
  );
}

[data-theme="light"] .examCard {
  background: rgba(255, 255, 255, 0.9);
}
```

### 🧩 Modular Components

Each exam card is now a reusable component with its own props:

```tsx
<ExamCard
  exam={exam}
  formatRange={formatRange}
  onViewDetails={handleViewDetails}
  onEdit={handleEdit}
/>
```

### 🎭 Status-Aware Styling

Dynamic status colors that adapt to the current theme:

```tsx
const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "var(--success-color)";
    case "draft":
      return "var(--warning-color)";
    case "completed":
      return "var(--info-color)";
    case "cancelled":
      return "var(--error-color)";
    default:
      return "var(--text-secondary)";
  }
};
```

### ✨ Enhanced Animations

- Smooth hover effects with transform and shadow transitions
- Loading animations for async operations
- Modal entrance/exit animations

### 📱 Responsive Design

- Mobile-first approach
- Adaptive grid columns based on screen size
- Touch-friendly interactions

## Usage Example

```tsx
import React from 'react';
import ExamsGrid from './components/exams/ExamsGrid';

const ExamsDashboard = () => {
  const exams = [
    {
      id: '1',
      exam_name: 'Mathematics Final',
      status: 'active',
      exam_key: 'MATH2024',
      participants: 25,
      attendances: [...]
    }
  ];

  const formatRange = (start?: string, end?: string) => {
    // Format date range logic
    return `${start} - ${end}`;
  };

  return (
    <div>
      <h1>My Exams</h1>
      <ExamsGrid exams={exams} formatRange={formatRange} />
    </div>
  );
};
```

## CSS Variables Used

The components rely on the global CSS variables defined in `globals.css`:

```css
/* Core theme variables */
--card-bg: Background for cards
--border-color: Border colors
--text-primary: Primary text color
--text-secondary: Secondary text color
--accent-color: Accent/brand color

/* Status colors */
--success-color, --success-bg: For active exams
--warning-color, --warning-bg: For draft exams
--info-color, --info-bg: For completed exams
--error-color, --error-bg: For cancelled exams

/* Interactive elements */
--button-bg, --button-hover: Button backgrounds
--modal-bg, --overlay-bg: Modal styling
--shadow: Box shadow values
```

## Accessibility Features

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **ARIA Labels**: Proper labeling for screen readers
- **Focus States**: Visible focus indicators
- **Color Contrast**: Theme-aware color combinations meet WCAG standards

## Browser Support

- Modern browsers with CSS Grid support
- CSS Custom Properties (CSS Variables)
- ES6+ JavaScript features

## Performance Optimizations

- **CSS Modules**: Scoped styles prevent conflicts
- **Event Delegation**: Efficient event handling
- **Conditional Rendering**: Only render modals when needed
- **Optimized Animations**: Hardware-accelerated transforms

## Future Enhancements

1. **Virtual Scrolling**: For large exam lists
2. **Drag & Drop**: Reorder exams
3. **Keyboard Shortcuts**: Quick actions
4. **Export Functionality**: Export exam data
5. **Real-time Updates**: WebSocket integration

## Troubleshooting

### Theme Not Updating

Ensure the root element has the correct `data-theme` attribute:

```html
<html data-theme="dark"></html>
```

### Styles Not Loading

Check that CSS modules are properly imported:

```tsx
import styles from "./ExamCard.module.css";
```

### Animation Performance

For better performance on older devices, add:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
