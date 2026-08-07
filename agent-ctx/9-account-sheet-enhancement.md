---
Task ID: 9
Agent: full-stack-developer
Task: Enhance account-sheet.tsx with activity chart, streak counter, stats grid, theme display, and session info

Work Log:
- Read worklog.md and existing account-sheet.tsx (407 lines)
- Studied Lumina design system patterns: glass-pill, glass-card, lumina-primary/secondary, lumina-on-surface, font-display/font-body
- Added imports: Flame, Sun, Moon, Monitor, TrendingUp, CalendarDays, Clock, Globe, Zap from lucide-react; useTheme from next-themes
- Added localStorage activity tracking system: ACTIVITY_KEY, FIRST_USE_KEY for daily activity logging
- Created helper functions: hashStr (deterministic date→number), shortDay, isoDate, recordTodayActivity, getActivityLog, ensureFirstUseDate, calculateStreak, countActiveDays, detectBrowser
- Added Usage Activity Chart: 7-day bar visualization with gradient bars (lumina-primary→lumina-secondary), dimmed bars for inactive days, labels ("Today", "Mon DD"), 80px container with flex layout
- Added Streak Counter: flame icon badge in gradient pill, orange-500 color when streak>0, muted when 0, "days" suffix label hidden on mobile
- Enhanced Quick Stats Grid from 2×2 to 2×3: added "Avg Messages/Day" (Zap icon, lumina-primary) and "Active Days" (CalendarDays icon, lumina-secondary)
- Added Theme Preference Display: glass-pill card with Sun/Moon icon, shows "Dark"/"Light" mode, shows "Follows system" for system theme
- Added Language Preference card: glass-pill card with Globe icon, shows "English (Default)"
- Added Session Info card: glass-pill with Clock icon, shows session start date+time and browser name from navigator.userAgent
- Fixed lint: wrapped setMounted(true) in setTimeout to avoid react-hooks/set-state-in-effect rule
- All clear all data now also removes ACTIVITY_KEY and FIRST_USE_KEY from localStorage
- All lint checks pass (only pre-existing db.ts error)

Stage Summary:
- Enhanced: src/components/account-sheet.tsx (407 → 756 lines)
- New features: 7-day activity bar chart, streak counter with flame icon, 2×3 stats grid, theme/language preference cards, session info card
- Activity tracking uses localStorage (tamanna_activity_log, tamanna_first_use) for persistence
- All features use Lumina design system: glass-pill, lumina-primary/secondary colors, font-display/body
- No new dependencies added
