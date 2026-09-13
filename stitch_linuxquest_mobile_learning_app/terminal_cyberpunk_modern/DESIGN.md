---
name: Terminal Cyberpunk Modern
colors:
  surface: '#161B22'
  surface-dim: '#10141a'
  surface-bright: '#353940'
  surface-container-lowest: '#0a0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#262a31'
  surface-container-highest: '#31353c'
  on-surface: '#dfe2eb'
  on-surface-variant: '#bbc9cd'
  inverse-surface: '#dfe2eb'
  inverse-on-surface: '#2d3137'
  outline: '#859397'
  outline-variant: '#3c494c'
  surface-tint: '#2fd9f4'
  primary: '#8aebff'
  on-primary: '#00363e'
  primary-container: '#22d3ee'
  on-primary-container: '#005763'
  inverse-primary: '#006877'
  secondary: '#f8acff'
  on-secondary: '#570067'
  secondary-container: '#7d0793'
  on-secondary-container: '#f396ff'
  tertiary: '#ffd6a3'
  on-tertiary: '#462b00'
  tertiary-container: '#ffb13b'
  on-tertiary-container: '#6e4600'
  error: '#F85149'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#a2eeff'
  primary-fixed-dim: '#2fd9f4'
  on-primary-fixed: '#001f25'
  on-primary-fixed-variant: '#004e5a'
  secondary-fixed: '#ffd6ff'
  secondary-fixed-dim: '#f8acff'
  on-secondary-fixed: '#350040'
  on-secondary-fixed-variant: '#7b0190'
  tertiary-fixed: '#ffddb5'
  tertiary-fixed-dim: '#ffb957'
  on-tertiary-fixed: '#2a1800'
  on-tertiary-fixed-variant: '#643f00'
  background: '#10141a'
  on-background: '#dfe2eb'
  surface-variant: '#31353c'
  border-subtle: '#21262D'
  text-primary: '#E6EDF3'
  text-secondary: '#7D8590'
  success: '#3FB950'
  warning: '#D29922'
  track-basics: '#22D3EE'
  track-sysadmin: '#FB923C'
  track-dev: '#A78BFA'
  track-network: '#4ADE80'
  terminal-dark-box: '#0A0E14'
  light-background: '#FFFFFF'
  light-surface: '#F6F8FA'
  light-border: '#D0D7DE'
  light-text-primary: '#1F2328'
  light-text-secondary: '#656D76'
typography:
  display-title:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-section:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  title-card:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-default:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-medium:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-meta:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  code-terminal:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  code-bold:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
  code-caption:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

# LinuxQuest Design System

## Brand Identity & Aesthetic
Modern developer tool meets light RPG. Polished like Linear.app and VS Code, dark, focused, serious-but-fun mobile terminal experience with authentic command-line styling.

## Color Palette
- **Background**: `#0D1117` (deep slate)
- **Surface**: `#161B22` (elevated panels)
- **Border**: `#21262D` (subtle dividers)
- **Text Primary**: `#E6EDF3`
- **Text Secondary**: `#7D8590`
- **Accent 1 (Primary / Active)**: `#22D3EE` (cyan)
- **Accent 2 (XP / Rewards / Highlight)**: `#E879F9` (magenta)
- **Success**: `#3FB950`
- **Warning**: `#D29922`
- **Error / Danger**: `#F85149`

### Track Colors (Skill Tree)
- **Basics**: `#22D3EE` (cyan)
- **Sysadmin**: `#FB923C` (orange)
- **Dev**: `#A78BFA` (purple)
- **Network**: `#4ADE80` (green)

### Light Mode Variant
- **Background**: `#FFFFFF`
- **Surface**: `#F6F8FA`
- **Border**: `#D0D7DE`
- **Text Primary**: `#1F2328`
- **Text Secondary**: `#656D76`
- **Terminal Dark Box**: `#0A0E14` (terminal stays dark for authenticity)

## Typography
- **Code & Terminal**: `JetBrains Mono`, monospace, min 14px on mobile
- **UI & Display**: `Inter`, sans-serif
- **Sizes**: 12px (labels/meta), 14px (body/inputs), 16px (card titles/buttons), 20px (section headers), 24px (page titles)

## Spacing & Shape
- **Border Radius**: 8px (cards, terminal window), 6px (buttons), 4px (inputs/tags), 16px (bottom sheet top radius), 9999px (chips, nodes)
- **Spacing Scale**: 4px, 8px, 12px, 16px, 24px
- **Tap Targets**: Minimum 44px
- **Borders**: 1px subtle `#21262D`, delicate cyan glow `box-shadow: 0 0 12px rgba(34, 211, 238, 0.2)` on active elements.

## Component Patterns
- **Primary Button**: `#22D3EE` bg, `#0D1117` text, font-semibold, 44px height, rounded-md (6px)
- **Ghost Button**: Transparent bg, 1px `#21262D` border, `#E6EDF3` text, hover/active subtle bg
- **Terminal Window**: `#0A0E14` dark fill, rounded-lg (8px), header with three muted dots and `user@linuxquest: ~`, monospace text, cyan prompt `$`
- **Skill Node**: 56px circular node, states: Locked, Available (cyan glow/pulse ring), In-progress (partial arc), Completed (track fill + check)
- **Bottom Navigation**: 56px height, 4 tabs (Learn, Tree, Stats, Profile)
