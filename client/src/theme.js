import { createTheme, alpha } from '@mui/material/styles';

// Dynamic Color Palette Base
const paletteBase = {
    red: '#ef4444',
    green: '#22c55e',
    blue: '#3b82f6',
    violet: '#8b5cf6',
    indigo: '#6366f1',
    orange: '#f97316',
    white: '#ffffff',
    yellow: '#eab308'
};

export const getTheme = (mode = 'dark', accentColor = 'blue') => {
    const primary = paletteBase[accentColor] || paletteBase.blue;

    return createTheme({
        palette: {
            mode,
            primary: {
                main: primary,
                light: alpha(primary, 0.8),
                dark: alpha(primary, 0.9),
                contrastText: mode === 'dark' ? '#0f172a' : '#ffffff'
            },
            background: {
                default: mode === 'dark' ? '#0f172a' : '#f8fafc', // Slate 900 vs Slate 50
                paper: mode === 'dark' ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)'
            },
            text: {
                primary: mode === 'dark' ? '#f8fafc' : '#0f172a',
                secondary: mode === 'dark' ? '#94a3b8' : '#64748b'
            }
        },
        typography: {
            fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
            h4: {
                fontWeight: 800,
                letterSpacing: '-0.025em'
            },
            button: {
                textTransform: 'none',
                fontWeight: 600
            }
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                        boxShadow: mode === 'dark' ? '0 10px 30px -10px rgba(0,0,0,0.5)' : '0 10px 30px -10px rgba(0,0,0,0.1)'
                    }
                }
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 12,
                        padding: '10px 20px',
                    },
                    contained: {
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }
                    }
                }
            },
            MuiSlider: {
                styleOverrides: {
                    rail: { opacity: 0.2 },
                }
            }
        }
    });
};
