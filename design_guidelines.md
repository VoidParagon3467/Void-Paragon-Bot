# Vøid Pæragon - Design Guidelines

## Design Approach

**Selected Approach**: Hybrid Design System with Creative Enhancement
- Base: Material Design principles for utility pages (admin, settings, coding)
- Enhanced: Webnovel/Wattpad-inspired aesthetics for creative sections (novels, reading)
- Justification: The platform combines utility (admin tools, code editor) with creative expression (novel writing/reading), requiring both functional clarity and immersive reading experiences

## Core Design Elements

### A. Color Palette

**Dark Mode (Primary)**
- Background: 0 0% 0% (pure black)
- Surface: 0 0% 7% (cards, elevated elements)
- Surface Variant: 0 0% 13% (inputs, secondary surfaces)
- Accent Primary: 270 100% 50% (#7a00ff - existing purple)
- Accent Secondary: 270 50% 65% (lighter purple for hover states)
- Text Primary: 0 0% 93% (#eee)
- Text Secondary: 0 0% 67% (#aaa)
- Border: 0 0% 13% (#222)
- Border Accent: 270 100% 50% (accent borders)

**Light Mode**
- Background: 0 0% 100% (pure white)
- Surface: 0 0% 97% (cards, elevated elements)
- Surface Variant: 0 0% 95% (inputs, secondary surfaces)
- Accent Primary: 270 100% 50% (same purple)
- Accent Secondary: 270 100% 40% (darker purple for better contrast)
- Text Primary: 0 0% 7% (#111)
- Text Secondary: 0 0% 40% (#666)
- Border: 0 0% 87% (#ddd)
- Border Accent: 270 100% 50%

**Premium Indicators**
- Premium Gold: 45 100% 50% (for premium badges)
- Premium Gradient: Linear gradient from 270 100% 50% to 45 100% 50%

### B. Typography

**Font Families**
- Display: "Cinzel", serif (for logo, major headings, novel titles)
- Heading: "Inter", sans-serif (for section headers, UI elements)
- Body: "Inter", sans-serif (for all body text, navigation)
- Code: "Fira Code", "Consolas", monospace (for code editor)

**Type Scale**
- Hero: 3rem (48px) / Bold / Cinzel
- H1: 2.25rem (36px) / SemiBold / Cinzel
- H2: 1.875rem (30px) / SemiBold / Inter
- H3: 1.5rem (24px) / SemiBold / Inter
- Body Large: 1.125rem (18px) / Regular / Inter
- Body: 1rem (16px) / Regular / Inter
- Body Small: 0.875rem (14px) / Regular / Inter
- Caption: 0.75rem (12px) / Regular / Inter

### C. Layout System

**Spacing Primitives**: Use Tailwind units of 4, 8, 12, 16, 20, 24, 32 (p-4, h-8, m-12, etc.)
- Micro spacing: p-2, gap-2 (8px) - for tight groupings
- Standard spacing: p-4, gap-4 (16px) - for most UI elements
- Section spacing: p-8, gap-8 (32px) - for major sections
- Page margins: px-4 md:px-8 lg:px-12

**Grid Systems**
- Admin Dashboard: 12-column grid for data tables
- Novel Library: 2-4 column responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-4)
- Reading View: Single column, max-w-3xl for optimal reading
- Code Editor: 2-column split (code/preview) with resizable panels

**Containers**
- Full-width sections: w-full with inner max-w-7xl mx-auto
- Content sections: max-w-6xl mx-auto
- Reading content: max-w-3xl mx-auto
- Forms/Settings: max-w-2xl mx-auto

### D. Component Library

**Navigation**
- Fixed sidebar (240px): Dark surface with accent borders, always visible on desktop
- Mobile: Slide-out drawer from left with backdrop overlay
- Top bar: Fixed, 60px height, contains menu toggle and user actions
- Navigation items: Full-width buttons with icons, hover state with accent background

**Novel Cards (Library View)**
- Cover image: 16:9 aspect ratio, border with accent color
- Title: H3, accent color, 2-line truncation
- Author: Body small, secondary text
- Metadata row: Genre tag, premium badge, rating stars
- Hover state: Subtle scale (scale-105), enhanced shadow with accent glow

**Novel Reader**
- Clean reading experience: Cream/sepia background option in dark mode
- Chapter navigation: Fixed bottom bar with prev/next buttons
- Reading progress bar: Top of viewport, accent color fill
- Font size controls: 3 preset sizes (16px, 18px, 20px)
- Line spacing controls: Comfortable (1.6), Relaxed (1.8), Loose (2.0)

**Code Editor (Admin Only)**
- Monaco-based editor with syntax highlighting
- Dark theme matching site aesthetic
- Toolbar: Language selector, run button, save, download
- Live preview panel: Resizable, iframe for HTML/CSS, console for JavaScript
- File tree sidebar: Collapsible, shows saved projects
- Multi-tab support: For multiple open files

**Admin Dashboard**
- Data tables: Striped rows, hover state, sortable columns
- Action buttons: Compact, icon + text, accent color
- Stat cards: Large numbers, trend indicators, sparkline charts
- Filters: Top bar with dropdowns, search, date range pickers

**Community Chat**
- Message bubbles: Different alignment for sent/received
- Typing indicators: Animated dots in accent color
- User avatars: 40px circles with accent border
- Online status: Green dot indicator
- Message input: Fixed bottom with send button

**Premium Payment Modal**
- Clean checkout form: Stripe-powered, card input with validation
- Pricing cards: Feature comparison, recommended option highlighted
- Success animation: Checkmark with accent color celebration

**Forms & Inputs**
- Text inputs: Dark surface, accent border on focus, clear error states
- Textareas: Resizable, character count for limited fields
- Selects: Custom dropdown with accent highlights
- Checkboxes/Radio: Accent color when checked
- File uploads: Drag-and-drop zone with preview

**Buttons**
- Primary: Accent background, white text, hover opacity 85%
- Secondary: Transparent with accent border, accent text
- Outline on images: Backdrop blur background, white text with accent border
- Icon buttons: Square 40px, hover with accent background

**Modals & Overlays**
- Backdrop: Black with 50% opacity
- Modal: Max-w-2xl, centered, elevated shadow with accent glow
- Close button: Top-right, icon only

### E. Animations

**Minimal Animation Strategy** - Use sparingly for polish, not distraction
- Page transitions: None (instant for performance)
- Micro-interactions only:
  - Button hover: opacity transition (0.3s)
  - Card hover: scale + shadow transition (0.3s)
  - Menu slide: left position transition (0.3s)
  - Loading states: Subtle pulse animation on skeletons

## Page-Specific Guidelines

### Homepage/Dashboard
- Hero section: Full-width, dark surface with accent gradient overlay
- Feature showcase: 3-column grid of cards with icons
- Recent activity feed: Timeline-style layout
- Quick actions: Large icon buttons in accent color

### Novel Library
- Filter bar: Top sticky, genre tags, sort dropdown, search
- Grid view: Responsive cards with cover images
- List view option: Compact rows with metadata
- Premium badge: Gold overlay on top-right of covers

### Novel Reader
- Minimalist interface: Hide navigation when reading
- Chapter selector: Drawer from right side
- Bookmark button: Floating action button, bottom-right
- Comment section: Below chapter, threaded replies

### Coding Environment
- Split panes: Resizable editor (60%) and preview (40%)
- Console output: Bottom panel, collapsible
- File explorer: Left sidebar (200px), tree structure
- Terminal integration: For Python/Node execution

### Community
- Chat list: Left sidebar (280px) with conversation previews
- Active chat: Main area with message thread
- User list: Right sidebar (200px) showing online members
- Search: Global search bar for messages and users

### Settings
- Sidebar navigation: Categorical sections
- Form sections: Cards with clear labels
- Toggle switches: For boolean preferences
- Save indicator: Floating notification on successful save

### Admin Dashboard
- Metric cards: Row of 4 cards showing key stats
- Table views: For users, novels, content management
- Bulk actions: Checkbox selection with action bar
- Premium toggle: Switch component on novel entries

## Accessibility & Theme Toggle

**Theme Toggle**
- Persistent across pages using localStorage
- Icon button in top navigation (moon/sun icon)
- Smooth transition for all color changes (0.3s)
- WCAG AA contrast compliance in both modes

**Responsive Breakpoints**
- Mobile: < 768px (single column, drawer navigation)
- Tablet: 768px - 1024px (2 columns where appropriate)
- Desktop: > 1024px (full multi-column layouts)

## Images

**Novel Cover Images**
- Placement: Novel cards in library, reader header, profile works section
- Aspect ratio: 16:9 or 2:3 (book-like)
- Fallback: Gradient placeholder with first letter of title

**User Avatars**
- Placement: Profile, comments, chat messages, navigation menu
- Size: 40px circles (80px on profile page)
- Fallback: Initials on accent background

**Hero Images**: Not used - the platform focuses on functional clarity over decorative imagery. Hero sections use gradient overlays on dark surfaces instead.