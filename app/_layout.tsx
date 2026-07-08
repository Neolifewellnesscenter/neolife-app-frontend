import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { WishlistProvider } from "../context/WishlistContext";
import { AppThemeProvider } from "../context/ThemeContext";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { CartProvider } from "../context/CartContext";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <CartProvider>
      <WishlistProvider>
        <AppThemeProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack initialRouteName="splash">
          <Stack.Screen name="splash" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="cart" options={{ headerShown: false }} />
          <Stack.Screen name="product-details" options={{ headerShown: false }} />
          <Stack.Screen name="doctor-profile" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal", title: "Modal" }} />
          <Stack.Screen
  name="checkout"
  options={{ headerShown: false }}
/>
<Stack.Screen name="order-success" options={{ headerShown: false }} />
<Stack.Screen name="therapy-details" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="my-orders" options={{ headerShown: false }} />
        <Stack.Screen name="terms-conditions" options={{ headerShown: false }} />
        <Stack.Screen name="medical-disclaimer" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
      </AppThemeProvider>
      </WishlistProvider>
    </CartProvider>
  );
}