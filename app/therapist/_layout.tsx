import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function TherapistLayout() {
  return (
    <>
      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          contentStyle: {
            backgroundColor: "#F8FAF8",
          },
        }}
      >
        <Stack.Screen
          name="dashboard"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="availability"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="booking-requests"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="daily-schedule"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="attendance"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="patient-history"
          options={{
            headerShown: false,
          }}
        />

        <Stack.Screen
          name="profile"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}