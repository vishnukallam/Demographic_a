import { createTheme, alpha } from '@mui/material/styles';

// Material 3 Expressive Tonal Palettes (Approximated for Prototype)
// In a real M3 setup, we would generate these from a key color source.
const tonalPalettes = {
    blue: {
        primary: '#ffffff',
        onPrimary: '#ffffff',
        primaryContainer: '#dbeafe',
        onPrimaryContainer: '#1e3a8a',
        secondary: '#64748b',
        onSecondary: '#ffffff',
        secondaryContainer: '#f1f5f9',
        onSecondaryContainer: '#0f172a',
    },
    green: {
        primary: '#22c55e',
        onPrimary: '#ffffff',
        primaryContainer: '#dcfce7',
        onPrimaryContainer: '#14532d',
        secondary: '#64748b',
        onSecondary: '#ffffff',
        secondaryContainer: '#f1f5f9',
        onSecondaryContainer: '#0f172a',
    },
    red: {
        primary: '#ef4444',
        onPrimary: '#ffffff',
        primaryContainer: '#fee2e2',
        onPrimaryContainer: '#7f1d1d',
        secondary: '#64748b',
        onSecondary: '#ffffff',
        secondaryContainer: '#f1f5f9',
        onSecondaryContainer: '#0f172a',
    },
    // Add others as needed, defaulting to Blue logic for others temporarily to save space
};

const getPaletteRaw = (color, mode) => {
    const base = tonalPalettes[color] || tonalPalettes.blue;

    if (mode === 'dark') {
        return {
            primary: {
                main: base.primary,
                light: alpha(base.primary, 0.9),
                dark: alpha(base.primary, 0.5),
                contrastText: '#0f172a', // onPrimary for dark mode usually darker
            },
            background: {
                default: '#0f172a', // Slate 900
                paper: '#1e293b',   // Slate 800 (Surface 1)
                surfaceContainer: '#1e293b',
                surfaceContainerHigh: '#334155', // Slate 700
            },
            text: {
                primary: '#f8fafc',
                secondary: '#94a3b8',
            }
        };
    } else {
        return {
            primary: {
                main: base.primary,
                contrastText: base.onPrimary,
            },
            background: {
                default: '#f8fafc', // Slate 50
                paper: '#ffffff',
                surfaceContainer: '#f1f5f9', // Slate 100
            },
            text: {
                primary: '#0f172a',
                secondary: '#475569',
            }
        };
    }
};

export const getTheme = (mode = 'dark', accentColor = 'blue') => {
    const palette = getPaletteRaw(accentColor, mode);

    return createTheme({
        palette: {
            mode,
            ...palette
        },
        shape: {
            borderRadius: 28, // Material 3 "Large" shape
        },
        typography: {
            fontFamily: '"Roboto Flex", "Inter", sans-serif',
            h4: {
                fontWeight: 800,
                letterSpacing: '-0.02em',
                lineHeight: 1.2
            },
            button: {
                textTransform: 'none',
                fontWeight: 650,
                letterSpacing: '0.01em'
            }
        },
        components: {
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        backdropFilter: 'blur(16px)',
                        borderRadius: 28, // Consistent super-ellipse feel
                        border: mode === 'dark' ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.04)',
                        boxShadow: mode === 'dark'
                            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            : '0 25px 50px -12px rgba(0, 0, 0, 0.1)',
                    }
                }
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 100, // Pill shape (M3 standard)
                        padding: '12px 24px',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    },
                    contained: {
                        boxShadow: 'none',
                        '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            transform: 'translateY(-1px)'
                        }
                    }
                }
            },
            MuiTextField: {
                styleOverrides: {
                    root: {
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 16, // Medium shape for inputs
                        }
                    }
                }
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 16,
                    }
                }
            },
            MuiSlider: {
                styleOverrides: {
                    thumb: {
                        width: 20,
                        height: 20,
                        transition: '0.3s cubic-bezier(.47,1.64,.41,.8)',
                        '&:before': {
                            boxShadow: '0 2px 12px 0 rgba(0,0,0,0.4)',
                        },
                        '&:hover, &.Mui-focusVisible': {
                            boxShadow: `0px 0px 0px 8px ${mode === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.16)'}`,
                        },
                        '&.Mui-active': {
                            width: 24,
                            height: 24,
                        },
                    },
                }
            }
        }
    });
};
