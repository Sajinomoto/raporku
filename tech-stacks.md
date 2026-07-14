# Raporku Tech Stacks & Design System Reference

## Technical Architecture
*   **Frontend Framework**: Next.js 16 (App Router)
*   **Authentication & Database**: Supabase Client SDK (PostgreSQL Engine)
*   **Styling Engine**: Tailwind CSS v4 (CSS-only theme configuration)
*   **Icon Library**: Lucide React

## Design System & Color Palette
All user interface developments and revisions MUST align with the following premium color scheme:

| Token Name | Tailwind Variable Class | Hex Value | Primary Usage Guidelines |
| :--- | :--- | :--- | :--- |
| **Mustard** | `bg-mustard` / `text-mustard` | `#FFB800` | Active highlights, brand logo accents, selected indicators, warning/pending badges. |
| **Strong Blue** | `bg-strong-blue` / `text-strong-blue` | `#002583` | Main branding layout, sidebar background, primary headers, primary buttons, links. |
| **Cool Light Gray** | `bg-cool-gray` | `#E5E8EF` | Outer wrapper backgrounds, canvas backdrop, layout gutters, border-zinc lines. |

## Interactive Styling Standards
*   **Card Hover Effect**: Translate slightly upward (`hover:-translate-y-1`), deepen shadow (`hover:shadow-lg`), and enhance border opacity/color matching the category color.
*   **Tactile Click Feedback**: Shrink slightly on active mouse down (`active:scale-95` or `active:scale-[0.96]`) and translate down (`active:translate-y-0.5`) to simulate physical buttons.
