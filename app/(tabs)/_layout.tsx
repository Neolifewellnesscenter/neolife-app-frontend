import { Tabs } from "expo-router";
import { Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#b9c4b9",
        tabBarInactiveTintColor: "#b9c4b9",
        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen
  name="index"
  options={{
    title: "Home",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="home-outline" size={size} color={color} />
    ),
  }}
/>

      <Tabs.Screen
  name="products"
  options={{
    title: "Products",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="bag-outline" size={size} color={color} />
    ),
  }}
/>

      <Tabs.Screen
  name="appointment"
  options={{
    title: "Appointment",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="calendar-outline" size={size} color={color} />
    ),
  }}
/>

     <Tabs.Screen
  name="therapies"
  options={{
    title: "Therapies",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="leaf-outline" size={size} color={color} />
    ),
  }}
/>

      <Tabs.Screen
  name="profile"
  options={{
    title: "Profile",
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="person-outline" size={size} color={color} />
    ),
  }}
/>
    </Tabs>
  );
}