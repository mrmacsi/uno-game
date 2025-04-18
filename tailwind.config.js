module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'oklch(0.922 0 0)',
        ring: 'oklch(0.708 0 0)',
        background: 'oklch(1 0 0)',
        foreground: 'oklch(0.145 0 0)',
        card: 'oklch(1 0 0)',
        'card-foreground': 'oklch(0.145 0 0)',
        popover: 'oklch(1 0 0)',
        'popover-foreground': 'oklch(0.145 0 0)',
        primary: 'oklch(0.205 0 0)',
        'primary-foreground': 'oklch(0.985 0 0)',
        secondary: 'oklch(0.97 0 0)',
        'secondary-foreground': 'oklch(0.205 0 0)',
        muted: 'oklch(0.97 0 0)',
        'muted-foreground': 'oklch(0.556 0 0)',
        accent: 'oklch(0.97 0 0)',
        'accent-foreground': 'oklch(0.205 0 0)',
        destructive: 'oklch(0.577 0.245 27.325)',
        'destructive-foreground': 'oklch(0.577 0.245 27.325)',
        input: 'oklch(0.922 0 0)',
        'chart-1': 'oklch(0.646 0.222 41.116)',
        'chart-2': 'oklch(0.6 0.118 184.704)',
        'chart-3': 'oklch(0.398 0.07 227.392)',
        'chart-4': 'oklch(0.828 0.189 84.429)',
        'chart-5': 'oklch(0.769 0.188 70.08)',
        sidebar: 'oklch(0.985 0 0)',
        'sidebar-foreground': 'oklch(0.145 0 0)',
        'sidebar-primary': 'oklch(0.205 0 0)',
        'sidebar-primary-foreground': 'oklch(0.985 0 0)',
        'sidebar-accent': 'oklch(0.97 0 0)',
        'sidebar-accent-foreground': 'oklch(0.205 0 0)',
        'sidebar-border': 'oklch(0.922 0 0)',
        'sidebar-ring': 'oklch(0.708 0 0)',
      },
      borderRadius: {
        DEFAULT: '0.625rem',
      },
      keyframes: {
        // Card animations 
        dealCard: {
          '0%': { 
            transform: 'translateY(-500px) translateX(500px) rotate(180deg)',
            opacity: '0' 
          },
          '100%': { 
            transform: 'translateY(0) translateX(0) rotate(0deg)',
            opacity: '1' 
          }
        },
        drawCard: {
          '0%': {
            transform: 'translateY(0) scale(1)',
            opacity: '1'
          },
          '50%': {
            transform: 'translateY(-20px) scale(1.1)',
            opacity: '1',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
          },
          '100%': {
            transform: 'translateY(0) scale(1)',
            opacity: '1'
          }
        },
        playCard: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-100px) scale(1.2)' },
          '100%': { 
            transform: 'translateY(0) scale(1) translateX(0)',
            opacity: '0' 
          }
        },
        glowEffect: {
          '0%': { boxShadow: '0 0 5px rgba(255, 255, 255, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(255, 255, 255, 0.8)' },
          '100%': { boxShadow: '0 0 5px rgba(255, 255, 255, 0.5)' }
        },
        floatIn: {
          '0%': {
            transform: 'translateY(-40px) scale(0.8) rotate(-10deg)',
            opacity: '0'
          },
          '60%': {
            transform: 'translateY(8px) scale(1.05) rotate(2deg)',
            opacity: '1'
          },
          '100%': {
            transform: 'translateY(0) scale(1) rotate(0deg)',
            opacity: '1'
          }
        },
        discard: {
          '0%': { transform: 'translateY(0) scale(1)' },
          '50%': { 
            transform: 'translateY(-20px) scale(1.1) rotate(5deg)',
            boxShadow: '0 25px 25px -5px rgba(0, 0, 0, 0.3)'
          },
          '100%': { transform: 'translateY(0) scale(1) rotate(0deg)' }
        },
        flyToHand: {
          '0%': {
            transform: 'translateY(0) translateX(0) scale(1)',
            opacity: '1'
          },
          '75%': {
            transform: 'translateY(180px) translateX(-180px) scale(0.8)',
            opacity: '0.7'
          },
          '100%': {
            transform: 'translateY(250px) translateX(-250px) scale(0.5)',
            opacity: '0'
          }
        },
        // Modern UI animations
        fadeInUpModern: {
          '0%': {
            opacity: '0',
            transform: 'translateY(32px) scale(0.98)',
            filter: 'blur(6px)'
          },
          '60%': {
            opacity: '0.7',
            transform: 'translateY(0) scale(1.01)',
            filter: 'blur(2px)'
          },
          '80%': {
            opacity: '1',
            transform: 'translateY(-2px) scale(1.01)',
            filter: 'blur(0.5px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
            filter: 'blur(0)'
          }
        },
        // Framer-motion replacement animations
        scaleFadeIn: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.9)',
            filter: 'blur(4px)'
          },
          '60%': {
            opacity: '0.8',
            transform: 'scale(1.02)',
            filter: 'blur(1px)'
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
            filter: 'blur(0)'
          }
        },
        slideInRight: {
          '0%': {
            opacity: '0',
            transform: 'translateX(-32px) scale(0.98)',
            filter: 'blur(6px)'
          },
          '60%': {
            opacity: '0.7',
            transform: 'translateX(0) scale(1.01)',
            filter: 'blur(2px)'
          },
          '80%': {
            opacity: '1',
            transform: 'translateX(2px) scale(1.01)',
            filter: 'blur(0.5px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateX(0) scale(1)',
            filter: 'blur(0)'
          }
        },
        // Utility animations
        'pulse-slow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '0.4' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '0.9' },
          '50%': { opacity: '0.7' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'bounce-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(-10px)', opacity: '1' },
        }
      },
      animation: {
        'deal-card': 'dealCard 0.5s ease-out forwards',
        'draw-card': 'drawCard 0.5s ease-out forwards',
        'play-card': 'playCard 0.5s ease-out forwards',
        'glow': 'glowEffect 2s infinite',
        'float-in': 'floatIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'discard': 'discard 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fly-to-hand': 'flyToHand 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'fade-in-up': 'fadeInUpModern 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
        'scale-fade-in': 'scaleFadeIn 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slideInRight 0.8s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 15s linear infinite',
        'bounce-gentle': 'bounce-gentle 1.5s ease-in-out infinite',
        'float-up': 'float-up 0.4s ease-out forwards',
      }
    },
    borderColor: theme => ({
      ...theme('colors'),
    }),
    backgroundColor: theme => ({
      ...theme('colors'),
    }),
    textColor: theme => ({
      ...theme('colors'),
    }),
    ringColor: theme => ({
      ...theme('colors'),
    }),
  },
  plugins: [],
}