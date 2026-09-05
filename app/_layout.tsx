import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { WishlistProvider } from "../context/WishlistContext";
import { AppThemeProvider } from "../context/ThemeContext";
import { CartProvider } from "../context/CartContext";

import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <CartProvider>
      <WishlistProvider>
        <AppThemeProvider>
          <ThemeProvider
            value={
              colorScheme === "dark"
                ? DarkTheme
                : DefaultTheme
            }
          >
            <Stack
              initialRouteName="splash"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="splash" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="login" />
              <Stack.Screen name="register" />

              <Stack.Screen name="(tabs)" />

              <Stack.Screen name="cart" />
              

              
              <Stack.Screen name="therapy-details" />

              <Stack.Screen name="notifications" />

              <Stack.Screen name="my-orders" />

              <Stack.Screen name="terms-conditions" />
              <Stack.Screen name="medical-disclaimer" />

              <Stack.Screen
                name="modal"
                options={{
                  presentation: "modal",
                  headerShown: false,
                }}
              />
            </Stack>

            <StatusBar style="dark" />
          </ThemeProvider>
        </AppThemeProvider>
      </WishlistProvider>
    </CartProvider>
  );
}