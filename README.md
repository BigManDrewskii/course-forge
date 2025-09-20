# CourseForge - AI-Powered Course Creation Platform

CourseForge is a modern web application that transforms subject matter expertise into comprehensive, high-quality online courses using AI. Built with React, Tailwind CSS, and the AI SDK, it provides a streamlined interface for course creators to generate professional curriculum without templates or generic content.

## ✨ Features

- **AI-Powered Generation**: Create comprehensive courses using OpenAI and Anthropic models
- **Real-time Streaming**: Watch your course content generate in real-time with progress tracking
- **Accessibility First**: Full WCAG compliance with keyboard navigation and screen reader support
- **Mobile Optimized**: Responsive design that works perfectly on all devices
- **Export Ready**: Download courses in multiple formats for any platform (Skool, Kajabi, etc.)
- **Cost Transparent**: Real-time token and cost tracking during generation
- **Session Management**: Automatic session handling with usage analytics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- OpenAI API key (required)
- Anthropic API key (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd courseforge
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
   ```

4. **Start development server**
   ```bash
   pnpm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🏗️ Architecture

### Technology Stack

- **Frontend**: React 19 with Vite
- **Styling**: Tailwind CSS v4 with custom design system
- **UI Components**: Shadcn/UI with accessibility enhancements
- **AI Integration**: AI SDK with OpenAI and Anthropic providers
- **State Management**: React hooks with custom course generation logic
- **Storage**: LocalStorage for MVP (designed for easy database migration)
- **Icons**: Lucide React
- **Animations**: Framer Motion

### Project Structure

```
src/
├── components/           # React components
│   ├── ui/              # Base UI components (Button, Input, etc.)
│   ├── CourseInputForm.jsx
│   └── CourseGenerationModal.jsx
├── hooks/               # Custom React hooks
│   └── useCourseGeneration.js
├── lib/                 # Utility libraries
│   ├── ai-provider.js   # AI service integration
│   ├── db.js           # Data management
│   └── utils.js        # Helper functions
└── App.jsx             # Main application component
```

## 🎯 Core Features

### Course Generation

The platform uses sophisticated prompt engineering to generate high-quality course content:

- **Multi-stage prompting** for comprehensive curriculum development
- **Streaming responses** with real-time progress tracking
- **Cost estimation** and transparent pricing
- **Error handling** with retry mechanisms

### Accessibility

Built following WCAG 2.1 AA standards:

- **Keyboard navigation** throughout the application
- **Screen reader support** with proper ARIA labels
- **Focus management** with visible focus indicators
- **Mobile-first design** with touch-friendly interactions
- **Color contrast** meeting accessibility requirements

### User Experience

- **Unsaved changes warning** prevents data loss
- **Real-time validation** with helpful error messages
- **Progressive enhancement** for all network conditions
- **Responsive design** optimized for all screen sizes

## 🔧 Configuration

### AI Providers

The application supports multiple AI providers:

```javascript
// Default configuration
const defaultOptions = {
  provider: 'openai',
  model: 'gpt-4o-mini',
  maxTokens: 3000,
  temperature: 0.7
}
```

### Customization

- **Design system**: Modify `src/App.css` for theme customization
- **Prompts**: Update `CoursePromptBuilder` in `ai-provider.js`
- **Validation**: Modify schemas in `CourseInputForm.jsx`

## 📊 Analytics & Monitoring

The platform includes built-in analytics:

- **Usage tracking** with session management
- **Cost monitoring** per generation
- **Performance metrics** for optimization
- **Error tracking** for debugging

## 🚀 Deployment

### Build for Production

```bash
pnpm run build
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Environment Variables

Set these in your deployment platform:

- `VITE_OPENAI_API_KEY`
- `VITE_ANTHROPIC_API_KEY`
- `VITE_APP_NAME`
- `VITE_APP_VERSION`

## 🧪 Development

### Available Scripts

- `pnpm run dev` - Start development server
- `pnpm run build` - Build for production
- `pnpm run preview` - Preview production build
- `pnpm run lint` - Run ESLint

### Code Quality

The project follows modern React best practices:

- **TypeScript-ready** architecture
- **Component composition** over inheritance
- **Custom hooks** for state management
- **Error boundaries** for graceful failures

## 🔒 Security

- **API key protection** with environment variables
- **Input validation** on all user inputs
- **XSS prevention** with proper sanitization
- **CSRF protection** through SameSite cookies

## 📈 Performance

- **Code splitting** with dynamic imports
- **Lazy loading** for optimal bundle size
- **Streaming responses** for immediate feedback
- **Optimized images** and assets

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the code examples

## 🎉 Acknowledgments

- Built with modern web technologies
- Inspired by the need for quality course creation tools
- Designed for accessibility and user experience
- Powered by AI for content generation
