import React from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme/colors';
import { useApp } from '../context/AppContext';

// Screens
import ExplorarScreen from '../screens/ExplorarScreen';
import DetalleEventoScreen from '../screens/DetalleEventoScreen';
import MisTicketsScreen from '../screens/MisTicketsScreen';
import ChatScreen from '../screens/ChatScreen';
import CalificarScreen from '../screens/CalificarScreen';
import CrearEventoScreen from '../screens/CrearEventoScreen';
import PanelVentasScreen from '../screens/PanelVentasScreen';
import MensajesInboxScreen from '../screens/MensajesInboxScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
  const { currentUser } = useApp();
  const insets = useSafeAreaInsets();

  const isWeb = Platform.OS === 'web';
  const bottomInset = insets.bottom > 0 ? insets.bottom : Platform.OS === 'android' ? 16 : 0;
  const tabHeight = isWeb ? 84 : 64 + bottomInset;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surfaceContainerLowest,
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: isWeb ? 8 : bottomInset + 4,
          paddingTop: 10,
        },
        tabBarActiveTintColor: COLORS.tertiary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 4,
          lineHeight: 16,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingVertical: 2,
        },
        tabBarIcon: ({ focused, color, size: _size }) => {
          let iconName;

          if (route.name === 'ExplorarTab') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'TicketsTab') {
            iconName = focused ? 'ticket' : 'ticket-outline';
          } else if (route.name === 'OrganizarTab') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'MensajesTab') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          }

          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="ExplorarTab"
        component={ExplorarScreen}
        options={{ tabBarLabel: 'Explorar' }}
      />
      <Tab.Screen
        name="TicketsTab"
        component={MisTicketsScreen}
        options={{ tabBarLabel: 'Mis Tickets' }}
      />
      <Tab.Screen
        name="OrganizarTab"
        component={currentUser.rol === 'organizador' ? PanelVentasScreen : CrearEventoScreen}
        options={{ tabBarLabel: currentUser.rol === 'organizador' ? 'Panel Ventas' : 'Organizar' }}
      />
      <Tab.Screen
        name="MensajesTab"
        component={MensajesInboxScreen}
        options={{ tabBarLabel: 'Mensajes' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs" component={BottomTabs} />
        <Stack.Screen name="DetalleEvento" component={DetalleEventoScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Calificar" component={CalificarScreen} />
        <Stack.Screen name="CrearEvento" component={CrearEventoScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
