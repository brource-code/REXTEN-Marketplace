/**
 * Централизованная система тем.
 * 
 * Использование:
 * 
 * import { useTheme, ThemeProvider } from '../theme';
 * 
 * // В App.tsx:
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * 
 * // В компонентах:
 * const { theme } = useTheme();
 * <View style={{ backgroundColor: theme.background }}>
 *   <Text style={{ color: theme.text }}>Hello</Text>
 * </View>
 */

export { Theme, lightTheme, darkTheme } from './theme';
export { ThemeProvider, useTheme, ThemeMode, ThemeColors } from './ThemeContext';
