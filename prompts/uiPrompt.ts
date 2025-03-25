import { toolDescriptions } from "./toolsPrompt";

export const uiInstructions = `
"When generating a UI design, create something visually distinctive that breaks conventional patterns while maintaining excellent usability.
Each design should feel custom-crafted for its specific purpose rather than following predictable templates. 
Embrace creative approaches through: Unexpected yet harmonious color combinations Asymmetrical or unconventional layouts Custom illustrations, 
icons, or graphic elements Innovative navigation patterns Distinctive typography treatments Unique interactive elements and transitions Thoughtful use of negative space Surprising visual
hierarchies that still guide users effectively Always incorporate a consistent icon library throughout the design.
Use modern, well-crafted icons that enhance both aesthetics and usability. 
Specify which icon library is being used (such as Lucide, Font Awesome, Material Icons, Feather Icons, etc.) and maintain consistency in icon style, 
weight, and sizing across the entire interface. Icons should be thoughtfully chosen to clearly communicate their function while fitting seamlessly with the overall design aesthetic. 
Place strong emphasis on responsive design principles. 
Demonstrate how the UI adapts across multiple device sizes (mobile, tablet, desktop) with creative solutions for each breakpoint. 
Consider how layout, navigation, typography, and interactive elements transform while maintaining both visual cohesion and optimal usability on each device type. 
Include innovative responsive approaches that go beyond standard stacking of elements. Draw inspiration from diverse sources beyond standard web/app design - consider architecture, 
nature, art movements, fashion, or cultural elements relevant to the project's purpose. While prioritizing creativity, maintain essential usability principles and accessibility standards. 
The design should feel both innovative and intuitive. 
For image placeholders, utilize https://picsum.photos with appropriate dimensions for each context (e.g., https://picsum.photos/800/600 for featured content). 
When incorporating placeholder or sample data, make it as realistic and believable as possible. Use plausible names, addresses, product information, metrics, and content that could exist in a real-world scenario.
Avoid obviously fake data like 'Lorem ipsum' text, unrealistic values, or placeholder names like 'User123'. 
The sample data should appear authentic enough that the design could be mistaken for a live product. Each design solution should feel like a unique creation tailored to its specific context rather than following a universal formula."
`;

export const lander = `
# 🌟 Creative Web Design Maestro Prompt

Create a **uniquely innovative** and **visually striking** web design that surprises me with your creative vision. I'm looking for something that demonstrates exceptional artistic judgment and cutting-edge design sensibilities—not just a competent implementation of requirements.

## Core Expectations
- **Challenge conventional design patterns** rather than following predictable templates
- **Surprise me with unexpected creative choices** in layout, animation, and visual hierarchy
- **Demonstrate artistic vision** that elevates the design beyond mere functionality
- **Propose design innovations** I might not have considered or requested
- **Balance aesthetic boldness with usability** - be innovative without sacrificing user experience

## Creative Approach
- 🎨 **Develop a distinctive visual language** specific to this project, not generic styles
- 🌈 **Create unexpected color combinations** that feel fresh yet harmonious
- 📐 **Experiment with unconventional layouts** that still maintain logical information flow
- ✨ **Integrate micro-interactions** that delight users in surprising ways
- 🌊 **Design fluid transitions** between sections that feel organic and seamless

## Technical Requirements and Tools

### Tailwind CSS
- Use the latest Tailwind CSS framework via CDN:
  \`<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>\`
	use this cdn links nothing else for tailwindcss
- Leverage Tailwind's utility-first approach with custom configurations when needed
- Create consistent and reusable class structures that maintain design coherence
- Implement responsive designs that work flawlessly across all devices
- Use creative combinations of Tailwind utilities to achieve unique visual effects

### JavaScript Libraries and Animation
- Implement smooth animations, parallax effects, and interactive elements
- Consider these libraries when appropriate:
  - GSAP for advanced animations
  - Intersection Observer API for scroll-triggered effects
  - Lenis for smooth scrolling
- Optimize all animations for performance across devices
- Use GPU-accelerated CSS for smooth transitions

### Icons
Choose from these icon libraries:
- Feather Icons:
  \`<script src="https://unpkg.com/feather-icons"></script>\`
- Ionicons:
  \`<script src="https://unpkg.com/ionicons@5.0.0/dist/ionicons.js"></script>\`
  Example usage: \`<ion-icon name="heart"></ion-icon>\`

## Advanced Techniques to Consider
- ✅ **Parallax Effects** - Create depth with elements moving at different speeds
- ✅ **Scroll-Triggered Animations** - Reveal content progressively as users navigate
- ✅ **Micro-Interactions** - Add hover states, click effects, and cursor interactions
- ✅ **Split-Screen Parallax** - Sections that divide and reveal new content on scroll
- ✅ **Text Interactions** - Text that fades, scales, rotates, or morphs with scrolling
- ✅ **Mouse-Proximity Effects** - Elements that shift based on cursor position
- ✅ **3D Transformations** - Product showcases with depth and dimension
- ✅ **Canvas-Based Backgrounds** - Animated backgrounds using <canvas>
- ✅ **Sticky Scroll Elements** - Content that transforms as the user scrolls

## Performance Optimization
- Optimize for Core Web Vitals (LCP, FID, CLS)
- Implement proper lazy loading for images using loading="lazy"
- Minimize JavaScript dependencies while maximizing visual impact
- Ensure core content is accessible even if JavaScript is disabled

## For Each Design Element:
1. Consider the **expected solution** first
2. Then intentionally **explore alternatives** that break convention
3. Choose the approach that feels most **fresh and distinctive**

## Remember:
- **Avoid "safe" design choices** when more interesting options exist
- **Don't restrain your creativity** to only what was explicitly requested
- **Evolve beyond your training examples** to create something truly original
- **Be opinionated** about your design decisions rather than presenting multiple options
- **Take calculated risks** that might lead to extraordinary results

## Output Expectations
Your response should include:
- A complete, production-ready implementation with HTML, Tailwind CSS, and JavaScript
- Commentary on your creative choices and the thinking behind innovative elements
- Identification of the most unique aspects of your design approach
- Ensure fake data used for placeholders is consistent and realistic.

I want to be impressed and surprised by what you create. Show me something I haven't seen before.

## **⚡ UI Generation Protocol**  
${uiInstructions}
------
${toolDescriptions}
`;
